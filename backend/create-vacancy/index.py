import json
import os
import smtplib
import ssl
import urllib.request
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid


SMTP_HOST = 'smtp.yandex.ru'
SMTP_PORT = 465


def _to_punycode_email(addr):
    """Преобразует email с кириллическим доменом в ASCII (Punycode для домена)."""
    if not addr or '@' not in addr:
        return addr
    local, domain = addr.rsplit('@', 1)
    try:
        domain_ascii = domain.encode('idna').decode('ascii')
    except Exception:
        domain_ascii = domain
    return f'{local}@{domain_ascii}'


def _send_vacancy_email(lead_id, name, contact, comments):
    """Отправляет уведомление о новой заявке на вакансию через SMTP Яндекс 360."""
    smtp_user_raw = os.environ.get('SSO_SMTP_USER') or os.environ.get('YANDEX_SMTP_USER')
    smtp_password = os.environ.get('SSO_SMTP_PASSWORD') or os.environ.get('YANDEX_SMTP_PASSWORD')
    notify_to_raw = os.environ.get('LEAD_NOTIFY_EMAIL') or smtp_user_raw

    if not smtp_user_raw or not smtp_password or not notify_to_raw:
        print('[create-vacancy] SMTP secrets not configured, email skipped')
        return False

    smtp_user = _to_punycode_email(smtp_user_raw.strip())
    recipients = [_to_punycode_email(a.strip()) for a in notify_to_raw.split(',') if a.strip()]
    if not recipients:
        return False

    plain_body = (
        f'Имя: {name or "—"}\n'
        f'Контакт: {contact or "—"}\n'
        f'ID лида в Битрикс24: {lead_id or "—"}\n\n'
        f'{comments}\n'
    )

    msg = EmailMessage()
    msg.set_charset('utf-8')
    msg['Subject'] = f'Заявка на вакансию наставника · Диплом-Инж.рф · #{lead_id or "—"}'
    msg['From'] = formataddr(('Диплом-Инж.рф · вакансии', smtp_user), charset='utf-8')
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
        print(f'[create-vacancy] Email sent to {recipients}')
        return True
    except Exception as e:
        print(f'[create-vacancy] SMTP error: {e}')
        return False


def handler(event: dict, context) -> dict:
    """Создаёт лид-вакансию наставника в Битрикс24 из данных формы."""
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

    body = json.loads(event.get('body', '{}'))

    name = body.get('name', '')
    contact = body.get('contact', '')
    education = body.get('education', '')
    experience = body.get('experience', '')
    about = body.get('about', '')
    resume_link = body.get('resumeLink', '')
    specialization = body.get('specialization', '')

    comments_parts = [
        f'Образование/вуз: {education}' if education else '',
        f'Опыт в преподавании/наставничестве: {experience}' if experience else '',
        f'О себе / почему хочет к нам: {about}' if about else '',
        f'Ссылка на резюме/портфолио: {resume_link}' if resume_link else '',
        f'Специализация/темы ВКР: {specialization}' if specialization else '',
    ]
    comments = '\n'.join([p for p in comments_parts if p])

    webhook_url = os.environ['BITRIX24_WEBHOOK_URL'].rstrip('/')

    is_phone = contact and (contact.startswith('+') or (contact and contact[0].isdigit()))
    is_telegram = contact.startswith('@')
    is_email = '@' in contact and not is_telegram

    fields = {
        'TITLE': f'Вакансия Наставник: {name}',
        'NAME': name,
        'COMMENTS': comments,
        'SOURCE_ID': 'WEB',
        'SOURCE_DESCRIPTION': 'Заявка на вакансию наставника с сайта',
        'STATUS_ID': 'NEW',
    }

    if is_phone:
        fields['PHONE'] = [{'VALUE': contact, 'VALUE_TYPE': 'WORK'}]
    elif is_telegram:
        fields['IM'] = [{'VALUE': contact, 'VALUE_TYPE': 'TELEGRAM'}]
    elif is_email:
        fields['EMAIL'] = [{'VALUE': contact, 'VALUE_TYPE': 'WORK'}]
    else:
        fields['PHONE'] = [{'VALUE': contact, 'VALUE_TYPE': 'WORK'}]

    target_url = f'{webhook_url}/crm.lead.add.json'
    print(f'[create-vacancy] POST {target_url}')

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
    except Exception as e:
        bitrix_ok = False
        bitrix_error = str(e)
        print(f'[create-vacancy] Bitrix error: {bitrix_error}')

    # Письмо отправляем всегда, чтобы заявка на вакансию дошла на почту.
    email_sent = _send_vacancy_email(lead_id, name, contact, comments)

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