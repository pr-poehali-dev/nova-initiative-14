import json
import os
import smtplib
import ssl
import urllib.request
import urllib.parse
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid


SMTP_HOST = 'smtp.yandex.ru'
SMTP_PORT = 465


def _to_punycode_email(addr):
    """Преобразует email с кириллическим доменом в формат ASCII (Punycode для domain part)."""
    if not addr or '@' not in addr:
        return addr
    local, domain = addr.rsplit('@', 1)
    try:
        domain_ascii = domain.encode('idna').decode('ascii')
    except Exception:
        domain_ascii = domain
    return f'{local}@{domain_ascii}'


def _send_lead_email(lead_id, name, contact, comments):
    """Отправляет уведомление о новой заявке через SMTP Яндекс 360. Не валит запрос при ошибке."""
    # Используем те же SMTP-доступы, что и SSO-письма (info@диплом-инж.рф).
    # Имена YANDEX_SMTP_* оставлены как запасной вариант для совместимости.
    smtp_user_raw = os.environ.get('SSO_SMTP_USER') or os.environ.get('YANDEX_SMTP_USER')
    smtp_password = os.environ.get('SSO_SMTP_PASSWORD') or os.environ.get('YANDEX_SMTP_PASSWORD')
    notify_to_raw = os.environ.get('LEAD_NOTIFY_EMAIL') or smtp_user_raw

    if not smtp_user_raw or not smtp_password or not notify_to_raw:
        print('[create-lead] SMTP secrets not configured, email skipped')
        return False

    smtp_user = _to_punycode_email(smtp_user_raw.strip())
    recipients = [_to_punycode_email(a.strip()) for a in notify_to_raw.split(',') if a.strip()]
    if not recipients:
        return False

    lead_title = f'Новая заявка с сайта Диплом-Инж.рф · #{lead_id or "—"}'
    plain_body = (
        f'Имя: {name or "—"}\n'
        f'Контакт: {contact or "—"}\n'
        f'ID лида в Битрикс24: {lead_id or "—"}\n\n'
        f'{comments}\n'
    )

    msg = EmailMessage()
    msg.set_charset('utf-8')
    msg['Subject'] = lead_title
    msg['From'] = formataddr(('Диплом-Инж.рф · сайт', smtp_user), charset='utf-8')
    msg['To'] = ', '.join(recipients)
    msg['Date'] = formatdate(localtime=True)
    msg['Message-ID'] = make_msgid(domain=smtp_user.split('@')[-1])
    if contact and '@' in contact and not contact.startswith('@'):
        msg['Reply-To'] = _to_punycode_email(contact)
    msg.set_content(plain_body)

    try:
        ctx = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ctx, timeout=15) as server:
            server.login(smtp_user, smtp_password)
            server.send_message(msg, from_addr=smtp_user, to_addrs=recipients)
        print(f'[create-lead] Email sent to {recipients}')
        return True
    except Exception as e:
        print(f'[create-lead] SMTP error: {e}')
        return False


