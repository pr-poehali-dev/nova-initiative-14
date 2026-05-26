"""
Бизнес-задача: тихо логировать в БД все случаи автоматического
восстановления страницы от "белого экрана" (битый кэш после деплоя,
runtime-ошибки, watchdog-таймаут). Нужно, чтобы мы видели реальную
частоту проблем у пользователей и могли реагировать.

Args: event - dict с httpMethod, body (JSON со строками trigger_type,
              error_message, attempt, page_url, build_id)
      context - объект с request_id, function_name
Returns: HTTP 204 (No Content) при успехе — фронт не ждёт ответа.
"""
import json
import os
from typing import Any, Dict

import psycopg2


CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
}


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'method_not_allowed'}),
        }

    raw = event.get('body') or '{}'
    try:
        data = json.loads(raw)
    except Exception:
        data = {}

    trigger_type = str(data.get('trigger_type') or 'unknown')[:40]
    error_message = data.get('error_message')
    if error_message is not None:
        error_message = str(error_message)[:4000]
    try:
        attempt = int(data.get('attempt') or 1)
    except Exception:
        attempt = 1
    if attempt < 1:
        attempt = 1
    if attempt > 32767:
        attempt = 32767
    page_url = data.get('page_url')
    if page_url is not None:
        page_url = str(page_url)[:2000]
    build_id = data.get('build_id')
    if build_id is not None:
        build_id = str(build_id)[:64]

    headers = event.get('headers') or {}
    user_agent = (
        headers.get('User-Agent')
        or headers.get('user-agent')
        or ''
    )[:1000]

    ip = ''
    ctx = event.get('requestContext') or {}
    identity = ctx.get('identity') or {}
    ip = str(identity.get('sourceIp') or '')[:64]

    dsn = os.environ.get('DATABASE_URL')
    if not dsn:
        return {
            'statusCode': 500,
            'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'db_not_configured'}),
        }

    def esc(s):
        if s is None:
            return 'NULL'
        return "'" + str(s).replace("'", "''") + "'"

    sql = (
        "INSERT INTO auto_recovery_log "
        "(trigger_type, error_message, attempt, page_url, user_agent, ip, build_id) "
        f"VALUES ({esc(trigger_type)}, {esc(error_message)}, {int(attempt)}, "
        f"{esc(page_url)}, {esc(user_agent)}, {esc(ip)}, {esc(build_id)})"
    )

    conn = psycopg2.connect(dsn)
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
    finally:
        conn.close()

    return {
        'statusCode': 204,
        'headers': CORS_HEADERS,
        'body': '',
    }
