"""
Business: CAE API — управление проектами пользователя, waitlist раннего доступа,
публичные тарифы CAE-калькулятора. Авторизация через JWT (SSO_JWT_SECRET).
Args: event.queryStringParameters.action; httpMethod GET/POST/PATCH/DELETE/OPTIONS.
Returns: JSON со списком проектов, проектом, тарифами или статусом операции.
"""
import base64
import hashlib
import hmac
import json
import os
import re
import time
from datetime import datetime

import psycopg2
import psycopg2.extras


JWT_SECRET = os.environ['SSO_JWT_SECRET']

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Authorization, Authorization',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json; charset=utf-8',
}

EMAIL_RE = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
SLUG_RE = re.compile(r'[^a-z0-9-]+')


def _json_response(status: int, body: dict) -> dict:
    return {'statusCode': status, 'headers': CORS, 'body': json.dumps(body, ensure_ascii=False)}


def _b64url_decode(s: str) -> bytes:
    pad = '=' * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)


def _verify_jwt(token: str) -> dict | None:
    """Проверяет JWT, выпущенный sso-auth. Возвращает payload или None."""
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


def _client_ip(event: dict) -> str:
    ctx = event.get('requestContext') or {}
    identity = ctx.get('identity') or {}
    return (identity.get('sourceIp') or '')[:64]


def _user_agent(event: dict) -> str:
    headers = event.get('headers') or {}
    return (headers.get('User-Agent') or headers.get('user-agent') or '')[:512]


def _slugify(name: str, fallback: str) -> str:
    s = (name or '').lower().strip()
    # транслит самых частых символов
    table = str.maketrans({
        'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'i',
        'к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f',
        'х':'h','ц':'c','ч':'ch','ш':'sh','щ':'sh','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
        ' ':'-', '_':'-', '/':'-', '\\':'-', '.':'-', ',':'-',
    })
    s = s.translate(table)
    s = SLUG_RE.sub('-', s)
    s = re.sub(r'-+', '-', s).strip('-')[:48]
    return s or fallback


def _project_to_dict(row: dict) -> dict:
    return {
        'id': row['id'],
        'name': row['name'],
        'slug': row['slug'],
        'description': row['description'] or '',
        'project_type': row['project_type'],
        'units_length': row['units_length'],
        'units_force': row['units_force'],
        'is_archived': row['is_archived'],
        'current_version_id': row['current_version_id'],
        'created_at': row['created_at'].isoformat() if row['created_at'] else None,
        'updated_at': row['updated_at'].isoformat() if row['updated_at'] else None,
    }


# ============ Tariffs ============

def _action_tariffs(conn) -> dict:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT slug, name, price_monthly, price_yearly, price_one_off, "
            "max_projects, max_elements, allow_nonlinear, allow_team, max_team_members "
            "FROM cae_tariffs WHERE is_public = TRUE ORDER BY sort_order"
        )
        items = [dict(r) for r in cur.fetchall()]
    return _json_response(200, {'tariffs': items})


# ============ Waitlist ============

def _action_waitlist(conn, body: dict, user: dict | None, ua: str, ip: str) -> dict:
    email = (body.get('email') or '').strip().lower()
    full_name = (body.get('full_name') or '').strip()[:200]
    role_self = (body.get('role_self') or '').strip()[:64]
    purpose = (body.get('purpose') or '').strip()[:1000]
    referral = (body.get('referral_source') or '').strip()[:64]

    if not EMAIL_RE.match(email):
        return _json_response(400, {'error': 'invalid_email', 'message': 'Укажите корректный email.'})

    user_id = int(user['sub']) if user and user.get('sub') else None

    with conn.cursor() as cur:
        cur.execute("SELECT id FROM cae_waitlist WHERE LOWER(email) = %s", (email,))
        row = cur.fetchone()
        if row:
            # обновляем поля если уже есть
            cur.execute(
                "UPDATE cae_waitlist SET full_name = COALESCE(NULLIF(%s,''), full_name), "
                "role_self = COALESCE(NULLIF(%s,''), role_self), "
                "purpose = COALESCE(NULLIF(%s,''), purpose), "
                "user_id = COALESCE(user_id, %s) "
                "WHERE id = %s",
                (full_name, role_self, purpose, user_id, row[0]),
            )
            conn.commit()
            return _json_response(200, {'ok': True, 'already_in': True, 'message': 'Вы уже в списке раннего доступа.'})

        cur.execute(
            "INSERT INTO cae_waitlist (email, full_name, user_id, role_self, purpose, referral_source, ip, user_agent) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (email, full_name or None, user_id, role_self or None, purpose or None, referral or None, ip, ua),
        )
        wid = cur.fetchone()[0]
    conn.commit()
    return _json_response(201, {'ok': True, 'id': wid, 'message': 'Спасибо! Мы пригласим вас одними из первых.'})


