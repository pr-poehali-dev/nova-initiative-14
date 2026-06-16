"""
Business: Хранилище НИР (научно-исследовательских работ) владельца. Доступ
          только для роли владелец (is_owner). Поддерживает список работ,
          чтение, создание, сохранение (с авто-версионированием) и просмотр
          истории версий.
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

ALLOWED_STATUS = {'draft', 'active', 'archived'}


def _json_response(status: int, body: dict) -> dict:
    return {'statusCode': status, 'headers': CORS, 'body': json.dumps(body, ensure_ascii=False, default=str)}


def _b64url_decode(s: str) -> bytes:
    pad = '=' * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)


def _verify_jwt(token: str):
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


def _auth_user(event: dict):
    headers = event.get('headers') or {}
    auth = headers.get('X-Authorization') or headers.get('Authorization') or ''
    if not auth.startswith('Bearer '):
        return None
    return _verify_jwt(auth[7:].strip())


def _is_owner(conn, user_id: int) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT is_owner FROM sso_users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        return bool(row and row[0])


def _paper_row(r: dict) -> dict:
    return {
        'id': int(r['id']),
        'title': r.get('title'),
        'content': r.get('content', ''),
        'status': r.get('status'),
        'created_at': r['created_at'].isoformat() if r.get('created_at') else None,
        'updated_at': r['updated_at'].isoformat() if r.get('updated_at') else None,
    }


# ============ ACTIONS ============

def action_list(conn, owner_id: int) -> dict:
    """Список работ владельца (без полного текста — только мета)."""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT p.id, p.title, p.status, p.created_at, p.updated_at, "
            "  (SELECT COUNT(*) FROM owner_research_versions v WHERE v.paper_id = p.id) AS versions, "
            "  LENGTH(p.content) AS chars "
            "FROM owner_research_papers p "
            "WHERE p.owner_id = %s ORDER BY p.updated_at DESC LIMIT 200",
            (owner_id,),
        )
        rows = cur.fetchall()
    papers = []
    for r in rows:
        papers.append({
            'id': int(r['id']),
            'title': r['title'],
            'status': r['status'],
            'versions': int(r['versions'] or 0),
            'chars': int(r['chars'] or 0),
            'created_at': r['created_at'].isoformat() if r['created_at'] else None,
            'updated_at': r['updated_at'].isoformat() if r['updated_at'] else None,
        })
    return _json_response(200, {'papers': papers})


def action_get(conn, owner_id: int, params: dict) -> dict:
    """Одна работа с полным текстом."""
    paper_id = params.get('id')
    if not paper_id:
        return _json_response(400, {'error': 'missing_id'})
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM owner_research_papers WHERE id = %s AND owner_id = %s",
            (int(paper_id), owner_id),
        )
        row = cur.fetchone()
    if not row:
        return _json_response(404, {'error': 'not_found'})
    return _json_response(200, {'paper': _paper_row(dict(row))})


def action_create(conn, owner_id: int, body: dict) -> dict:
    """Создаёт новую (пустую) работу."""
    title = (body.get('title') or 'Новая НИР').strip()[:300]
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO owner_research_papers (owner_id, title, content, status) "
            "VALUES (%s, %s, '', 'draft') RETURNING id",
            (owner_id, title),
        )
        paper_id = int(cur.fetchone()[0])
    conn.commit()
    return _json_response(200, {'ok': True, 'id': paper_id})


def action_save(conn, owner_id: int, body: dict) -> dict:
    """Сохраняет работу и создаёт новую версию (история не теряется)."""
    paper_id = body.get('id')
    if not paper_id:
        return _json_response(400, {'error': 'missing_id'})
    title = (body.get('title') or 'Без названия').strip()[:300]
    content = body.get('content') or ''
    status = (body.get('status') or 'draft').strip()
    note = (body.get('note') or '').strip()[:300]
    if status not in ALLOWED_STATUS:
        status = 'draft'

    with conn.cursor() as cur:
        # Проверяем владение записью.
        cur.execute(
            "SELECT id FROM owner_research_papers WHERE id = %s AND owner_id = %s",
            (int(paper_id), owner_id),
        )
        if not cur.fetchone():
            return _json_response(404, {'error': 'not_found'})

        # Обновляем основную запись.
        cur.execute(
            "UPDATE owner_research_papers "
            "SET title = %s, content = %s, status = %s, updated_at = now() "
            "WHERE id = %s AND owner_id = %s",
            (title, content, status, int(paper_id), owner_id),
        )
        # Следующий номер версии.
        cur.execute(
            "SELECT COALESCE(MAX(version_no), 0) + 1 FROM owner_research_versions "
            "WHERE paper_id = %s",
            (int(paper_id),),
        )
        version_no = int(cur.fetchone()[0])
        cur.execute(
            "INSERT INTO owner_research_versions "
            "(paper_id, version_no, title, content, note) "
            "VALUES (%s, %s, %s, %s, %s)",
            (int(paper_id), version_no, title, content, note or None),
        )
    conn.commit()
    return _json_response(200, {'ok': True, 'version_no': version_no})


def action_versions(conn, owner_id: int, params: dict) -> dict:
    """История версий работы (мета без полного текста)."""
    paper_id = params.get('id')
    if not paper_id:
        return _json_response(400, {'error': 'missing_id'})
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM owner_research_papers WHERE id = %s AND owner_id = %s",
            (int(paper_id), owner_id),
        )
        if not cur.fetchone():
            return _json_response(404, {'error': 'not_found'})
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT id, version_no, title, note, LENGTH(content) AS chars, created_at "
            "FROM owner_research_versions WHERE paper_id = %s "
            "ORDER BY version_no DESC LIMIT 200",
            (int(paper_id),),
        )
        rows = cur.fetchall()
    versions = [{
        'id': int(r['id']),
        'version_no': int(r['version_no']),
        'title': r['title'],
        'note': r['note'],
        'chars': int(r['chars'] or 0),
        'created_at': r['created_at'].isoformat() if r['created_at'] else None,
    } for r in rows]
    return _json_response(200, {'versions': versions})


def action_version_content(conn, owner_id: int, params: dict) -> dict:
    """Полный текст конкретной версии (для восстановления/просмотра)."""
    version_id = params.get('version_id')
    if not version_id:
        return _json_response(400, {'error': 'missing_version_id'})
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT v.title, v.content, v.version_no FROM owner_research_versions v "
            "JOIN owner_research_papers p ON p.id = v.paper_id "
            "WHERE v.id = %s AND p.owner_id = %s",
            (int(version_id), owner_id),
        )
        row = cur.fetchone()
    if not row:
        return _json_response(404, {'error': 'not_found'})
    return _json_response(200, {
        'title': row['title'],
        'content': row['content'],
        'version_no': int(row['version_no']),
    })


def handler(event: dict, context) -> dict:
    """Маршрутизатор research-api по ?action= и httpMethod."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = (params.get('action') or '').strip()
    if not action:
        return _json_response(400, {'error': 'missing_action'})

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
        if not user:
            return _json_response(401, {'error': 'unauthorized'})
        owner_id = int(user['sub'])
        if not _is_owner(conn, owner_id):
            return _json_response(403, {'error': 'forbidden', 'message': 'Только для владельца'})

        if action == 'list' and method == 'GET':
            return action_list(conn, owner_id)
        if action == 'get' and method == 'GET':
            return action_get(conn, owner_id, params)
        if action == 'versions' and method == 'GET':
            return action_versions(conn, owner_id, params)
        if action == 'version-content' and method == 'GET':
            return action_version_content(conn, owner_id, params)
        if action == 'create' and method == 'POST':
            return action_create(conn, owner_id, body)
        if action == 'save' and method == 'POST':
            return action_save(conn, owner_id, body)

        return _json_response(404, {'error': 'unknown_action'})
    except Exception as e:
        import traceback
        print(f'[research-api] error: {e!r}\n{traceback.format_exc()}')
        return _json_response(500, {'error': 'internal_error', 'message': f'{type(e).__name__}: {e}'[:300]})
    finally:
        conn.close()
