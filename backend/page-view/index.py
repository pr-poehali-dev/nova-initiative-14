import json
import os
from datetime import datetime, timezone

import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
}

# Пути, которые не считаем «контентными» страницами/постами.
SKIP_PREFIXES = (
    '/login', '/register', '/account', '/verify-email', '/forgot-password',
    '/reset-password', '/oauth', '/admin',
)


def _is_trackable(path: str) -> bool:
    if not path:
        return False
    for p in SKIP_PREFIXES:
        if path == p or path.startswith(p + '/'):
            return False
    return True


def _record_view(body: dict) -> bool:
    """Пишет один просмотр страницы в page_views."""
    dsn = os.environ.get('DATABASE_URL')
    if not dsn:
        return False

    path = (body.get('path') or '')[:255]
    if not _is_trackable(path):
        return False

    page_title = (body.get('pageTitle') or '')[:200] or None
    visitor_id = (body.get('visitorId') or '')[:80]
    if not visitor_id:
        return False
    source_type = (body.get('sourceType') or '')[:24] or None
    device = (body.get('device') or '')[:24] or None

    conn = psycopg2.connect(dsn)
    try:
        with conn.cursor() as cur:
            cur.execute(
                'INSERT INTO page_views '
                '(path, page_title, visitor_id, source_type, device) '
                'VALUES (%s,%s,%s,%s,%s)',
                (path, page_title, visitor_id, source_type, device),
            )
        conn.commit()
    finally:
        conn.close()
    return True


def _get_count(path: str) -> dict:
    """Возвращает публичные счётчики просмотров по пути:
    unique — уникальных визитёров, total — всего просмотров."""
    dsn = os.environ.get('DATABASE_URL')
    if not dsn:
        return {'path': path, 'unique': 0, 'total': 0}
    conn = psycopg2.connect(dsn)
    try:
        with conn.cursor() as cur:
            cur.execute(
                'SELECT COUNT(DISTINCT visitor_id) AS u, COUNT(*) AS t '
                'FROM page_views WHERE path = %s',
                (path[:255],),
            )
            row = cur.fetchone()
    finally:
        conn.close()
    return {'path': path, 'unique': int(row[0] or 0), 'total': int(row[1] or 0)}


def handler(event: dict, context) -> dict:
    """Учёт посещений отдельных страниц и постов.
    POST — записать просмотр страницы (path + visitorId);
    GET ?path=/blog/slug — публичный счётчик (уникальные + всего просмотров)."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    if method == 'GET':
        params = event.get('queryStringParameters') or {}
        path = params.get('path') or ''
        data = _get_count(path)
        return {
            'statusCode': 200,
            'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps(data),
        }

    body = json.loads(event.get('body', '{}') or '{}')
    saved = False
    try:
        saved = _record_view(body)
    except Exception as e:
        print(f'[page-view] DB error: {e}')

    return {
        'statusCode': 200,
        'headers': {**CORS, 'Content-Type': 'application/json'},
        'body': json.dumps({'ok': True, 'saved': saved, 'ts': datetime.now(timezone.utc).isoformat()}),
    }
