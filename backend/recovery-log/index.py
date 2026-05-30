"""
Бизнес-задача: тихо логировать в БД все случаи автоматического
восстановления страницы от "белого экрана" (битый кэш после деплоя,
runtime-ошибки, watchdog-таймаут). Нужно, чтобы мы видели реальную
частоту проблем у пользователей и могли реагировать.

Дополнительно (модуль трекинга, #29): для НАСТОЯЩИХ runtime-ошибок (не
chunk-reload после деплоя) автоматически создаёт/обновляет тикет kind='bug'
source='auto' с дедупликацией по сигнатуре ошибки+страницы. Повторные
одинаковые сбои не плодят тикеты, а увеличивают occurrence_count.

Args: event - dict с httpMethod, body (JSON: trigger_type, error_message,
              attempt, page_url, build_id, опц. user_id)
      context - объект с request_id, function_name
Returns: HTTP 204 (No Content) при успехе — фронт не ждёт ответа.
"""
import hashlib
import json
import os
import re
from typing import Any, Dict

import psycopg2


CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
}


# trigger_type'ы, которые означают реальную ошибку (а не штатный
# chunk-reload после деплоя). Только для них создаём авто-тикет.
REAL_ERROR_TRIGGERS = {'react_error', 'window_error', 'unhandled_rejection'}


def _error_signature(error_message: str, page_url: str) -> str:
    """Стабильная сигнатура ошибки для дедупликации.

    Убираем числа/хэши/урлы из текста, берём путь страницы без query —
    чтобы 100 одинаковых сбоев на одной странице склеились в один тикет.
    """
    msg = (error_message or '').strip()
    # Срезаем стек до первой строки и нормализуем переменные части.
    first_line = msg.splitlines()[0] if msg else ''
    norm = re.sub(r'https?://\S+', '', first_line)
    norm = re.sub(r'0x[0-9a-fA-F]+', '', norm)
    norm = re.sub(r'\d+', '#', norm)
    norm = norm.strip()[:200]

    path = ''
    if page_url:
        m = re.match(r'https?://[^/]+(/[^?#]*)', page_url)
        path = (m.group(1) if m else page_url)[:120]

    raw = f'{norm}|{path}'
    digest = hashlib.sha256(raw.encode('utf-8', 'ignore')).hexdigest()[:24]
    return f'auto:{digest}'


def _maybe_create_auto_ticket(conn, trigger_type, error_message, page_url, user_id):
    """Создаёт авто-тикет для реальной ошибки или инкрементит счётчик повторов."""
    if trigger_type not in REAL_ERROR_TRIGGERS:
        return
    if not error_message:
        return

    dedup = _error_signature(error_message, page_url or '')
    first_line = error_message.strip().splitlines()[0][:160] if error_message else 'Ошибка'
    title = f'Авто: {first_line}'[:200]
    body = (
        'Автоматически зафиксированный сбой у пользователя.\n\n'
        f'Тип: {trigger_type}\n'
        f'Страница: {page_url or "—"}\n\n'
        f'Сообщение:\n{(error_message or "")[:3000]}'
    )

    # Проверяем владельца user_id (если передан).
    valid_user = None
    if user_id:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM sso_users WHERE id = %s", (user_id,))
            if cur.fetchone():
                valid_user = user_id

    with conn.cursor() as cur:
        # Дедуп: если тикет с такой сигнатурой есть — увеличиваем счётчик.
        cur.execute(
            "UPDATE support_tickets SET occurrence_count = occurrence_count + 1, "
            "updated_at = now() WHERE dedup_key = %s RETURNING id",
            (dedup,),
        )
        if cur.fetchone():
            conn.commit()
            return
        # Иначе создаём новый авто-тикет.
        cur.execute(
            "INSERT INTO support_tickets "
            "(user_id, kind, title, body, self_importance, status, page_url, "
            " source, dedup_key, occurrence_count) "
            "VALUES (%s, 'bug', %s, %s, 'high', 'open', %s, 'auto', %s, 1) "
            "ON CONFLICT (dedup_key) DO UPDATE SET "
            "  occurrence_count = support_tickets.occurrence_count + 1, updated_at = now()",
            (valid_user, title, body, (page_url or None), dedup),
        )
    conn.commit()


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

    # Опциональный user_id — фронт шлёт, если пользователь авторизован.
    # Используется только для привязки авто-тикета; валидируем по sso_users.
    user_id_raw = data.get('user_id')
    try:
        user_id = int(user_id_raw) if user_id_raw else None
    except (ValueError, TypeError):
        user_id = None

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
        # Авто-тикет для реальной ошибки (с дедупликацией). Не валим лог,
        # если что-то пойдёт не так — это вторичная задача.
        try:
            _maybe_create_auto_ticket(conn, trigger_type, error_message, page_url, user_id)
        except Exception as e:
            conn.rollback()
            print(f'[recovery-log] auto-ticket skipped: {type(e).__name__} {e!r}', flush=True)
    finally:
        conn.close()

    return {
        'statusCode': 204,
        'headers': CORS_HEADERS,
        'body': '',
    }