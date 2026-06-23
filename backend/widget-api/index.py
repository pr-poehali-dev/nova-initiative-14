"""
Business: White-label виджет CAE-калькулятора балки для сайтов партнёров
          (заводы металлоконструкций, продавцы проката, стройкомпании).
          Проверяет API-ключ партнёра и домен-источник, считает прогиб/запас
          балки через FEM-солвер, принимает заявку посетителя и шлёт её на
          email партнёра.
Args: event с httpMethod, queryStringParameters.action ('config'|'calc'|'lead'),
      headers (Origin/Referer для проверки домена), body (JSON).
      Ключ партнёра: query.key или header X-Widget-Key.
Returns: JSON. config — профили и данные партнёра; calc — прогиб/запас;
         lead — статус отправки заявки.
"""
import base64
import hashlib
import hmac
import json
import os
import secrets
import smtplib
import time
import urllib.request
import urllib.error
from email.mime.text import MIMEText
from email.header import Header
from urllib.parse import urlparse

import psycopg2

CAE_SOLVER_URL = 'https://functions.poehali.dev/b470871c-af29-425e-90ed-8fc6c152ab1e'
JWT_SECRET = os.environ.get('SSO_JWT_SECRET', '')

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Widget-Key, X-Authorization, Authorization',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json; charset=utf-8',
}

# Сталь Ст3 по умолчанию.
STEEL = {
    'id': 'steel_st3', 'name': 'Сталь Ст3',
    'E': 2.06e11, 'G': 8.0e10, 'nu': 0.3, 'rho': 7850, 'sigma_yield': 245e6,
}

# Компактный каталог самых ходовых профилей для виджета (СИ: A[м²], I[м⁴], W[м³]).
# id совпадает с фронтовым каталогом cae-sections.ts.
PROFILES = {
    'I10': {'name': 'Двутавр I10', 'h': 0.100, 'A': 12.0e-4, 'I_z': 198e-8,  'W_z': 39.7e-6, 'I_y': 17.9e-8, 'W_y': 6.49e-6, 'shear_area_y': 6.0e-4,  'shear_area_z': 8.4e-4},
    'I12': {'name': 'Двутавр I12', 'h': 0.120, 'A': 14.7e-4, 'I_z': 350e-8,  'W_z': 58.4e-6, 'I_y': 27.9e-8, 'W_y': 8.72e-6, 'shear_area_y': 7.35e-4, 'shear_area_z': 10.3e-4},
    'I14': {'name': 'Двутавр I14', 'h': 0.140, 'A': 17.4e-4, 'I_z': 572e-8,  'W_z': 81.7e-6, 'I_y': 41.9e-8, 'W_y': 11.5e-6, 'shear_area_y': 8.7e-4,  'shear_area_z': 12.2e-4},
    'I16': {'name': 'Двутавр I16', 'h': 0.160, 'A': 20.2e-4, 'I_z': 873e-8,  'W_z': 109e-6,  'I_y': 58.6e-8, 'W_y': 14.5e-6, 'shear_area_y': 10.1e-4, 'shear_area_z': 14.1e-4},
    'I18': {'name': 'Двутавр I18', 'h': 0.180, 'A': 23.4e-4, 'I_z': 1290e-8, 'W_z': 143e-6,  'I_y': 82.6e-8, 'W_y': 18.4e-6, 'shear_area_y': 11.7e-4, 'shear_area_z': 16.4e-4},
    'I20': {'name': 'Двутавр I20', 'h': 0.200, 'A': 26.8e-4, 'I_z': 1840e-8, 'W_z': 184e-6,  'I_y': 115e-8,  'W_y': 23.1e-6, 'shear_area_y': 13.4e-4, 'shear_area_z': 18.7e-4},
    'I24': {'name': 'Двутавр I24', 'h': 0.240, 'A': 34.8e-4, 'I_z': 3460e-8, 'W_z': 289e-6,  'I_y': 198e-8,  'W_y': 34.5e-6, 'shear_area_y': 17.4e-4, 'shear_area_z': 24.4e-4},
    'I30': {'name': 'Двутавр I30', 'h': 0.300, 'A': 46.5e-4, 'I_z': 7080e-8, 'W_z': 472e-6,  'I_y': 337e-8,  'W_y': 49.9e-6, 'shear_area_y': 23.3e-4, 'shear_area_z': 32.6e-4},
    'I36': {'name': 'Двутавр I36', 'h': 0.360, 'A': 61.9e-4, 'I_z': 13380e-8,'W_z': 743e-6,  'I_y': 516e-8,  'W_y': 71.1e-6, 'shear_area_y': 31.0e-4, 'shear_area_z': 43.3e-4},
    'I40': {'name': 'Двутавр I40', 'h': 0.400, 'A': 72.6e-4, 'I_z': 19062e-8,'W_z': 953e-6,  'I_y': 667e-8,  'W_y': 86.1e-6, 'shear_area_y': 36.3e-4, 'shear_area_z': 50.8e-4},
}


