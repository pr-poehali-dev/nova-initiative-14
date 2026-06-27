"""
Business: Админ-управление всеми тарифами проекта (CAE, обучение, виджет) и
          расчёт экономики — себестоимости одной единицы расчёта (CAE и виджет)
          и рекомендованной цены каждого тарифа.
Args: event с httpMethod, queryStringParameters.action, headers.X-Authorization,
      body (JSON). Действия:
        GET  ?action=overview      — все тарифы + экономика + себестоимость/рек.цена
        POST ?action=save-settings — сохранить параметры экономики (pricing_settings)
        POST ?action=save-widget   — создать/обновить тариф виджета
        POST ?action=save-cae      — обновить цену тарифа CAE
        POST ?action=save-tariff   — обновить цену тарифа обучения
Returns: JSON. Только для администратора (is_admin).
"""
import json
import os
import base64
import hashlib
import hmac
import time

import psycopg2

JWT_SECRET = os.environ.get('SSO_JWT_SECRET', '')

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


def _is_admin(conn, user_id: int) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT is_admin FROM sso_users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        return bool(row and row[0])


def _get_settings(conn) -> dict:
    cols = [
        'monthly_infra_rub', 'gb_second_rub', 'cae_timeout_sec', 'cae_memory_mb',
        'cae_avg_duration_ms', 'widget_timeout_sec', 'widget_memory_mb',
        'widget_avg_duration_ms', 'monthly_calc_volume', 'margin_multiplier',
    ]
    with conn.cursor() as cur:
        cur.execute(f"SELECT {', '.join(cols)} FROM pricing_settings WHERE id = 1")
        row = cur.fetchone()
    data = dict(zip(cols, row))
    for k in ('gb_second_rub', 'cae_timeout_sec', 'widget_timeout_sec', 'margin_multiplier'):
        data[k] = float(data[k])
    return data


def _unit_economics(s: dict) -> dict:
    """Себестоимость одной единицы расчёта и рекомендованная цена единицы.

    compute-стоимость вызова = timeout_sec * (memory_mb/1024) * gb_second_rub
    (биллинг по таймауту, как у облака). Плюс разнесённая доля фикс. инфраструктуры
    на один расчёт = monthly_infra_rub / monthly_calc_volume.
    """
    volume = max(1, int(s['monthly_calc_volume']))
    infra_per_calc = s['monthly_infra_rub'] / volume
    margin = s['margin_multiplier']

    def calc(timeout_sec: float, memory_mb: int) -> dict:
        compute = timeout_sec * (memory_mb / 1024.0) * s['gb_second_rub']
        cost = compute + infra_per_calc
        return {
            'compute_rub': round(compute, 6),
            'infra_per_calc_rub': round(infra_per_calc, 6),
            'unit_cost_rub': round(cost, 6),
            'recommended_unit_price_rub': round(cost * margin, 4),
        }

    return {
        'cae': calc(s['cae_timeout_sec'], s['cae_memory_mb']),
        'widget': calc(s['widget_timeout_sec'], s['widget_memory_mb']),
        'margin_multiplier': margin,
        'infra_per_calc_rub': round(infra_per_calc, 6),
    }


def _round_price(v: float) -> int:
    """Округление рекомендованной цены тарифа до «красивой» суммы."""
    if v <= 0:
        return 0
    if v < 1000:
        return int(round(v / 100.0) * 100)
    if v < 10000:
        return int(round(v / 500.0) * 500)
    return int(round(v / 1000.0) * 1000)


def _widget_tariffs(conn, econ: dict) -> list:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, slug, name, price_monthly, calc_limit, max_sites, features, "
            "is_popular, is_active, sort_order FROM widget_tariffs ORDER BY sort_order"
        )
        cols = [d[0] for d in cur.description]
        rows = [dict(zip(cols, r)) for r in cur.fetchall()]
    unit = econ['widget']['recommended_unit_price_rub']
    ucost = econ['widget']['unit_cost_rub']
    for r in rows:
        r['features'] = list(r['features']) if r['features'] else []
        limit = max(0, int(r['calc_limit']))
        r['cost_rub'] = round(ucost * limit, 2)
        r['recommended_price_rub'] = _round_price(unit * limit)
    return rows