def handler(event: dict, context) -> dict:
    """Создаёт лид в Битрикс24 из данных формы заявки с сайта."""
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }

    try:
        body = json.loads(event.get('body') or '{}')
    except (ValueError, TypeError):
        return {
            'statusCode': 400,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({'ok': False, 'error': 'invalid_json'})
        }

    name = body.get('name', '')
    contact = body.get('contact', '')
    university = body.get('university', '')
    topic = body.get('topic', '')
    time_left = body.get('timeLeft', '')
    has_chapters = body.get('hasChapters', '')
    pages_ready = body.get('pagesReady', '')
    has_comments = body.get('hasComments', '')
    comments_text = body.get('commentsText', '')
    visitor = body.get('visitor', {})

    time_labels = {
        '3+': 'Больше 3 месяцев',
        '1-3': '1–3 месяца',
        '2-4w': '2–4 недели',
        '<1w': 'Меньше недели',
        'unknown': 'Не знаю точно',
    }
    time_str = time_labels.get(time_left, time_left)

    comments_block = ''
    if has_comments == 'yes' and comments_text:
        comments_block = f'\nЗамечания руководителя: {comments_text}'

    chapters_block = ''
    if has_chapters == 'yes':
        chapters_block = f'\nСтраниц готово: {pages_ready}' if pages_ready else '\nЕсть написанные главы'

    visitor_block = ''
    if visitor:
        pages_visited = ' → '.join(visitor.get('pages', [])) or '—'
        referrer = visitor.get('referrer', '—')
        time_on_site = visitor.get('timeOnSite', 0)
        minutes = time_on_site // 60
        seconds = time_on_site % 60
        time_str_visit = f'{minutes} мин {seconds} сек' if minutes else f'{seconds} сек'
        device = visitor.get('device', '—')
        utm_parts = []
        if visitor.get('utmSource'): utm_parts.append(f"utm_source={visitor['utmSource']}")
        if visitor.get('utmMedium'): utm_parts.append(f"utm_medium={visitor['utmMedium']}")
        if visitor.get('utmCampaign'): utm_parts.append(f"utm_campaign={visitor['utmCampaign']}")
        utm_str = ', '.join(utm_parts) if utm_parts else '—'
        visitor_block = (
            f'\n\n--- Данные о посещении ---'
            f'\nПуть по сайту: {pages_visited}'
            f'\nОткуда пришёл: {referrer}'
            f'\nВремя на сайте: {time_str_visit}'
            f'\nУстройство: {device}'
            f'\nUTM-метки: {utm_str}'
        )

    comments = (
        f'Время до защиты: {time_str}\n'
        f'Университет/кафедра: {university}\n'
        f'Тема ВКР: {topic}'
        f'{chapters_block}'
        f'{comments_block}'
        f'{visitor_block}'
    )

    webhook_url = os.environ['BITRIX24_WEBHOOK_URL'].rstrip('/')

    phone_value = contact if contact.startswith('+') or contact[0].isdigit() else None
    telegram_value = contact if contact.startswith('@') else None

    fields = {
        'TITLE': f'Заявка с сайта: {name}',
        'NAME': name,
        'COMMENTS': comments,
        'SOURCE_ID': 'WEB',
        'STATUS_ID': 'NEW',
    }

    if phone_value:
        fields['PHONE'] = [{'VALUE': phone_value, 'VALUE_TYPE': 'WORK'}]
    if telegram_value:
        fields['IM'] = [{'VALUE': telegram_value, 'VALUE_TYPE': 'TELEGRAM'}]
    if not phone_value and not telegram_value:
        fields['PHONE'] = [{'VALUE': contact, 'VALUE_TYPE': 'WORK'}]

    target_url = f'{webhook_url}/crm.lead.add.json'
    print(f'[create-lead] POST {target_url}')

    payload = json.dumps({'fields': fields}).encode('utf-8')
    req = urllib.request.Request(
        target_url,
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )

    lead_id = None
    bitrix_ok = True
    bitrix_error = None
    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read().decode('utf-8'))
        lead_id = result.get('result')
    except urllib.error.HTTPError as e:
        bitrix_ok = False
        bitrix_error = f'HTTP {e.code}'
        try:
            bitrix_error += f': {e.read().decode("utf-8")}'
        except Exception:
            pass
        print(f'[create-lead] Bitrix error: {bitrix_error}')
    except Exception as e:
        bitrix_ok = False
        bitrix_error = str(e)
        print(f'[create-lead] Bitrix error: {bitrix_error}')

    # Письмо отправляем ВСЕГДА, даже если Битрикс недоступен — чтобы заявка
    # точно дошла до info@диплом-инж.рф и не потерялась.
    email_sent = _send_lead_email(lead_id, name, contact, comments)

    # Заявка считается принятой, если сработал хотя бы один канал (CRM или почта).
    if not bitrix_ok and not email_sent:
        return {
            'statusCode': 502,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'ok': False, 'error': bitrix_error or 'delivery_failed'})
        }

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'ok': True, 'lead_id': lead_id, 'email_sent': email_sent})
    }