# ============ Projects ============

def _action_list_projects(conn, user: dict) -> dict:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT id, name, slug, description, project_type, units_length, units_force, "
            "is_archived, current_version_id, created_at, updated_at "
            "FROM cae_projects WHERE owner_id = %s ORDER BY updated_at DESC",
            (int(user['sub']),),
        )
        items = [_project_to_dict(dict(r)) for r in cur.fetchall()]
    return _json_response(200, {'projects': items})


def _action_get_project(conn, user: dict, params: dict) -> dict:
    try:
        pid = int(params.get('id') or '0')
    except ValueError:
        return _json_response(400, {'error': 'invalid_id'})
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM cae_projects WHERE id = %s AND owner_id = %s",
            (pid, int(user['sub'])),
        )
        row = cur.fetchone()
        if not row:
            return _json_response(404, {'error': 'not_found'})
    return _json_response(200, {'project': _project_to_dict(dict(row))})


def _action_create_project(conn, user: dict, body: dict) -> dict:
    name = (body.get('name') or '').strip()[:200]
    if not name:
        return _json_response(400, {'error': 'name_required', 'message': 'Укажите название проекта.'})
    project_type = (body.get('project_type') or 'frame_3d').strip()[:32]
    description = (body.get('description') or '').strip()[:2000]
    units_length = (body.get('units_length') or 'm').strip()[:8]
    units_force = (body.get('units_force') or 'N').strip()[:8]

    base_slug = _slugify(name, f'project-{int(time.time())}')
    owner_id = int(user['sub'])

    # уникализация slug в пределах одного пользователя
    with conn.cursor() as cur:
        slug = base_slug
        idx = 2
        while True:
            cur.execute(
                "SELECT 1 FROM cae_projects WHERE owner_id = %s AND slug = %s",
                (owner_id, slug),
            )
            if not cur.fetchone():
                break
            slug = f'{base_slug}-{idx}'[:64]
            idx += 1
            if idx > 999:
                slug = f'{base_slug}-{int(time.time())}'[:64]
                break

        # квота тарифа: для базового 5, для демо 0
        cur.execute(
            "SELECT COUNT(*) FROM cae_projects WHERE owner_id = %s AND is_archived = FALSE",
            (owner_id,),
        )
        active_count = cur.fetchone()[0]
        # пока без жёсткой проверки тарифа: даём до 5 проектов всем
        if active_count >= 5:
            return _json_response(403, {
                'error': 'quota_exceeded',
                'message': 'Достигнут лимит активных проектов вашего тарифа (5). Архивируйте лишние или обновите тариф.',
            })

        cur.execute(
            "INSERT INTO cae_projects (owner_id, name, slug, description, project_type, units_length, units_force) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id, created_at, updated_at",
            (owner_id, name, slug, description or None, project_type, units_length, units_force),
        )
        pid, created_at, updated_at = cur.fetchone()

        # создаём пустую черновую версию
        cur.execute(
            "INSERT INTO cae_project_versions (project_id, version_number, model_jsonb, comment, created_by, is_draft) "
            "VALUES (%s, 1, %s, %s, %s, TRUE) RETURNING id",
            (pid, json.dumps({}), 'Initial draft', owner_id),
        )
        version_id = cur.fetchone()[0]
        cur.execute(
            "UPDATE cae_projects SET current_version_id = %s WHERE id = %s",
            (version_id, pid),
        )
    conn.commit()

    return _json_response(201, {
        'project': {
            'id': pid,
            'name': name,
            'slug': slug,
            'description': description,
            'project_type': project_type,
            'units_length': units_length,
            'units_force': units_force,
            'is_archived': False,
            'current_version_id': version_id,
            'created_at': created_at.isoformat(),
            'updated_at': updated_at.isoformat(),
        },
    })


