"""
Business: Уведомления пользователя (колокольчик). Читает персональные и
          broadcast-уведомления, считает непрочитанные, отмечает прочитанными.
Args: event с httpMethod (GET/POST/OPTIONS), queryStringParameters.action,
      headers['X-Authorization'] = Bearer JWT.
Returns: JSON.
"""
import base64
import hashlib
import hmac
import json
import os
import time

import psycopg2
import psycopg2.extras


JWT_SECRET = os.environ['SSO_JWT_SECRET']

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Authorization, Authorization',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json; charset=utf-8',
}


def _resp(status: int, body: dict) -> dict:
    return {'statusCode': status, 'headers': CORS, 'body': json.dumps(body, ensure_ascii=False, default=str)}


def _b64url_decode(s: str) -> bytes:
    pad = '=' * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)


def _verify_jwt(token: str):
    try:
        h_b, p_b, s_b = token.split('.')
        signing_input = f'{h_b}.{p_b}'.encode()
        expected = hmac.new(JWT_SECRET.encode(), signing_input, hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _b64url_decode(s_b)):
            return None
        payload = json.loads(_b64url_decode(p_b))
        if payload.get('exp', 0) < int(time.time()):
            return None
        return payload
    except Exception:
        return None


def _auth_user(event: dict):
    headers = event.get('headers') or {}
    auth = headers.get('X-Authorization') or headers.get('Authorization') or ''
    if not auth.startswith('Bearer '):
        return None
    return _verify_jwt(auth[7:].strip())


def _connect():
    return psycopg2.connect(os.environ['DATABASE_URL'])


# ============ ACTIONS ============