def _resp(status, body):
    return {'statusCode': status, 'headers': CORS, 'body': json.dumps(body, ensure_ascii=False)}


def _db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def _origin_domain(event: dict) -> str:
    """Домен сайта-источника из Origin или Referer (без схемы и www не трогаем)."""
    headers = event.get('headers') or {}
    raw = headers.get('Origin') or headers.get('origin') \
        or headers.get('Referer') or headers.get('referer') or ''
    if not raw:
        return ''
    try:
        host = urlparse(raw).hostname or ''
        return host.lower()
    except Exception:
        return ''


def _get_key(event: dict) -> str:
    params = event.get('queryStringParameters') or {}
    headers = event.get('headers') or {}
    return (params.get('key') or headers.get('X-Widget-Key')
            or headers.get('x-widget-key') or '').strip()


def _load_partner(api_key: str):
    """Возвращает dict партнёра или None."""
    if not api_key:
        return None
    conn = _db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, company_name, contact_email, allowed_domains, is_active "
                "FROM widget_partners WHERE api_key = %s",
                (api_key,),
            )
            row = cur.fetchone()
    finally:
        conn.close()
    if not row:
        return None
    return {
        'id': row[0], 'company_name': row[1], 'contact_email': row[2],
        'allowed_domains': row[3] or [], 'is_active': row[4],
    }


def _domain_allowed(partner: dict, domain: str) -> bool:
    """Пустой список доменов = разрешены все (демо/разработка)."""
    allowed = partner['allowed_domains']
    if not allowed:
        return True
    if not domain:
        return False
    return domain in allowed


def _check_access(event: dict):
    """Общая проверка ключа, активности и домена. Возвращает (partner, error_resp)."""
    key = _get_key(event)
    partner = _load_partner(key)
    if not partner:
        return None, _resp(403, {'error': 'invalid_key', 'message': 'Неверный ключ виджета'})
    if not partner['is_active']:
        return None, _resp(403, {'error': 'inactive', 'message': 'Подписка партнёра неактивна'})
    domain = _origin_domain(event)
    if not _domain_allowed(partner, domain):
        return None, _resp(403, {'error': 'domain_not_allowed',
                                 'message': f'Домен {domain} не разрешён для этого ключа'})
    return partner, None