def _action_update_project(conn, user: dict, params: dict, body: dict) -> dict:
    try:
        pid = int(params.get('id') or '0')
    except ValueError:
        return _json_response(400, {'error': 'invalid_id'})
    owner_id = int(user['sub'])

    fields = []
    values: list = []
    if 'name' in body:
        name = (body.get('name') or '').strip()[:200]
        if not name:
            return _json_response(400, {'error': 'name_required'})
        fields.append('name = %s')
        values.append(name)
    if 'description' in body:
        fields.append('description = %s')
        values.append((body.get('description') or '').strip()[:2000] or None)
    if 'is_archived' in body:
        fields.append('is_archived = %s')
        values.append(bool(body.get('is_archived')))
    if 'units_length' in body:
        fields.append('units_length = %s')
        values.append((body.get('units_length') or 'm').strip()[:8])
    if 'units_force' in body:
        fields.append('units_force = %s')
        values.append((body.get('units_force') or 'N').strip()[:8])

    if not fields:
        return _json_response(400, {'error': 'nothing_to_update'})

    fields.append('updated_at = NOW()')
    sql = f"UPDATE cae_projects SET {', '.join(fields)} WHERE id = %s AND owner_id = %s RETURNING id"
    values.extend([pid, owner_id])

    with conn.cursor() as cur:
        cur.execute(sql, tuple(values))
        row = cur.fetchone()
        if not row:
            return _json_response(404, {'error': 'not_found'})
    conn.commit()

    # возвращаем актуальный проект
    return _action_get_project(conn, user, {'id': str(pid)})


def _action_get_model(conn, user: dict, params: dict) -> dict:
    """Возвращает текущую (последнюю) модель проекта."""
    try:
        pid = int(params.get('id') or '0')
    except ValueError:
        return _json_response(400, {'error': 'invalid_id'})
    owner_id = int(user['sub'])
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT p.id, p.name, p.project_type, p.units_length, p.units_force, "
            "p.current_version_id, v.model_jsonb, v.version_number, v.created_at "
            "FROM cae_projects p LEFT JOIN cae_project_versions v ON v.id = p.current_version_id "
            "WHERE p.id = %s AND p.owner_id = %s",
            (pid, owner_id),
        )
        row = cur.fetchone()
        if not row:
            return _json_response(404, {'error': 'not_found'})
    model = row['model_jsonb'] or {}
    return _json_response(200, {
        'project': {
            'id': row['id'],
            'name': row['name'],
            'project_type': row['project_type'],
            'units_length': row['units_length'],
            'units_force': row['units_force'],
        },
        'version_id': row['current_version_id'],
        'version_number': row['version_number'],
        'model': model,
    })


