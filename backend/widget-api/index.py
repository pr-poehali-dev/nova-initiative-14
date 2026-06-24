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
from email.mime.text import MIMEText
from email.header import Header
from urllib.parse import urlparse

import psycopg2

JWT_SECRET = os.environ.get('SSO_JWT_SECRET', '')

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Widget-Key, X-Authorization, Authorization',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json; charset=utf-8',
}

# Лимиты CAE-редактора по тарифу партнёра. Виджет показывает НАСТОЯЩИЙ
# demo-CAE (тот же /cae/demo), а эти лимиты пробрасываются в редактор:
#   solve_limit   — число расчётов за сессию посетителя;
#   node_limit    — макс. число узлов в схеме;
#   element_limit — макс. число элементов (стержней).
# Так экономика и нагрузка предсказуемы и настраиваются ценой.
PLAN_LIMITS = {
    'demo':    {'solve_limit': 5,   'node_limit': 20,  'element_limit': 30},
    'basic':   {'solve_limit': 10,  'node_limit': 20,  'element_limit': 30},
    'business': {'solve_limit': 50, 'node_limit': 50,  'element_limit': 80},
    'zavod':   {'solve_limit': 999, 'node_limit': 200, 'element_limit': 400},
}
DEFAULT_LIMITS = PLAN_LIMITS['basic']


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
                "SELECT id, company_name, contact_email, allowed_domains, is_active, plan "
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
        'allowed_domains': row[3] or [], 'is_active': row[4], 'plan': row[5] or 'basic',
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


def _handle_config(event: dict):
    """Отдаёт виджету данные партнёра и лимиты CAE-редактора по его тарифу.
    Сам расчёт выполняет настоящий CAE-солвер на фронте (тот же demo-CAE)."""
    partner, err = _check_access(event)
    if err:
        return err
    limits = PLAN_LIMITS.get(partner['plan'], DEFAULT_LIMITS)
    # Логируем открытие виджета (для аналитики/биллинга по показам).
    _log_event(partner['id'], 'open', _origin_domain(event), None, None, None)
    return _resp(200, {
        'ok': True,
        'company_name': partner['company_name'],
        'plan': partner['plan'],
        'limits': {
            'solveLimit': limits['solve_limit'],
            'nodeLimit': limits['node_limit'],
            'elementLimit': limits['element_limit'],
        },
    })


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

    text = (
        f'Новая заявка с калькулятора на вашем сайте ({domain}).\n\n'
        f'Контакт:\n'
        f'  Имя: {name}\n'
        f'  Телефон: {phone}\n'
        f'  Email: {email or "—"}\n'
        f'  Комментарий: {comment or "—"}\n\n'
        f'Посетитель оставил заявку после расчёта в CAE-калькуляторе на вашем сайте.\n\n'
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
                "(SELECT count(*) FROM widget_leads l WHERE l.partner_id = p.id AND l.event_type='open'), "
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
        'open_count': r[9], 'lead_count': r[10],
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

    if action == 'lead':
        return _handle_lead(event, body)
    if action == 'owner-create':
        return _handle_owner_create(event, body)
    if action == 'owner-toggle':
        return _handle_owner_toggle(event, body)

    return _resp(400, {'error': 'unknown_action'})