def _build_beam_model(span_m: float, profile_id: str, load_type: str,
                      load_value: float, support: str) -> dict:
    """Строит FrameModel балки для солвера.
    span_m — пролёт [м]; load_type 'point'|'udl';
    load_value — сила [Н] (point, в центре) или погонная [Н/м] (udl);
    support 'simply'|'cantilever'."""
    prof = PROFILES[profile_id]
    section = {
        'id': profile_id, 'name': prof['name'], 'A': prof['A'],
        'I_y': prof['I_y'], 'I_z': prof['I_z'], 'W_y': prof['W_y'], 'W_z': prof['W_z'],
        'h': prof['h'], 'shear_area_y': prof['shear_area_y'], 'shear_area_z': prof['shear_area_z'],
    }
    mid = round(span_m / 2.0, 4)

    if support == 'cantilever':
        nodes = [{'id': 'n1', 'coords': [0, 0, 0]}, {'id': 'n2', 'coords': [span_m, 0, 0]}]
        elements = [{'id': 'e1', 'node_start': 'n1', 'node_end': 'n2',
                     'material_id': STEEL['id'], 'section_id': profile_id}]
        bc = [{'id': 'bc1', 'node_id': 'n1', 'type': 'fixed',
               'constrained_dofs': ['ux', 'uy', 'rz']}]
        if load_type == 'udl':
            loads = [{'id': 'L1', 'type': 'distributed_uniform', 'element_id': 'e1',
                      'load_local_per_length': [0, -abs(load_value), 0]}]
        else:
            loads = [{'id': 'L1', 'type': 'nodal_force', 'node_id': 'n2',
                      'force': [0, -abs(load_value), 0], 'moment': [0, 0, 0]}]
    else:
        # simply supported: pinned + roller, узел в середине для точечной силы
        nodes = [
            {'id': 'n1', 'coords': [0, 0, 0]},
            {'id': 'n2', 'coords': [mid, 0, 0]},
            {'id': 'n3', 'coords': [span_m, 0, 0]},
        ]
        elements = [
            {'id': 'e1', 'node_start': 'n1', 'node_end': 'n2',
             'material_id': STEEL['id'], 'section_id': profile_id},
            {'id': 'e2', 'node_start': 'n2', 'node_end': 'n3',
             'material_id': STEEL['id'], 'section_id': profile_id},
        ]
        bc = [
            {'id': 'bc1', 'node_id': 'n1', 'type': 'pinned', 'constrained_dofs': ['ux', 'uy']},
            {'id': 'bc2', 'node_id': 'n3', 'type': 'roller_y', 'constrained_dofs': ['uy']},
        ]
        if load_type == 'udl':
            loads = [
                {'id': 'L1', 'type': 'distributed_uniform', 'element_id': 'e1',
                 'load_local_per_length': [0, -abs(load_value), 0]},
                {'id': 'L2', 'type': 'distributed_uniform', 'element_id': 'e2',
                 'load_local_per_length': [0, -abs(load_value), 0]},
            ]
        else:
            loads = [{'id': 'L1', 'type': 'nodal_force', 'node_id': 'n2',
                      'force': [0, -abs(load_value), 0], 'moment': [0, 0, 0]}]

    return {
        'meta': {'dim': '2d'},
        'materials': [STEEL],
        'sections': [section],
        'nodes': nodes,
        'elements': elements,
        'boundary_conditions': bc,
        'loads': loads,
        'analysis_options': {'diagram_subdivisions': 20, 'analysis_type': 'linear',
                             'self_weight': {'enabled': False, 'g': 9.81, 'direction': [0, -1, 0]}},
        'analysis_settings': {
            'discipline': 'construction', 'industry': 'general',
            'strength_theory': 'mises', 'safety_factor': 1.5,
            'check_deflection': True, 'check_strength': True,
            'check_buckling': False, 'self_weight': False,
        },
    }


def _call_solver(model: dict) -> dict:
    """POST в cae-solver?action=demo. Возвращает SolverResponse dict."""
    data = json.dumps(model).encode('utf-8')
    req = urllib.request.Request(
        f'{CAE_SOLVER_URL}?action=demo', data=data,
        headers={'Content-Type': 'application/json'}, method='POST',
    )
    with urllib.request.urlopen(req, timeout=25) as r:
        return json.loads(r.read().decode('utf-8'))


def _handle_config(event: dict):
    partner, err = _check_access(event)
    if err:
        return err
    profiles = [{'id': pid, 'name': p['name']} for pid, p in PROFILES.items()]
    return _resp(200, {
        'ok': True,
        'company_name': partner['company_name'],
        'profiles': profiles,
    })


def _handle_calc(event: dict, body: dict):
    partner, err = _check_access(event)
    if err:
        return err

    try:
        span = float(body.get('span_m'))
        load_value = float(body.get('load_value'))
        profile_id = str(body.get('profile_id'))
        load_type = str(body.get('load_type', 'udl'))
        support = str(body.get('support', 'simply'))
    except (TypeError, ValueError):
        return _resp(400, {'error': 'bad_input', 'message': 'Некорректные параметры расчёта'})

    if profile_id not in PROFILES:
        return _resp(400, {'error': 'bad_profile', 'message': 'Неизвестный профиль'})
    if not (0.1 <= span <= 30):
        return _resp(400, {'error': 'bad_span', 'message': 'Пролёт должен быть 0.1…30 м'})
    if load_value <= 0:
        return _resp(400, {'error': 'bad_load', 'message': 'Нагрузка должна быть > 0'})
    if load_type not in ('udl', 'point') or support not in ('simply', 'cantilever'):
        return _resp(400, {'error': 'bad_input', 'message': 'Некорректный тип нагрузки/опор'})

    model = _build_beam_model(span, profile_id, load_type, load_value, support)
    try:
        sr = _call_solver(model)
    except Exception as e:
        print(f'[widget-api] solver error: {e!r}')
        return _resp(502, {'error': 'solver_failed', 'message': 'Не удалось выполнить расчёт'})

    if sr.get('status') != 'ok':
        return _resp(502, {'error': 'solver_failed',
                           'message': sr.get('message') or 'Ошибка решателя'})

    summary = sr.get('summary') or {}
    max_defl = abs(summary.get('max_displacement') or 0.0)
    safety = summary.get('min_safety_factor')
    # Допустимый прогиб по СП для перекрытий ~ L/250 (консервативно).
    deflection_limit = span / 250.0
    deflection_ok = max_defl <= deflection_limit

    result = {
        'max_deflection_mm': round(max_defl * 1000, 2),
        'deflection_limit_mm': round(deflection_limit * 1000, 2),
        'deflection_ratio': f'L/{int(span / max_defl)}' if max_defl > 0 else 'L/∞',
        'deflection_ok': deflection_ok,
        'safety_factor': round(safety, 2) if safety is not None else None,
        'strength_ok': (safety is None) or (safety >= 1.5),
        'max_sigma_mpa': round((summary.get('max_sigma_vm') or 0.0) / 1e6, 1),
    }

    calc_input = {'span_m': span, 'load_type': load_type, 'load_value': load_value,
                  'profile_id': profile_id, 'support': support}
    _log_event(partner['id'], 'calc', _origin_domain(event), calc_input, result, None)

    return _resp(200, {'ok': True, 'result': result, 'input': calc_input})