def _action_save_model(conn, user: dict, params: dict, body: dict) -> dict:
    """Сохраняет новую версию модели и делает её current."""
    try:
        pid = int(params.get('id') or '0')
    except ValueError:
        return _json_response(400, {'error': 'invalid_id'})
    owner_id = int(user['sub'])
    model = body.get('model')
    if not isinstance(model, dict):
        return _json_response(400, {'error': 'model_required', 'message': 'Поле "model" обязательно.'})
    comment = (body.get('comment') or 'Auto-save').strip()[:200]

    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM cae_projects WHERE id = %s AND owner_id = %s",
            (pid, owner_id),
        )
        if not cur.fetchone():
            return _json_response(404, {'error': 'not_found'})

        cur.execute(
            "SELECT COALESCE(MAX(version_number), 0) FROM cae_project_versions WHERE project_id = %s",
            (pid,),
        )
        max_ver = cur.fetchone()[0]
        new_ver = int(max_ver) + 1

        cur.execute(
            "INSERT INTO cae_project_versions (project_id, version_number, model_jsonb, comment, created_by, is_draft) "
            "VALUES (%s, %s, %s, %s, %s, TRUE) RETURNING id, created_at",
            (pid, new_ver, json.dumps(model, ensure_ascii=False), comment, owner_id),
        )
        version_id, created_at = cur.fetchone()
        cur.execute(
            "UPDATE cae_projects SET current_version_id = %s, updated_at = NOW() WHERE id = %s",
            (version_id, pid),
        )
    conn.commit()

    return _json_response(200, {
        'ok': True,
        'version_id': version_id,
        'version_number': new_ver,
        'saved_at': created_at.isoformat(),
    })


def _action_archive_project(conn, user: dict, params: dict) -> dict:
    try:
        pid = int(params.get('id') or '0')
    except ValueError:
        return _json_response(400, {'error': 'invalid_id'})
    owner_id = int(user['sub'])
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE cae_projects SET is_archived = TRUE, updated_at = NOW() "
            "WHERE id = %s AND owner_id = %s RETURNING id",
            (pid, owner_id),
        )
        row = cur.fetchone()
        if not row:
            return _json_response(404, {'error': 'not_found'})
    conn.commit()
    return _json_response(200, {'ok': True, 'archived': True})


# ============ Handler ============

def handler(event: dict, context) -> dict:
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = (params.get('action') or '').strip()
    if not action:
        return _json_response(400, {
            'error': 'missing_action',
            'message': 'Укажите ?action=tariffs|waitlist|list-projects|get-project|create-project|update-project|archive-project',
        })

    try:
        body_raw = event.get('body') or '{}'
        if event.get('isBase64Encoded'):
            body_raw = base64.b64decode(body_raw).decode('utf-8')
        body = json.loads(body_raw) if body_raw.strip() else {}
    except Exception:
        return _json_response(400, {'error': 'invalid_json'})

    user = _auth_user(event)

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        # публичные эндпоинты (без авторизации)
        if action == 'tariffs' and method == 'GET':
            return _action_tariffs(conn)
        if action == 'waitlist' and method == 'POST':
            return _action_waitlist(conn, body, user, _user_agent(event), _client_ip(event))

        # дальше — требуется авторизация
        if not user:
            return _json_response(401, {'error': 'unauthorized', 'message': 'Требуется вход.'})

        if action == 'list-projects' and method == 'GET':
            return _action_list_projects(conn, user)
        if action == 'get-project' and method == 'GET':
            return _action_get_project(conn, user, params)
        if action == 'create-project' and method == 'POST':
            return _action_create_project(conn, user, body)
        if action == 'update-project' and method in ('POST', 'PATCH'):
            return _action_update_project(conn, user, params, body)
        if action == 'archive-project' and method in ('POST', 'DELETE'):
            return _action_archive_project(conn, user, params)
        if action == 'get-model' and method == 'GET':
            return _action_get_model(conn, user, params)
        if action == 'save-model' and method in ('POST', 'PUT'):
            return _action_save_model(conn, user, params, body)

        return _json_response(404, {'error': 'unknown_action'})
    except Exception as e:
        import traceback
        print(f'[cae-api] error type={type(e).__name__} msg={e!r}')
        print(f'[cae-api] traceback: {traceback.format_exc()}')
        return _json_response(500, {'error': 'internal_error', 'message': f'{type(e).__name__}: {e}'[:300]})
    finally:
        conn.close()