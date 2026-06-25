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

import billing

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
                "SELECT id, company_name, contact_email, allowed_domains, is_active, plan, "
                "monthly_price_rub, monthly_calc_limit, billing_email, "
                "visitor_solve_limit, visitor_limit_enabled "
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
        'monthly_price_rub': row[6], 'monthly_calc_limit': row[7],
        'billing_email': row[8] or row[2],
        'visitor_solve_limit': row[9],
        'visitor_limit_enabled': row[10] if row[10] is not None else True,
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
    # Эффективный лимит расчётов НА ОДНОГО ПОСЕТИТЕЛЯ:
    #  - ограничение выключено партнёром  -> 0 (маркер «безлимит» для фронта);
    #  - задан индивидуальный лимит        -> он;
    #  - иначе                             -> лимит из тарифа.
    if not partner.get('visitor_limit_enabled', True):
        solve_limit = 0  # 0 = безлимит (фронт превращает в Infinity)
    elif partner.get('visitor_solve_limit') is not None:
        solve_limit = int(partner['visitor_solve_limit'])
    else:
        solve_limit = limits['solve_limit']
    # Логируем открытие виджета (для аналитики/биллинга по показам).
    _log_event(partner['id'], 'open', _origin_domain(event), None, None, None)
    return _resp(200, {
        'ok': True,
        'company_name': partner['company_name'],
        'plan': partner['plan'],
        'limits': {
            'solveLimit': solve_limit,
            'nodeLimit': limits['node_limit'],
            'elementLimit': limits['element_limit'],
        },
    })


def _handle_register_calc(event: dict):
    """Учитывает один расчёт в месячном биллинге партнёра.
    Вызывается виджетом после успешного расчёта. При исчерпании месячного
    лимита автоматически начисляется доп-пакет (+50%) и шлётся уведомление."""
    partner, err = _check_access(event)
    if err:
        return err
    conn = _db()
    try:
        res = billing.register_calc(conn, partner)
    except Exception as e:
        print(f'[widget-api] register_calc error: {e!r}')
        # Не ломаем виджет из-за биллинга — расчёт уже выполнен.
        try:
            conn.close()
        except Exception:
            pass
        return _resp(200, {'ok': True, 'billing': None})
    period = res['period']
    limit = billing.effective_limit(period)

    # Уведомления партнёру (порог 80% и исчерпание лимита).
    try:
        if res['reached_100']:
            _notify_partner_limit(partner, period, limit, kind='limit_reached')
        elif res['reached_80']:
            _notify_partner_limit(partner, period, limit, kind='limit_near')
    except Exception as e:
        print(f'[widget-api] notify error: {e!r}')
    finally:
        conn.close()

    return _resp(200, {
        'ok': True,
        'calc_used': period['calc_used'],
        'calc_limit': limit,
        'charged_extra': res['charged_extra'],
    })


