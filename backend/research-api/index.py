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


# ============ ЭКОНОМИКА САЙТА (расходы) ============

EXPENSE_CATEGORIES = {'platform', 'domain', 'design', 'ads', 'content', 'other'}


def action_expenses_list(conn, owner_id: int) -> dict:
    """Список расходов + сводка: всего, по категориям, регулярные в месяц."""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT id, category, title, amount_kopecks, is_recurring, spent_on, note, created_at "
            "FROM owner_site_expenses WHERE owner_id = %s "
            "ORDER BY spent_on DESC, id DESC LIMIT 500",
            (owner_id,),
        )
        rows = cur.fetchall()

    items = []
    total = 0
    recurring_monthly = 0
    by_category: dict = {}
    for r in rows:
        amt = int(r['amount_kopecks'] or 0)
        total += amt
        if r['is_recurring']:
            recurring_monthly += amt
        cat = r['category'] or 'other'
        by_category[cat] = by_category.get(cat, 0) + amt
        items.append({
            'id': int(r['id']),
            'category': cat,
            'title': r['title'],
            'amount_kopecks': amt,
            'is_recurring': bool(r['is_recurring']),
            'spent_on': r['spent_on'].isoformat() if r['spent_on'] else None,
            'note': r['note'],
            'created_at': r['created_at'].isoformat() if r['created_at'] else None,
        })

    return _json_response(200, {
        'expenses': items,
        'summary': {
            'total_kopecks': total,
            'recurring_monthly_kopecks': recurring_monthly,
            'count': len(items),
            'by_category': by_category,
        },
    })


def action_expense_add(conn, owner_id: int, body: dict) -> dict:
    """Добавляет статью расхода."""
    title = (body.get('title') or '').strip()[:300]
    if not title:
        return _json_response(400, {'error': 'missing_title', 'message': 'Укажите название статьи'})
    category = (body.get('category') or 'other').strip()
    if category not in EXPENSE_CATEGORIES:
        category = 'other'
    try:
        amount_kopecks = int(round(float(body.get('amount_rub') or 0) * 100))
    except (TypeError, ValueError):
        return _json_response(400, {'error': 'bad_amount'})
    if amount_kopecks < 0:
        amount_kopecks = 0
    is_recurring = bool(body.get('is_recurring'))
    note = (body.get('note') or '').strip()[:500]
    spent_on = (body.get('spent_on') or '').strip()  # YYYY-MM-DD или пусто

    with conn.cursor() as cur:
        if spent_on:
            cur.execute(
                "INSERT INTO owner_site_expenses "
                "(owner_id, category, title, amount_kopecks, is_recurring, spent_on, note) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
                (owner_id, category, title, amount_kopecks, is_recurring, spent_on, note or None),
            )
        else:
            cur.execute(
                "INSERT INTO owner_site_expenses "
                "(owner_id, category, title, amount_kopecks, is_recurring, note) "
                "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                (owner_id, category, title, amount_kopecks, is_recurring, note or None),
            )
        expense_id = int(cur.fetchone()[0])
    conn.commit()
    return _json_response(200, {'ok': True, 'id': expense_id})


def action_expense_delete(conn, owner_id: int, body: dict) -> dict:
    """Удаляет статью расхода (только свою)."""
    expense_id = body.get('id')
    if not expense_id:
        return _json_response(400, {'error': 'missing_id'})
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM owner_site_expenses WHERE id = %s AND owner_id = %s",
            (int(expense_id), owner_id),
        )
    conn.commit()
    return _json_response(200, {'ok': True})


# ============ MINDMAP (бизнес-планы) ============

def _get_or_create_default_map(conn, owner_id: int, default_data: dict, title: str):
    """Возвращает первую карту владельца; если карт нет — создаёт со стартовыми
    данными (default_data приходит с фронта — структура сайта)."""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT id, title, data, updated_at FROM owner_mindmaps "
            "WHERE owner_id = %s ORDER BY id ASC LIMIT 1",
            (owner_id,),
        )
        row = cur.fetchone()
        if row:
            return dict(row)
        cur.execute(
            "INSERT INTO owner_mindmaps (owner_id, title, data) "
            "VALUES (%s, %s, %s) RETURNING id, title, data, updated_at",
            (owner_id, title[:300] or 'Карта', json.dumps(default_data, ensure_ascii=False)),
        )
        new_row = dict(cur.fetchone())
    conn.commit()
    return new_row


def action_mindmap_get(conn, owner_id: int, body: dict) -> dict:
    """Возвращает карту владельца (создаёт стартовую при первом обращении)."""
    default_data = body.get('default_data') or {'nodes': [], 'edges': []}
    title = (body.get('default_title') or 'Архитектура сайта').strip()
    row = _get_or_create_default_map(conn, owner_id, default_data, title)
    data = row['data']
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except Exception:
            data = {'nodes': [], 'edges': []}
    return _json_response(200, {
        'id': int(row['id']),
        'title': row['title'],
        'data': data,
        'updated_at': row['updated_at'].isoformat() if row.get('updated_at') else None,
    })


def action_mindmap_save(conn, owner_id: int, body: dict) -> dict:
    """Сохраняет карту (узлы + связи) владельца."""
    map_id = body.get('id')
    if not map_id:
        return _json_response(400, {'error': 'missing_id'})
    title = (body.get('title') or 'Карта').strip()[:300]
    data = body.get('data')
    if not isinstance(data, dict) or 'nodes' not in data or 'edges' not in data:
        return _json_response(400, {'error': 'bad_data'})
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE owner_mindmaps SET title = %s, data = %s, updated_at = now() "
            "WHERE id = %s AND owner_id = %s",
            (title, json.dumps(data, ensure_ascii=False), int(map_id), owner_id),
        )
        if cur.rowcount == 0:
            return _json_response(404, {'error': 'not_found'})
    conn.commit()
    return _json_response(200, {'ok': True})


