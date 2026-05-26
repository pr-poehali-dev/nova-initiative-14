"""
Business: CAE API — управление проектами пользователя, waitlist раннего доступа,
публичные тарифы CAE-калькулятора. Авторизация через JWT (SSO_JWT_SECRET).
Args: event.queryStringParameters.action; httpMethod GET/POST/PATCH/DELETE/OPTIONS.
Returns: JSON со списком проектов, проектом, тарифами или статусом операции.

Декомпозиция:
  - auth.py      — JWT, CORS, json_response, auth_user
  - utils.py     — slugify, project_to_dict, client_ip, user_agent, EMAIL_RE
  - tariffs.py   — публичный список тарифов (action=tariffs)
  - waitlist.py  — запись в waitlist (action=waitlist)
  - projects.py  — CRUD проектов + версии модели (list/get/create/update/archive
                   /get-model/save-model)
"""
import base64
import json
import os

import psycopg2

from auth import CORS, auth_user, json_response
from utils import client_ip, user_agent
from tariffs import action_tariffs
from waitlist import action_waitlist
from projects import (
    action_archive_project,
    action_create_project,
    action_get_model,
    action_get_project,
    action_list_projects,
    action_save_model,
    action_update_project,
)


def handler(event: dict, context) -> dict:
    """Маршрутизатор по ?action= и httpMethod. Открывает/закрывает соединение с БД."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = (params.get('action') or '').strip()
    if not action:
        return json_response(400, {
            'error': 'missing_action',
            'message': (
                'Укажите ?action=tariffs|waitlist|list-projects|get-project|'
                'create-project|update-project|archive-project|get-model|save-model'
            ),
        })

    try:
        body_raw = event.get('body') or '{}'
        if event.get('isBase64Encoded'):
            body_raw = base64.b64decode(body_raw).decode('utf-8')
        body = json.loads(body_raw) if body_raw.strip() else {}
    except Exception:
        return json_response(400, {'error': 'invalid_json'})

    user = auth_user(event)

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        # Публичные эндпоинты (без авторизации)
        if action == 'tariffs' and method == 'GET':
            return action_tariffs(conn)
        if action == 'waitlist' and method == 'POST':
            return action_waitlist(conn, body, user, user_agent(event), client_ip(event))

        # Дальше — требуется авторизация
        if not user:
            return json_response(401, {'error': 'unauthorized', 'message': 'Требуется вход.'})

        if action == 'list-projects' and method == 'GET':
            return action_list_projects(conn, user)
        if action == 'get-project' and method == 'GET':
            return action_get_project(conn, user, params)
        if action == 'create-project' and method == 'POST':
            return action_create_project(conn, user, body)
        if action == 'update-project' and method in ('POST', 'PATCH'):
            return action_update_project(conn, user, params, body)
        if action == 'archive-project' and method in ('POST', 'DELETE'):
            return action_archive_project(conn, user, params)
        if action == 'get-model' and method == 'GET':
            return action_get_model(conn, user, params)
        if action == 'save-model' and method in ('POST', 'PUT'):
            return action_save_model(conn, user, params, body)

        return json_response(404, {'error': 'unknown_action'})
    except Exception as e:
        import traceback
        print(f'[cae-api] error type={type(e).__name__} msg={e!r}')
        print(f'[cae-api] traceback: {traceback.format_exc()}')
        return json_response(500, {'error': 'internal_error', 'message': f'{type(e).__name__}: {e}'[:300]})
    finally:
        conn.close()
