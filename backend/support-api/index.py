"""
Business: Тикеты техподдержки. Юзер создаёт обращение с самооценкой важности,
          администратор (is_admin) модерирует, начисляет баллы и закрывает тикет.
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

ALLOWED_KINDS = {'bug', 'feature', 'question', 'other'}
ALLOWED_IMPORTANCE = {'low', 'normal', 'high', 'critical'}
ALLOWED_STATUS = {'open', 'in_progress', 'resolved', 'rejected', 'duplicate'}


def _json_response(status: int, body: dict) -> dict:
    return {'statusCode': status, 'headers': CORS, 'body': json.dumps(body, ensure_ascii=False, default=str)}


def _b64url_decode(s: str) -> bytes:
    pad = '=' * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)


def _verify_jwt(token: str) -> dict | None:
    try:
        h_b, p_b, s_b = token.split('.')
        signing_input = f'{h_b}.{p_b}'.encode()
        expected = hmac.new(JWT_SECRET.encode(), signing_input, hashlib.sha256).digest()
        actual = _b64url_decode(s_b)
        if not hmac.compare_digest(expected, actual):
            return None
        payload = json.loads(_b64url_decode(p_b))
        if payload.get('exp', 0) < int(time.time()):
            return None
        return payload
    except Exception:
        return None


def _auth_user(event: dict) -> dict | None:
    headers = event.get('headers') or {}
    auth = headers.get('X-Authorization') or headers.get('Authorization') or ''
    if not auth.startswith('Bearer '):
        return None
    return _verify_jwt(auth[7:].strip())


def _is_admin(conn, user_id: int) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT is_admin FROM sso_users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        return bool(row and row[0])


def _add_points(conn, user_id: int, points: int, reason: str,
                ticket_id: int | None = None, note: str | None = None,
                dedup_key: str | None = None) -> bool:
    if points == 0:
        return False
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO user_points (user_id, total_points) VALUES (%s, 0) "
            "ON CONFLICT (user_id) DO NOTHING",
            (user_id,),
        )
        try:
            cur.execute(
                "INSERT INTO user_points_log "
                "(user_id, points, reason, ticket_id, note, dedup_key) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                (user_id, points, reason, ticket_id, note, dedup_key),
            )
        except psycopg2.IntegrityError:
            conn.rollback()
            return False
        cur.execute(
            "UPDATE user_points SET total_points = total_points + %s, updated_at = now() "
            "WHERE user_id = %s",
            (points, user_id),
        )
    conn.commit()
    return True


def _ticket_to_dict(row: dict) -> dict:
    return {
        'id': int(row['id']),
        'user_id': row.get('user_id'),
        'email': row.get('email'),
        'kind': row.get('kind'),
        'title': row.get('title'),
        'body': row.get('body'),
        'self_importance': row.get('self_importance'),
        'status': row.get('status'),
        'page_url': row.get('page_url'),
        'awarded_points': int(row.get('awarded_points') or 0),
        'admin_note': row.get('admin_note'),
        'assigned_admin_id': row.get('assigned_admin_id'),
        'resolved_at': row['resolved_at'].isoformat() if row.get('resolved_at') else None,
        'created_at': row['created_at'].isoformat() if row.get('created_at') else None,
        'updated_at': row['updated_at'].isoformat() if row.get('updated_at') else None,
    }


# ============ ACTIONS ============

def action_create_ticket(conn, user: dict | None, body: dict) -> dict:
    """Создаёт обращение. Авторизация необязательна, но желательна."""
    title = (body.get('title') or '').strip()[:200]
    text = (body.get('body') or '').strip()
    kind = (body.get('kind') or 'other').strip()
    importance = (body.get('self_importance') or 'normal').strip()
    page_url = (body.get('page_url') or '').strip()[:1000]
    email = (body.get('email') or '').strip().lower()[:255]

    if not title:
        return _json_response(400, {'error': 'missing_title', 'message': 'Укажите заголовок'})
    if not text or len(text) < 5:
        return _json_response(400, {'error': 'missing_body', 'message': 'Опишите проблему подробнее'})
    if kind not in ALLOWED_KINDS:
        kind = 'other'
    if importance not in ALLOWED_IMPORTANCE:
        importance = 'normal'

    user_id = int(user['sub']) if user else None
    if not user_id and not email:
        return _json_response(400, {'error': 'missing_email',
                                    'message': 'Укажите email для обратной связи'})

    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO support_tickets "
            "(user_id, email, kind, title, body, self_importance, page_url) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (user_id, email or None, kind, title, text, importance, page_url or None),
        )
        ticket_id = int(cur.fetchone()[0])
    conn.commit()

    return _json_response(200, {'ok': True, 'ticket_id': ticket_id})


def action_list_my_tickets(conn, user: dict) -> dict:
    """Тикеты текущего юзера."""
    user_id = int(user['sub'])
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT id, kind, title, self_importance, status, awarded_points, "
            "admin_note, created_at, resolved_at "
            "FROM support_tickets WHERE user_id = %s "
            "ORDER BY created_at DESC LIMIT 100",
            (user_id,),
        )
        rows = cur.fetchall()
    return _json_response(200, {
        'tickets': [
            {
                'id': int(r['id']),
                'kind': r['kind'],
                'title': r['title'],
                'self_importance': r['self_importance'],
                'status': r['status'],
                'awarded_points': int(r['awarded_points'] or 0),
                'admin_note': r['admin_note'],
                'created_at': r['created_at'].isoformat() if r['created_at'] else None,
                'resolved_at': r['resolved_at'].isoformat() if r['resolved_at'] else None,
            }
            for r in rows
        ]
    })


def action_admin_list_tickets(conn, params: dict) -> dict:
    """Все тикеты — для админа. Фильтр по status (опц.)."""
    status = (params.get('status') or '').strip()
    sql = (
        "SELECT t.*, u.email AS user_email, u.full_name AS user_full_name "
        "FROM support_tickets t "
        "LEFT JOIN sso_users u ON u.id = t.user_id "
    )
    where = ''
    args: tuple = ()
    if status and status in ALLOWED_STATUS:
        where = "WHERE t.status = %s "
        args = (status,)
    sql += where + "ORDER BY t.created_at DESC LIMIT 200"

    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(sql, args)
        rows = cur.fetchall()

    tickets = []
    for r in rows:
        d = _ticket_to_dict(dict(r))
        d['user_email'] = r.get('user_email')
        d['user_full_name'] = r.get('user_full_name')
        tickets.append(d)
    return _json_response(200, {'tickets': tickets})


def action_admin_update_ticket(conn, admin_user: dict, body: dict) -> dict:
    """Админ обновляет тикет: статус, заметка, начисление баллов автору."""
    ticket_id = body.get('ticket_id')
    if not ticket_id:
        return _json_response(400, {'error': 'missing_ticket_id'})

    new_status = (body.get('status') or '').strip()
    admin_note = (body.get('admin_note') or '').strip()
    award_points = int(body.get('award_points') or 0)

    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT id, user_id, awarded_points, status FROM support_tickets WHERE id = %s",
            (int(ticket_id),),
        )
        ticket = cur.fetchone()
        if not ticket:
            return _json_response(404, {'error': 'ticket_not_found'})

    admin_id = int(admin_user['sub'])
    updates: list[str] = []
    args: list = []

    if new_status and new_status in ALLOWED_STATUS:
        updates.append("status = %s")
        args.append(new_status)
        if new_status in ('resolved', 'rejected', 'duplicate'):
            updates.append("resolved_at = now()")

    if admin_note:
        updates.append("admin_note = %s")
        args.append(admin_note)

    updates.append("assigned_admin_id = %s")
    args.append(admin_id)
    updates.append("updated_at = now()")

    if updates:
        args.append(int(ticket_id))
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE support_tickets SET {', '.join(updates)} WHERE id = %s",
                tuple(args),
            )
        conn.commit()

    # Начисление баллов автору (если задано и тикет не самообращение от админа)
    if award_points > 0 and ticket['user_id']:
        new_total = int(ticket['awarded_points'] or 0) + award_points
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE support_tickets SET awarded_points = %s WHERE id = %s",
                (new_total, int(ticket_id)),
            )
        conn.commit()
        _add_points(
            conn, int(ticket['user_id']), award_points,
            'support_ticket_resolved', ticket_id=int(ticket_id),
            note=f'Тикет #{ticket_id}',
            dedup_key=f'ticket_award:{ticket_id}:{int(time.time())}',
        )
        # Выдаём ачивку «Полезная заявка» (без очков, для коллекции)
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO user_achievements (user_id, achievement_code) "
                "VALUES (%s, 'helpful_ticket') ON CONFLICT (user_id, achievement_code) DO NOTHING",
                (int(ticket['user_id']),),
            )
        conn.commit()

    return _json_response(200, {'ok': True})


def handler(event: dict, context) -> dict:
    """Маршрутизатор support-api по ?action= и httpMethod."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = (params.get('action') or '').strip()
    if not action:
        return _json_response(400, {
            'error': 'missing_action',
            'message': 'Укажите ?action=create-ticket|my-tickets|admin-list|admin-update',
        })

    try:
        body_raw = event.get('body') or '{}'
        if event.get('isBase64Encoded'):
            body_raw = base64.b64decode(body_raw).decode('utf-8')
        body = json.loads(body_raw) if body_raw.strip() else {}
    except Exception:
        return _json_response(400, {'error': 'invalid_json'})

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        user = _auth_user(event)

        if action == 'create-ticket' and method == 'POST':
            return action_create_ticket(conn, user, body)

        if not user:
            return _json_response(401, {'error': 'unauthorized'})

        if action == 'my-tickets' and method == 'GET':
            return action_list_my_tickets(conn, user)

        # Админ-actions
        if action in ('admin-list', 'admin-update'):
            if not _is_admin(conn, int(user['sub'])):
                return _json_response(403, {'error': 'forbidden', 'message': 'Только администратор'})
            if action == 'admin-list' and method == 'GET':
                return action_admin_list_tickets(conn, params)
            if action == 'admin-update' and method == 'POST':
                return action_admin_update_ticket(conn, user, body)

        return _json_response(404, {'error': 'unknown_action'})
    except Exception as e:
        import traceback
        print(f'[support-api] error: {e!r}\n{traceback.format_exc()}')
        return _json_response(500, {'error': 'internal_error', 'message': f'{type(e).__name__}: {e}'[:300]})
    finally:
        conn.close()