# ============ ФИНАНСОВАЯ МОДЕЛЬ (бизнес-планы) ============

def action_finance_get(conn, owner_id: int, body: dict) -> dict:
    """Возвращает финмодель владельца (создаёт стартовую при первом обращении)."""
    default_data = body.get('default_data') or {}
    title = (body.get('default_title') or 'Финансовая модель').strip()
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT id, title, data, updated_at FROM owner_finance_models "
            "WHERE owner_id = %s ORDER BY id ASC LIMIT 1",
            (owner_id,),
        )
        row = cur.fetchone()
        if not row:
            cur.execute(
                "INSERT INTO owner_finance_models (owner_id, title, data) "
                "VALUES (%s, %s, %s) RETURNING id, title, data, updated_at",
                (owner_id, title[:300] or 'Финансовая модель',
                 json.dumps(default_data, ensure_ascii=False)),
            )
            row = cur.fetchone()
            conn.commit()
    row = dict(row)
    data = row['data']
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except Exception:
            data = {}
    return _json_response(200, {
        'id': int(row['id']),
        'title': row['title'],
        'data': data,
        'updated_at': row['updated_at'].isoformat() if row.get('updated_at') else None,
    })


def action_finance_save(conn, owner_id: int, body: dict) -> dict:
    """Сохраняет финмодель владельца."""
    model_id = body.get('id')
    if not model_id:
        return _json_response(400, {'error': 'missing_id'})
    title = (body.get('title') or 'Финансовая модель').strip()[:300]
    data = body.get('data')
    if not isinstance(data, dict):
        return _json_response(400, {'error': 'bad_data'})
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE owner_finance_models SET title = %s, data = %s, updated_at = now() "
            "WHERE id = %s AND owner_id = %s",
            (title, json.dumps(data, ensure_ascii=False), int(model_id), owner_id),
        )
        if cur.rowcount == 0:
            return _json_response(404, {'error': 'not_found'})
    conn.commit()
    return _json_response(200, {'ok': True})


# ============ БИЗНЕС-ПЛАН МСП (учебная тетрадь) ============

def action_bizplan_get(conn, owner_id: int, body: dict) -> dict:
    """Возвращает бизнес-план владельца (создаёт стартовый при первом обращении)."""
    default_data = body.get('default_data') or {}
    title = (body.get('default_title') or 'Бизнес-план').strip()
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT id, title, data, updated_at FROM owner_business_plans "
            "WHERE owner_id = %s ORDER BY id ASC LIMIT 1",
            (owner_id,),
        )
        row = cur.fetchone()
        if not row:
            cur.execute(
                "INSERT INTO owner_business_plans (owner_id, title, data) "
                "VALUES (%s, %s, %s) RETURNING id, title, data, updated_at",
                (owner_id, title[:300] or 'Бизнес-план',
                 json.dumps(default_data, ensure_ascii=False)),
            )
            row = cur.fetchone()
            conn.commit()
    row = dict(row)
    data = row['data']
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except Exception:
            data = {}
    return _json_response(200, {
        'id': int(row['id']),
        'title': row['title'],
        'data': data,
        'updated_at': row['updated_at'].isoformat() if row.get('updated_at') else None,
    })


def action_bizplan_save(conn, owner_id: int, body: dict) -> dict:
    """Сохраняет бизнес-план владельца."""
    plan_id = body.get('id')
    if not plan_id:
        return _json_response(400, {'error': 'missing_id'})
    title = (body.get('title') or 'Бизнес-план').strip()[:300]
    data = body.get('data')
    if not isinstance(data, dict):
        return _json_response(400, {'error': 'bad_data'})
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE owner_business_plans SET title = %s, data = %s, updated_at = now() "
            "WHERE id = %s AND owner_id = %s",
            (title, json.dumps(data, ensure_ascii=False), int(plan_id), owner_id),
        )
        if cur.rowcount == 0:
            return _json_response(404, {'error': 'not_found'})
    conn.commit()
    return _json_response(200, {'ok': True})


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

        if action == 'expenses-list' and method == 'GET':
            return action_expenses_list(conn, owner_id)
        if action == 'expense-add' and method == 'POST':
            return action_expense_add(conn, owner_id, body)
        if action == 'expense-delete' and method == 'POST':
            return action_expense_delete(conn, owner_id, body)

        if action == 'mindmap-get' and method == 'POST':
            return action_mindmap_get(conn, owner_id, body)
        if action == 'mindmap-save' and method == 'POST':
            return action_mindmap_save(conn, owner_id, body)

        if action == 'finance-get' and method == 'POST':
            return action_finance_get(conn, owner_id, body)
        if action == 'finance-save' and method == 'POST':
            return action_finance_save(conn, owner_id, body)

        if action == 'bizplan-get' and method == 'POST':
            return action_bizplan_get(conn, owner_id, body)
        if action == 'bizplan-save' and method == 'POST':
            return action_bizplan_save(conn, owner_id, body)

        return _json_response(404, {'error': 'unknown_action'})
    except Exception as e:
        import traceback
        print(f'[research-api] error: {e!r}\n{traceback.format_exc()}')
        return _json_response(500, {'error': 'internal_error', 'message': f'{type(e).__name__}: {e}'[:300]})
    finally:
        conn.close()