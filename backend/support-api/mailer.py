"""
SMTP-отправка через Яндекс 360 (секреты SSO_SMTP_USER / SSO_SMTP_PASSWORD).
Письмо «ваше обращение обработано / проблема исправлена».

Копия логики backend/sso-auth/mailer.py — бэкенд-функции изолированы.
"""
import os
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid

SMTP_HOST = 'smtp.yandex.ru'
SMTP_PORT = 465
SITE_URL = 'https://xn----gtbhgbqhkfi.xn--p1ai'


def to_punycode_email(addr: str) -> str:
    if not addr or '@' not in addr:
        return addr
    local, domain = addr.rsplit('@', 1)
    try:
        domain_ascii = domain.encode('idna').decode('ascii')
    except Exception:
        domain_ascii = domain
    return f'{local}@{domain_ascii}'


def _prepare_smtp_login(raw: str) -> str:
    s = raw.strip()
    return to_punycode_email(s) if '@' in s else s


def send_email(to: str, subject: str, html_body: str, text_body: str) -> bool:
    smtp_login_raw = os.environ.get('SSO_SMTP_USER')
    smtp_password = os.environ.get('SSO_SMTP_PASSWORD')
    smtp_from_raw = os.environ.get('SSO_SMTP_FROM') or os.environ.get('SSO_SMTP_USER')

    if not smtp_login_raw or not smtp_password:
        print('[support-api] SMTP secrets not configured, email skipped', flush=True)
        return False

    smtp_login = _prepare_smtp_login(smtp_login_raw)

    if smtp_from_raw and '@' in smtp_from_raw:
        smtp_from = to_punycode_email(smtp_from_raw.strip())
    elif '/' in smtp_login_raw:
        parts = smtp_login_raw.strip().split('/')
        smtp_from = f'{parts[-1]}@{parts[0]}'
    else:
        smtp_from = smtp_login

    recipient = to_punycode_email(to.strip())
    msg_id_domain = smtp_from.split('@')[-1] if '@' in smtp_from else 'diplom-inzh.ru'

    msg = EmailMessage()
    msg.set_charset('utf-8')
    msg['Subject'] = subject
    msg['From'] = formataddr(('Диплом-Инж.рф', smtp_from), charset='utf-8')
    msg['To'] = recipient
    msg['Reply-To'] = formataddr(('Диплом-Инж.рф · поддержка', 'info@xn----gtbhgbqhkfi.xn--p1ai'), charset='utf-8')
    msg['Date'] = formatdate(localtime=True)
    msg['Message-ID'] = make_msgid(domain=msg_id_domain)
    msg.set_content(text_body)
    msg.add_alternative(html_body, subtype='html')

    try:
        ctx = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ctx, timeout=20) as server:
            server.login(smtp_login, smtp_password)
            server.send_message(msg, from_addr=smtp_from, to_addrs=[recipient])
        print(f'[support-api] email sent OK: to={recipient!r}', flush=True)
        return True
    except Exception as e:
        print(f'[support-api] SMTP error: {type(e).__name__} {e!r}', flush=True)
        return False


def ticket_resolved_html(greet: str, ticket_id: int, ticket_title: str,
                         admin_note: str, link_url: str) -> str:
    note_block = ''
    if admin_note:
        note_block = (
            '<p style="font-size:14px;line-height:1.55;margin:0 0 8px;color:#3a3a5e;'
            'text-transform:uppercase;letter-spacing:0.1em;font-family:\'Courier New\',monospace;">'
            'Ответ команды</p>'
            f'<p style="font-size:15px;line-height:1.55;margin:0 0 22px;white-space:pre-wrap;'
            f'border-left:3px solid #c0392b;padding-left:14px;">{admin_note}</p>'
        )
    return f"""<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf8f0;font-family:Georgia,'Times New Roman',serif;color:#1a1a2e;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#faf8f0;padding:40px 20px;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#fdfcf6;border:1.5px solid #1a1a2e;">
<tr><td style="padding:32px 36px;">
<p style="margin:0 0 18px;font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#3a3a5e;">Диплом-Инж.рф · Техподдержка</p>
<h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#1a1a2e;border-bottom:2px solid #1a1a2e;padding-bottom:14px;">Ваше обращение обработано</h1>
<p style="font-size:15px;line-height:1.55;margin:0 0 14px;">{greet}</p>
<p style="font-size:15px;line-height:1.55;margin:0 0 22px;">По вашему обращению <strong>#{ticket_id} «{ticket_title}»</strong> есть результат — проблема решена.</p>
{note_block}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto;">
<tr><td style="background:#c0392b;border:2px solid #c0392b;">
<a href="{link_url}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:'Courier New',monospace;font-size:13px;letter-spacing:0.15em;text-transform:uppercase;color:#ffffff;text-decoration:none;font-weight:700;">Открыть в личном кабинете</a>
</td></tr></table>
<hr style="border:none;border-top:1px solid #d9d4be;margin:28px 0 18px;">
<p style="font-size:11px;line-height:1.5;margin:0;color:#7a7a8e;">Это автоматическое письмо. По вопросам пишите на <a href="mailto:info@xn----gtbhgbqhkfi.xn--p1ai" style="color:#c0392b;">info@диплом-инж.рф</a></p>
</td></tr></table>
</td></tr></table>
</body></html>"""