def _cae_tariffs(conn, econ: dict) -> list:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, slug, name, price_monthly, price_one_off, max_solves_per_month, "
            "max_elements, is_public, sort_order FROM cae_tariffs ORDER BY sort_order"
        )
        cols = [d[0] for d in cur.description]
        rows = [dict(zip(cols, r)) for r in cur.fetchall()]
    unit = econ['cae']['recommended_unit_price_rub']
    ucost = econ['cae']['unit_cost_rub']
    # Опорный объём расчётов/мес для «безлимитных» тарифов — берём ожидаемый объём.
    for r in rows:
        solves = int(r['max_solves_per_month'])
        eff = solves if solves > 0 else 0
        r['is_unlimited'] = solves < 0
        r['cost_rub'] = round(ucost * eff, 2) if eff else None
        r['recommended_price_rub'] = _round_price(unit * eff) if eff else None
    return rows


def _edu_tariffs(conn) -> list:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, slug, title, duration, price, price_label, is_popular, "
            "is_active, sort_order FROM tariffs ORDER BY sort_order"
        )
        cols = [d[0] for d in cur.description]
        rows = [dict(zip(cols, r)) for r in cur.fetchall()]
    return rows


def handler(event, context):
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    user = _auth_user(event)
    if not user:
        return _resp(401, {'error': 'unauthorized'})

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        uid = int(user.get('sub') or user.get('user_id') or 0)
        if not _is_admin(conn, uid):
            return _resp(403, {'error': 'forbidden', 'message': 'Только администратор'})

        params = event.get('queryStringParameters') or {}
        action = params.get('action', 'overview')
        method = event.get('httpMethod')

        if method == 'GET' and action == 'overview':
            settings = _get_settings(conn)
            econ = _unit_economics(settings)
            return _resp(200, {
                'settings': settings,
                'economics': econ,
                'widget_tariffs': _widget_tariffs(conn, econ),
                'cae_tariffs': _cae_tariffs(conn, econ),
                'edu_tariffs': _edu_tariffs(conn),
            })

        body = json.loads(event.get('body') or '{}')

        if method == 'POST' and action == 'save-settings':
            allowed = [
                'monthly_infra_rub', 'gb_second_rub', 'cae_timeout_sec', 'cae_memory_mb',
                'cae_avg_duration_ms', 'widget_timeout_sec', 'widget_memory_mb',
                'widget_avg_duration_ms', 'monthly_calc_volume', 'margin_multiplier',
            ]
            sets, vals = [], []
            for k in allowed:
                if k in body:
                    sets.append(f"{k} = %s")
                    vals.append(body[k])
            if sets:
                sets.append("updated_at = now()")
                with conn.cursor() as cur:
                    cur.execute(f"UPDATE pricing_settings SET {', '.join(sets)} WHERE id = 1", vals)
                conn.commit()
            settings = _get_settings(conn)
            return _resp(200, {'ok': True, 'settings': settings, 'economics': _unit_economics(settings)})

        if method == 'POST' and action == 'save-widget':
            tid = body.get('id')
            with conn.cursor() as cur:
                if tid:
                    cur.execute(
                        "UPDATE widget_tariffs SET name=%s, price_monthly=%s, calc_limit=%s, "
                        "max_sites=%s, is_popular=%s, is_active=%s, sort_order=%s, updated_at=now() "
                        "WHERE id=%s",
                        (body['name'], body['price_monthly'], body['calc_limit'], body['max_sites'],
                         bool(body.get('is_popular')), bool(body.get('is_active', True)),
                         body.get('sort_order', 0), tid),
                    )
                else:
                    cur.execute(
                        "INSERT INTO widget_tariffs (slug, name, price_monthly, calc_limit, max_sites, "
                        "features, is_popular, is_active, sort_order) "
                        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                        (body['slug'], body['name'], body['price_monthly'], body['calc_limit'],
                         body['max_sites'], body.get('features', []), bool(body.get('is_popular')),
                         bool(body.get('is_active', True)), body.get('sort_order', 0)),
                    )
            conn.commit()
            return _resp(200, {'ok': True})

        if method == 'POST' and action == 'save-cae':
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE cae_tariffs SET price_monthly=%s, price_one_off=%s WHERE id=%s",
                    (body['price_monthly'], body.get('price_one_off', 0), body['id']),
                )
            conn.commit()
            return _resp(200, {'ok': True})

        if method == 'POST' and action == 'save-tariff':
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE tariffs SET price=%s, price_label=%s, updated_at=now() WHERE id=%s",
                    (body['price'], body.get('price_label'), body['id']),
                )
            conn.commit()
            return _resp(200, {'ok': True})

        return _resp(400, {'error': 'bad_request', 'message': 'Неизвестное действие'})
    finally:
        conn.close()