def _handle_lead(event: dict, body: dict):
    partner, err = _check_access(event)
    if err:
        return err

    name = (body.get('name') or '').strip()[:255]
    phone = (body.get('phone') or '').strip()[:64]
    email = (body.get('email') or '').strip()[:255]
    comment = (body.get('comment') or '').strip()[:2000]
    calc_input = body.get('calc_input') or {}
    calc_result = body.get('calc_result') or {}

    if not name or not phone:
        return _resp(400, {'error': 'bad_lead', 'message': 'Укажите имя и телефон'})

    domain = _origin_domain(event)
    _log_event(partner['id'], 'lead', domain, calc_input, calc_result, {
        'name': name, 'phone': phone, 'email': email, 'comment': comment,
    })

    sent = _send_partner_email(partner, domain, name, phone, email, comment,
                               calc_input, calc_result)
    return _resp(200, {'ok': True, 'email_sent': sent})


def _log_event(partner_id, event_type, domain, calc_input, calc_result, customer):
    try:
        conn = _db()
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO widget_leads (partner_id, event_type, origin_domain, "
                "calc_input, calc_result, customer_name, customer_phone, "
                "customer_email, customer_comment) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (partner_id, event_type, domain,
                 json.dumps(calc_input, ensure_ascii=False) if calc_input else None,
                 json.dumps(calc_result, ensure_ascii=False) if calc_result else None,
                 (customer or {}).get('name'), (customer or {}).get('phone'),
                 (customer or {}).get('email'), (customer or {}).get('comment')),
            )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f'[widget-api] log error: {e!r}')


def _send_partner_email(partner, domain, name, phone, email, comment,
                        calc_input, calc_result) -> bool:
    """Шлёт заявку на email партнёра через Яндекс 360 SMTP."""
    smtp_user = os.environ.get('SSO_SMTP_USER')
    smtp_pass = os.environ.get('SSO_SMTP_PASSWORD')
    if not smtp_user or not smtp_pass:
        print('[widget-api] SMTP не настроен')
        return False

    span = calc_input.get('span_m', '—')
    profile = calc_input.get('profile_id', '—')
    defl = calc_result.get('max_deflection_mm', '—')
    safety = calc_result.get('safety_factor', '—')

    text = (
        f'Новая заявка с калькулятора на вашем сайте ({domain}).\n\n'
        f'Контакт:\n'
        f'  Имя: {name}\n'
        f'  Телефон: {phone}\n'
        f'  Email: {email or "—"}\n'
        f'  Комментарий: {comment or "—"}\n\n'
        f'Параметры расчёта балки:\n'
        f'  Пролёт: {span} м\n'
        f'  Профиль: {profile}\n'
        f'  Прогиб: {defl} мм\n'
        f'  Запас прочности: {safety}\n\n'
        f'— Виджет CAE, Диплом-Инж.рф'
    )

    msg = MIMEText(text, 'plain', 'utf-8')
    msg['Subject'] = Header(f'Заявка с калькулятора ({domain})', 'utf-8')
    msg['From'] = smtp_user
    msg['To'] = partner['contact_email']
    if email:
        msg['Reply-To'] = email

    try:
        with smtplib.SMTP_SSL('smtp.yandex.ru', 465, timeout=20) as server:
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, [partner['contact_email']], msg.as_string())
        return True
    except Exception as e:
        print(f'[widget-api] email error: {e!r}')
        return False