def _handle_partner_summary(event: dict):
    """Сводка биллинга для личного кабинета партнёра (доступ по ключу)."""
    partner, err = _check_access(event)
    if err:
        return err
    conn = _db()
    try:
        summary = billing.billing_summary(conn, partner)
    finally:
        conn.close()
    return _resp(200, {
        'ok': True,
        'company_name': partner['company_name'],
        'contact_email': partner['contact_email'],
        'monthly_price_rub': partner['monthly_price_rub'],
        'allowed_domains': partner['allowed_domains'],
        'billing': summary,
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


def _send_email(to_addr: str, subject: str, text: str, reply_to: str = None) -> bool:
    """Базовая отправка письма через Яндекс 360 SMTP."""
    smtp_user = os.environ.get('SSO_SMTP_USER')
    smtp_pass = os.environ.get('SSO_SMTP_PASSWORD')
    if not smtp_user or not smtp_pass:
        print('[widget-api] SMTP не настроен')
        return False
    msg = MIMEText(text, 'plain', 'utf-8')
    msg['Subject'] = Header(subject, 'utf-8')
    msg['From'] = smtp_user
    msg['To'] = to_addr
    if reply_to:
        msg['Reply-To'] = reply_to
    try:
        with smtplib.SMTP_SSL('smtp.yandex.ru', 465, timeout=20) as server:
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, [to_addr], msg.as_string())
        return True
    except Exception as e:
        print(f'[widget-api] email error: {e!r}')
        return False


def _send_partner_email(partner, domain, name, phone, email, comment,
                        calc_input, calc_result) -> bool:
    """Шлёт заявку посетителя на email партнёра."""
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
    return _send_email(partner['contact_email'], f'Заявка с калькулятора ({domain})',
                       text, reply_to=email or None)


def _notify_partner_limit(partner, period, limit, kind: str) -> bool:
    """Уведомляет партнёра о приближении/исчерпании месячного лимита расчётов."""
    to_addr = partner.get('billing_email') or partner['contact_email']
    used = period['calc_used']
    if kind == 'limit_near':
        subject = 'Виджет CAE: израсходовано 80% месячного лимита расчётов'
        text = (
            f'Здравствуйте!\n\n'
            f'На вашем виджете-калькуляторе израсходовано {used} из {limit} '
            f'расчётов в этом месяце (более 80%).\n\n'
            f'При исчерпании лимита подключится доп-пакет: +50% к лимиту и +50% '
            f'к стоимости тарифа за этот месяц. Виджет продолжит работать без '
            f'перерыва.\n\n'
            f'Баланс и расчёты — в личном кабинете партнёра.\n\n'
            f'— Диплом-Инж.рф'
        )
    else:
        subject = 'Виджет CAE: месячный лимит расчётов исчерпан, подключён доп-пакет'
        text = (
            f'Здравствуйте!\n\n'
            f'Месячный лимит расчётов на вашем виджете исчерпан ({used} из {limit}). '
            f'Чтобы калькулятор продолжал работать, автоматически подключён '
            f'доп-пакет: +50% к лимиту расчётов и +50% к стоимости тарифа за этот '
            f'месяц.\n\n'
            f'Подробности и баланс — в личном кабинете партнёра.\n\n'
            f'— Диплом-Инж.рф'
        )
    return _send_email(to_addr, subject, text)


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
                "(SELECT count(*) FROM widget_leads l WHERE l.partner_id = p.id AND l.event_type='lead'), "
                "p.monthly_price_rub, "
                "(SELECT COALESCE(SUM(amount_due - amount_paid),0) FROM widget_billing_periods b WHERE b.partner_id = p.id), "
                "p.visitor_solve_limit, p.visitor_limit_enabled "
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
        'monthly_price_rub': r[11], 'debt': int(r[12] or 0),
        'visitor_solve_limit': r[13],
        'visitor_limit_enabled': r[14] if r[14] is not None else True,
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
    # Цена и месячный лимит по тарифу (синхронно с фронтом лендинга).
    plan_billing = {
        'basic':    {'price': 3900,  'limit': 1000},
        'business': {'price': 8900,  'limit': 5000},
        'zavod':    {'price': 19900, 'limit': 50000},
        'demo':     {'price': 0,     'limit': 100000},
    }.get(plan, {'price': 3900, 'limit': 1000})
    api_key = 'pk_' + secrets.token_hex(16)
    conn = _db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO widget_partners (api_key, company_name, contact_email, "
                "allowed_domains, plan, monthly_price_rub, monthly_calc_limit) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
                (api_key, company, email, domains, plan,
                 plan_billing['price'], plan_billing['limit']),
            )
            pid = cur.fetchone()[0]
        conn.commit()
    finally:
        conn.close()
    return _resp(200, {'ok': True, 'id': pid, 'api_key': api_key})


def _handle_owner_update(event: dict, body: dict):
    """Обновляет настройки виджета партнёра.
    Сейчас — лимит расчётов на одного посетителя:
      visitor_limit_enabled: bool — включено ли ограничение;
      visitor_solve_limit: int|null — индивидуальный лимит (null = брать из тарифа).
    """
    if not _owner_or_none(event):
        return _resp(403, {'error': 'forbidden'})
    try:
        pid = int(body.get('id'))
    except (TypeError, ValueError):
        return _resp(400, {'error': 'bad_input', 'message': 'Не указан партнёр'})

    enabled = bool(body.get('visitor_limit_enabled', True))
    raw_limit = body.get('visitor_solve_limit')
    if raw_limit in (None, '', 0):
        limit_val = None
    else:
        try:
            limit_val = max(1, int(raw_limit))
        except (TypeError, ValueError):
            return _resp(400, {'error': 'bad_limit', 'message': 'Лимит должен быть числом'})

    conn = _db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE widget_partners SET visitor_limit_enabled = %s, "
                "visitor_solve_limit = %s, updated_at = now() WHERE id = %s",
                (enabled, limit_val, pid),
            )
        conn.commit()
    finally:
        conn.close()
    return _resp(200, {'ok': True})


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


def _handle_owner_pay(event: dict, body: dict):
    """Владелец вручную фиксирует оплату партнёра. Гасит долг по периодам."""
    owner_id = _owner_or_none(event)
    if not owner_id:
        return _resp(403, {'error': 'forbidden'})
    try:
        pid = int(body.get('partner_id'))
        amount = int(body.get('amount_rub'))
    except (TypeError, ValueError):
        return _resp(400, {'error': 'bad_input', 'message': 'Укажите партнёра и сумму'})
    if amount <= 0:
        return _resp(400, {'error': 'bad_amount', 'message': 'Сумма должна быть > 0'})
    note = (body.get('note') or '').strip()[:500]
    conn = _db()
    try:
        billing.record_payment(conn, pid, amount, note, owner_id)
        debt = billing.partner_debt(conn, pid)
    finally:
        conn.close()
    return _resp(200, {'ok': True, 'debt': debt})


def handler(event, context):
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action', 'config')

    if action == 'config' and method == 'GET':
        return _handle_config(event)
    if action == 'partner-summary' and method == 'GET':
        return _handle_partner_summary(event)
    if action == 'owner-list' and method == 'GET':
        return _handle_owner_list(event)

    if method != 'POST':
        return _resp(405, {'error': 'method_not_allowed'})

    try:
        body = json.loads(event.get('body') or '{}')
    except (ValueError, TypeError):
        body = {}

    if action == 'register-calc':
        return _handle_register_calc(event)
    if action == 'lead':
        return _handle_lead(event, body)
    if action == 'owner-create':
        return _handle_owner_create(event, body)
    if action == 'owner-toggle':
        return _handle_owner_toggle(event, body)
    if action == 'owner-update':
        return _handle_owner_update(event, body)
    if action == 'owner-pay':
        return _handle_owner_pay(event, body)

    return _resp(400, {'error': 'unknown_action'})