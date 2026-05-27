"""
CRUD проектов CAE и работа с версиями модели.

Эндпоинты:
  - list-projects     GET    — список проектов пользователя
  - get-project       GET    — один проект по id
  - create-project    POST   — создание проекта + первой пустой draft-версии
  - update-project    PATCH  — частичное обновление (name, description, …)
  - archive-project   DELETE — мягкое удаление (is_archived = TRUE)
  - get-model         GET    — текущая модель из current_version_id
  - save-model        POST   — новая версия модели + перевод в current

Все эндпоинты требуют авторизации и проверяют owner_id = user.sub.
"""
import json
import time

import psycopg2.extras

from auth import json_response
from utils import project_to_dict, slugify


# Квота активных проектов на пользователя.
# На время альфа-тестирования квота поднята до 1000 — все пользователи считаются альфа-тестерами,
# подписка не проверяется, расчёты бесплатны.
DEFAULT_PROJECT_QUOTA = 1000


def action_list_projects(conn, user: dict) -> dict:
    """GET — все непустые проекты пользователя, упорядоченные по updated_at DESC."""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT id, name, slug, description, project_type, units_length, units_force, "
            "is_archived, current_version_id, created_at, updated_at "
            "FROM cae_projects WHERE owner_id = %s ORDER BY updated_at DESC",
            (int(user['sub']),),
        )
        items = [project_to_dict(dict(r)) for r in cur.fetchall()]
    return json_response(200, {'projects': items})


def action_get_project(conn, user: dict, params: dict) -> dict:
    """GET — один проект по ?id=. 404 если чужой или не существует."""
    try:
        pid = int(params.get('id') or '0')
    except ValueError:
        return json_response(400, {'error': 'invalid_id'})
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM cae_projects WHERE id = %s AND owner_id = %s",
            (pid, int(user['sub'])),
        )
        row = cur.fetchone()
        if not row:
            return json_response(404, {'error': 'not_found'})
    return json_response(200, {'project': project_to_dict(dict(row))})


def _unique_slug(cur, owner_id: int, base_slug: str) -> str:
    """Подбирает уникальный slug в пределах одного пользователя добавлением -2, -3, …"""
    slug = base_slug
    idx = 2
    while True:
        cur.execute(
            "SELECT 1 FROM cae_projects WHERE owner_id = %s AND slug = %s",
            (owner_id, slug),
        )
        if not cur.fetchone():
            return slug
        slug = f'{base_slug}-{idx}'[:64]
        idx += 1
        if idx > 999:
            # последний шанс — суффикс с unix timestamp
            return f'{base_slug}-{int(time.time())}'[:64]


def action_create_project(conn, user: dict, body: dict) -> dict:
    """POST — создаёт проект + первую пустую draft-версию, делает её current."""
    name = (body.get('name') or '').strip()[:200]
    if not name:
        return json_response(400, {'error': 'name_required', 'message': 'Укажите название проекта.'})
    project_type = (body.get('project_type') or 'frame_3d').strip()[:32]
    description = (body.get('description') or '').strip()[:2000]
    units_length = (body.get('units_length') or 'm').strip()[:8]
    units_force = (body.get('units_force') or 'N').strip()[:8]

    base_slug = slugify(name, f'project-{int(time.time())}')
    owner_id = int(user['sub'])

    with conn.cursor() as cur:
        slug = _unique_slug(cur, owner_id, base_slug)

        # Квота: не больше DEFAULT_PROJECT_QUOTA активных проектов.
        cur.execute(
            "SELECT COUNT(*) FROM cae_projects WHERE owner_id = %s AND is_archived = FALSE",
            (owner_id,),
        )
        active_count = cur.fetchone()[0]
        if active_count >= DEFAULT_PROJECT_QUOTA:
            return json_response(403, {
                'error': 'quota_exceeded',
                'message': (
                    f'Достигнут лимит активных проектов вашего тарифа ({DEFAULT_PROJECT_QUOTA}). '
                    'Архивируйте лишние или обновите тариф.'
                ),
            })

        cur.execute(
            "INSERT INTO cae_projects (owner_id, name, slug, description, project_type, units_length, units_force) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id, created_at, updated_at",
            (owner_id, name, slug, description or None, project_type, units_length, units_force),
        )
        pid, created_at, updated_at = cur.fetchone()

        # Пустая черновая версия. version_number = 1.
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

    return json_response(201, {
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


def action_update_project(conn, user: dict, params: dict, body: dict) -> dict:
    """PATCH — частичное обновление полей проекта. Игнорирует поля не из whitelist."""
    try:
        pid = int(params.get('id') or '0')
    except ValueError:
        return json_response(400, {'error': 'invalid_id'})
    owner_id = int(user['sub'])

    fields = []
    values: list = []
    if 'name' in body:
        name = (body.get('name') or '').strip()[:200]
        if not name:
            return json_response(400, {'error': 'name_required'})
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
        return json_response(400, {'error': 'nothing_to_update'})

    fields.append('updated_at = NOW()')
    sql = f"UPDATE cae_projects SET {', '.join(fields)} WHERE id = %s AND owner_id = %s RETURNING id"
    values.extend([pid, owner_id])

    with conn.cursor() as cur:
        cur.execute(sql, tuple(values))
        row = cur.fetchone()
        if not row:
            return json_response(404, {'error': 'not_found'})
    conn.commit()

    # Возвращаем актуальный проект (включая обновлённые поля).
    return action_get_project(conn, user, {'id': str(pid)})


def action_archive_project(conn, user: dict, params: dict) -> dict:
    """DELETE — мягкое архивирование. Запись не удаляется физически."""
    try:
        pid = int(params.get('id') or '0')
    except ValueError:
        return json_response(400, {'error': 'invalid_id'})
    owner_id = int(user['sub'])
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE cae_projects SET is_archived = TRUE, updated_at = NOW() "
            "WHERE id = %s AND owner_id = %s RETURNING id",
            (pid, owner_id),
        )
        row = cur.fetchone()
        if not row:
            return json_response(404, {'error': 'not_found'})
    conn.commit()
    return json_response(200, {'ok': True, 'archived': True})


def action_get_model(conn, user: dict, params: dict) -> dict:
    """GET — возвращает текущую (current_version_id) модель проекта."""
    try:
        pid = int(params.get('id') or '0')
    except ValueError:
        return json_response(400, {'error': 'invalid_id'})
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
            return json_response(404, {'error': 'not_found'})
    model = row['model_jsonb'] or {}
    return json_response(200, {
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


def action_save_model(conn, user: dict, params: dict, body: dict) -> dict:
    """POST — сохраняет новую версию модели (version_number = MAX+1) и делает её current."""
    try:
        pid = int(params.get('id') or '0')
    except ValueError:
        return json_response(400, {'error': 'invalid_id'})
    owner_id = int(user['sub'])
    model = body.get('model')
    if not isinstance(model, dict):
        return json_response(400, {'error': 'model_required', 'message': 'Поле "model" обязательно.'})
    comment = (body.get('comment') or 'Auto-save').strip()[:200]

    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM cae_projects WHERE id = %s AND owner_id = %s",
            (pid, owner_id),
        )
        if not cur.fetchone():
            return json_response(404, {'error': 'not_found'})

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

    return json_response(200, {
        'ok': True,
        'version_id': version_id,
        'version_number': new_ver,
        'saved_at': created_at.isoformat(),
    })