def action_list(conn, user_id: int, limit: int) -> dict:
    """Последние уведомления: персональные + broadcast, с флагом прочитанности."""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            SELECT n.id, n.type, n.title, n.body, n.link, n.ticket_id, n.created_at,
                   CASE
                     WHEN n.user_id IS NOT NULL THEN n.is_read
                     ELSE (r.notification_id IS NOT NULL)
                   END AS is_read
            FROM user_notifications n
            LEFT JOIN notification_reads r
              ON r.notification_id = n.id AND r.user_id = %s
            WHERE n.user_id = %s OR n.user_id IS NULL
            ORDER BY n.created_at DESC
            LIMIT %s
            """,
            (user_id, user_id, limit),
        )
        rows = cur.fetchall()
    items = [{
        'id': int(r['id']),
        'type': r['type'],
        'title': r['title'],
        'body': r['body'],
        'link': r['link'],
        'ticket_id': int(r['ticket_id']) if r['ticket_id'] else None,
        'is_read': bool(r['is_read']),
        'created_at': r['created_at'].isoformat() if r['created_at'] else None,
    } for r in rows]
    return _resp(200, {'notifications': items})


def action_unread_count(conn, user_id: int) -> dict:
    """Число непрочитанных (персональные не is_read + broadcast без отметки)."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT COUNT(*) FROM user_notifications n
            LEFT JOIN notification_reads r
              ON r.notification_id = n.id AND r.user_id = %s
            WHERE (n.user_id = %s OR n.user_id IS NULL)
              AND CASE
                    WHEN n.user_id IS NOT NULL THEN n.is_read = FALSE
                    ELSE r.notification_id IS NULL
                  END
            """,
            (user_id, user_id),
        )
        count = int(cur.fetchone()[0])
    return _resp(200, {'unread': count})


def action_mark_read(conn, user_id: int, notif_id: int) -> dict:
    """Отметить одно уведомление прочитанным (персональное или broadcast)."""
    with conn.cursor() as cur:
        cur.execute("SELECT user_id FROM user_notifications WHERE id = %s", (notif_id,))
        row = cur.fetchone()
        if not row:
            return _resp(404, {'error': 'not_found'})
        owner = row[0]
        if owner is None:
            cur.execute(
                "INSERT INTO notification_reads (user_id, notification_id) "
                "VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (user_id, notif_id),
            )
        else:
            if int(owner) != user_id:
                return _resp(403, {'error': 'forbidden'})
            cur.execute(
                "UPDATE user_notifications SET is_read = TRUE, read_at = now() WHERE id = %s",
                (notif_id,),
            )
    conn.commit()
    return _resp(200, {'ok': True})


def action_mark_all_read(conn, user_id: int) -> dict:
    """Отметить все прочитанными: персональные + broadcast."""
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE user_notifications SET is_read = TRUE, read_at = now() "
            "WHERE user_id = %s AND is_read = FALSE",
            (user_id,),
        )
        cur.execute(
            """
            INSERT INTO notification_reads (user_id, notification_id)
            SELECT %s, n.id FROM user_notifications n
            LEFT JOIN notification_reads r
              ON r.notification_id = n.id AND r.user_id = %s
            WHERE n.user_id IS NULL AND r.notification_id IS NULL
            ON CONFLICT DO NOTHING
            """,
            (user_id, user_id),
        )
    conn.commit()
    return _resp(200, {'ok': True})


def _is_admin(conn, user_id: int) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT is_admin FROM sso_users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        return bool(row and row[0])


def action_changelog_list(conn, limit: int) -> dict:
    """Публичный журнал версий CAE (для страницы /cae/changelog)."""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT id, version, title, category, body, released_at "
            "FROM cae_changelog WHERE is_published = TRUE "
            "ORDER BY released_at DESC, id DESC LIMIT %s",
            (limit,),
        )
        rows = cur.fetchall()
    return _resp(200, {'changelog': [{
        'id': int(r['id']),
        'version': r['version'],
        'title': r['title'],
        'category': r['category'],
        'body': r['body'],
        'released_at': r['released_at'].isoformat() if r['released_at'] else None,
    } for r in rows]})


def action_changelog_create(conn, body: dict) -> dict:
    """Админ добавляет запись в журнал версий + broadcast-уведомление всем."""
    version = (body.get('version') or '').strip()[:20]
    title = (body.get('title') or '').strip()[:200]
    category = (body.get('category') or 'feature').strip()
    text = (body.get('body') or '').strip()
    notify = bool(body.get('notify', True))
    if category not in ('feature', 'fix', 'improvement', 'breaking'):
        category = 'feature'
    if not version or not title:
        return _resp(400, {'error': 'missing_fields', 'message': 'Нужны version и title'})

    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO cae_changelog (version, title, category, body) "
            "VALUES (%s, %s, %s, %s) RETURNING id",
            (version, title, category, text or None),
        )
        cid = int(cur.fetchone()[0])
        if notify:
            cur.execute(
                "INSERT INTO user_notifications (user_id, type, title, body, link) "
                "VALUES (NULL, 'update', %s, %s, '/cae/changelog')",
                (f'CAE {version}: {title}'[:200], (text or title)[:500]),
            )
    conn.commit()
    return _resp(200, {'ok': True, 'id': cid})


def handler(event: dict, context) -> dict:
    """Точка входа: маршрутизация по action."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = (params.get('action') or '').strip()

    # Публичный action — журнал версий доступен без авторизации.
    if action == 'changelog-list':
        conn = _connect()
        try:
            try:
                limit = min(int(params.get('limit') or 50), 200)
            except ValueError:
                limit = 50
            return action_changelog_list(conn, limit)
        finally:
            conn.close()

    user = _auth_user(event)
    if not user:
        return _resp(401, {'error': 'unauthorized', 'message': 'Требуется вход'})
    user_id = int(user['sub'])

    conn = _connect()
    try:
        if action == 'list':
            try:
                limit = min(int(params.get('limit') or 30), 100)
            except ValueError:
                limit = 30
            return action_list(conn, user_id, limit)
        if action == 'unread-count':
            return action_unread_count(conn, user_id)
        if action == 'mark-read' and method == 'POST':
            body = json.loads(event.get('body') or '{}')
            nid = body.get('id')
            if not nid:
                return _resp(400, {'error': 'missing_id'})
            return action_mark_read(conn, user_id, int(nid))
        if action == 'mark-all-read' and method == 'POST':
            return action_mark_all_read(conn, user_id)
        if action == 'changelog-create' and method == 'POST':
            if not _is_admin(conn, user_id):
                return _resp(403, {'error': 'forbidden', 'message': 'Только администратор'})
            body = json.loads(event.get('body') or '{}')
            return action_changelog_create(conn, body)
        return _resp(400, {'error': 'unknown_action'})
    finally:
        conn.close()