# === Owner-доступ (управление партнёрами через кабинет владельца) ===

def _b64url_decode(s: str) -> bytes:
    pad = '=' * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)


def _verify_jwt(token: str):
    if not JWT_SECRET:
        return None
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


def _owner_or_none(event: dict):
    """Возвращает user_id владельца или None. Проверяет JWT и флаг is_owner в БД."""
    headers = event.get('headers') or {}
    auth = headers.get('X-Authorization') or headers.get('Authorization') or ''
    if not auth.startswith('Bearer '):
        return None
    payload = _verify_jwt(auth[7:].strip())
    if not payload or 'sub' not in payload:
        return None
    try:
        user_id = int(payload['sub'])
    except (TypeError, ValueError):
        return None
    conn = _db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT is_owner FROM sso_users WHERE id = %s", (user_id,))
            row = cur.fetchone()
    finally:
        conn.close()
    return user_id if (row and row[0]) else None


def _handle_owner_list(event: dict):
    if not _owner_or_none(event):
        return _resp(403, {'error': 'forbidden'})
    conn = _db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT p.id, p.api_key, p.company_name, p.contact_email, "
                "p.allowed_domains, p.is_active, p.plan, p.monthly_calc_limit, p.created_at, "
                "(SELECT count(*) FROM widget_leads l WHERE l.partner_id = p.id AND l.event_type='calc'), "
                "(SELECT count(*) FROM widget_leads l WHERE l.partner_id = p.id AND l.event_type='lead') "
                "FROM widget_partners p ORDER BY p.created_at DESC"
            )
            rows = cur.fetchall()
    finally:
        conn.close()
    partners = [{
        'id': r[0], 'api_key': r[1], 'company_name': r[2], 'contact_email': r[3],
        'allowed_domains': r[4] or [], 'is_active': r[5], 'plan': r[6],
        'monthly_calc_limit': r[7], 'created_at': r[8].isoformat() if r[8] else None,
        'calc_count': r[9], 'lead_count': r[10],
    } for r in rows]
    return _resp(200, {'ok': True, 'partners': partners})


def _handle_owner_create(event: dict, body: dict):
    if not _owner_or_none(event):
        return _resp(403, {'error': 'forbidden'})
    company = (body.get('company_name') or '').strip()[:255]
    email = (body.get('contact_email') or '').strip()[:255]
    domains = body.get('allowed_domains') or []
    if not company or not email:
        return _resp(400, {'error': 'bad_input', 'message': 'Укажите название и email'})
    if not isinstance(domains, list):
        domains = []
    domains = [str(d).strip().lower()[:255] for d in domains if str(d).strip()]
    plan = (body.get('plan') or 'basic').strip()[:32]
    api_key = 'pk_' + secrets.token_hex(16)
    conn = _db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO widget_partners (api_key, company_name, contact_email, "
                "allowed_domains, plan) VALUES (%s, %s, %s, %s, %s) RETURNING id",
                (api_key, company, email, domains, plan),
            )
            pid = cur.fetchone()[0]
        conn.commit()
    finally:
        conn.close()
    return _resp(200, {'ok': True, 'id': pid, 'api_key': api_key})


def _handle_owner_toggle(event: dict, body: dict):
    if not _owner_or_none(event):
        return _resp(403, {'error': 'forbidden'})
    try:
        pid = int(body.get('id'))
        active = bool(body.get('is_active'))
    except (TypeError, ValueError):
        return _resp(400, {'error': 'bad_input'})
    conn = _db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE widget_partners SET is_active = %s, updated_at = now() WHERE id = %s",
                (active, pid),
            )
        conn.commit()
    finally:
        conn.close()
    return _resp(200, {'ok': True})


def handler(event, context):
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action', 'config')

    if action == 'config' and method == 'GET':
        return _handle_config(event)
    if action == 'owner-list' and method == 'GET':
        return _handle_owner_list(event)

    if method != 'POST':
        return _resp(405, {'error': 'method_not_allowed'})

    try:
        body = json.loads(event.get('body') or '{}')
    except (ValueError, TypeError):
        body = {}

    if action == 'calc':
        return _handle_calc(event, body)
    if action == 'lead':
        return _handle_lead(event, body)
    if action == 'owner-create':
        return _handle_owner_create(event, body)
    if action == 'owner-toggle':
        return _handle_owner_toggle(event, body)

    return _resp(400, {'error': 'unknown_action'})