"""
SMTP-отправка через Яндекс 360 + HTML-шаблон письма подтверждения email.

Особенность: SMTP-аутентификация под основным аккаунтом (YANDEX_SMTP_USER,
обычно info@), у которого включена роль «Отправитель» для общего ящика.
Заголовок From ставится от имени общего ящика no-reply@ (SSO_SMTP_FROM) —
так Яндекс разрешает «Отправить как». Envelope-from = реальный smtp_login.

Кириллические домены (диплом-инж.рф) преобразуются в Punycode через
кодировку 'idna', иначе SMTP не примет адрес.
"""
import os
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid

from config import SITE_URL, SMTP_HOST, SMTP_PORT


def to_punycode_email(addr: str) -> str:
    """Кириллический домен → ASCII (xn--…). Локальная часть остаётся как есть."""
    if not addr or '@' not in addr:
        return addr
    local, domain = addr.rsplit('@', 1)
    try:
        domain_ascii = domain.encode('idna').decode('ascii')
    except Exception:
        domain_ascii = domain
    return f'{local}@{domain_ascii}'


def _prepare_smtp_login(raw: str) -> str:
    """
    Яндекс 360 поддерживает два формата логина для SMTP:
      - обычный email:        info@диплом-инж.рф  → info@xn----gtbhgbqhkfi.xn--p1ai
      - технический (общий ящик): домен/владелец/ящик → оставляем как есть,
        домен уже должен быть в ASCII (punycode).
    """
    s = raw.strip()
    if '@' in s:
        return to_punycode_email(s)
    # Слэш-формат Яндекс 360 — не трогаем, Яндекс принимает как есть
    return s


def send_email(to: str, subject: str, html_body: str, text_body: str) -> bool:
    """
    Отправляет письмо через Яндекс 360 SMTP (SSL 465).
    Не валит запрос при ошибке — возвращает False, ошибка пишется в stdout.

    Поддерживает два формата YANDEX_SMTP_USER:
      - обычный:    info@диплом-инж.рф
      - технический (общий ящик): домен/login/shared  — для Яндекс 360
    """
    smtp_login_raw = os.environ.get('SSO_SMTP_USER') or os.environ.get('YANDEX_SMTP_USER')
    smtp_password = os.environ.get('SSO_SMTP_PASSWORD') or os.environ.get('YANDEX_SMTP_PASSWORD')
    # From-заголовок: отдельный секрет или берём из логина (только если это email, а не слэш-формат)
    smtp_from_raw = os.environ.get('SSO_SMTP_FROM') or os.environ.get('SSO_SMTP_USER')

    print(
        f'[sso-auth] SMTP secrets: user_set={bool(smtp_login_raw)} '
        f'pwd_set={bool(smtp_password)} '
        f'pwd_len={len(smtp_password) if smtp_password else 0}',
        flush=True,
    )

    if not smtp_login_raw or not smtp_password:
        print('[sso-auth] SMTP secrets not configured, email skipped', flush=True)
        return False

    smtp_login = _prepare_smtp_login(smtp_login_raw)

    # From-адрес в письме должен быть валидным email (не слэш-формат).
    # Если отдельный SSO_SMTP_FROM не задан, вычисляем из логина:
    #   слэш-формат домен/владелец/ящик → берём последний сегмент как ящик,
    #   домен — первый сегмент.
    if smtp_from_raw and '@' in smtp_from_raw:
        smtp_from = to_punycode_email(smtp_from_raw.strip())
    elif '/' in smtp_login_raw:
        parts = smtp_login_raw.strip().split('/')
        domain_part = parts[0]  # уже punycode
        mailbox_part = parts[-1]
        smtp_from = f'{mailbox_part}@{domain_part}'
    else:
        smtp_from = smtp_login

    recipient = to_punycode_email(to.strip())

    # Домен для Message-ID: берём из smtp_from
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

    print(f'[sso-auth] SMTP attempt: login={smtp_login!r} from={smtp_from!r} to={recipient!r} pwd_len={len(smtp_password)}', flush=True)
    try:
        ctx = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ctx, timeout=20) as server:
            server.login(smtp_login, smtp_password)
            server.send_message(msg, from_addr=smtp_from, to_addrs=[recipient])
        print(f'[sso-auth] email sent OK: to={recipient!r}', flush=True)
        return True
    except Exception as e:
        print(f'[sso-auth] SMTP error: type={type(e).__name__} msg={e!r}', flush=True)
        return False


def _verify_email_html(verify_url: str, greet: str) -> str:
    """HTML-шаблон письма с фирменным дизайном (бордюр, шрифт Georgia, кнопка-CTA)."""
    return f"""<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf8f0;font-family:Georgia,'Times New Roman',serif;color:#1a1a2e;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#faf8f0;padding:40px 20px;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#fdfcf6;border:1.5px solid #1a1a2e;">
<tr><td style="padding:32px 36px;">
<p style="margin:0 0 18px;font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#3a3a5e;">
Диплом-Инж.рф · SSO
</p>
<h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#1a1a2e;border-bottom:2px solid #1a1a2e;padding-bottom:14px;">
Подтверждение email
</h1>
<p style="font-size:15px;line-height:1.55;margin:0 0 14px;">{greet}</p>
<p style="font-size:15px;line-height:1.55;margin:0 0 22px;">
Вы зарегистрировались на сайте <strong>Диплом-Инж.рф</strong>. Чтобы активировать аккаунт, подтвердите ваш email — нажмите на кнопку ниже.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto;">
<tr><td style="background:#c0392b;border:2px solid #c0392b;">
<a href="{verify_url}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:'Courier New',monospace;font-size:13px;letter-spacing:0.15em;text-transform:uppercase;color:#ffffff;text-decoration:none;font-weight:700;">
Подтвердить email
</a>
</td></tr></table>
<p style="font-size:13px;line-height:1.55;margin:24px 0 8px;color:#3a3a5e;">
Если кнопка не открывается, скопируйте ссылку в адресную строку браузера:
</p>
<p style="font-size:12px;line-height:1.55;margin:0 0 24px;word-break:break-all;font-family:'Courier New',monospace;color:#2c3e80;">
{verify_url}
</p>
<p style="font-size:12px;line-height:1.55;margin:0 0 6px;color:#3a3a5e;">
Ссылка действительна <strong>24 часа</strong>. Если вы не регистрировались — просто проигнорируйте это письмо.
</p>
<hr style="border:none;border-top:1px solid #d9d4be;margin:28px 0 18px;">
<p style="font-size:11px;line-height:1.5;margin:0;color:#7a7a8e;font-family:'Courier News',monospace;">
Это автоматическое письмо. Отвечать на него не нужно.<br>
По любым вопросам пишите на <a href="mailto:info@xn----gtbhgbqhkfi.xn--p1ai" style="color:#c0392b;">info@диплом-инж.рф</a>
</p>
</td></tr></table>
</td></tr></table>
</body></html>"""


def send_reset_email(to_email: str, full_name: str, raw_token: str) -> bool:
    """Письмо со ссылкой сброса пароля /reset-password?token=…"""
    reset_url = f"{SITE_URL}/reset-password?token={raw_token}"
    greet = f"Здравствуйте, {full_name}!" if full_name else "Здравствуйте!"
    subject = "Сброс пароля · Диплом-Инж.рф"
    html = f"""<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf8f0;font-family:Georgia,'Times New Roman',serif;color:#1a1a2e;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#faf8f0;padding:40px 20px;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#fdfcf6;border:1.5px solid #1a1a2e;">
<tr><td style="padding:32px 36px;">
<p style="margin:0 0 18px;font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#3a3a5e;">Диплом-Инж.рф · SSO</p>
<h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#1a1a2e;border-bottom:2px solid #1a1a2e;padding-bottom:14px;">Сброс пароля</h1>
<p style="font-size:15px;line-height:1.55;margin:0 0 14px;">{greet}</p>
<p style="font-size:15px;line-height:1.55;margin:0 0 22px;">Мы получили запрос на сброс пароля для вашего аккаунта на <strong>Диплом-Инж.рф</strong>. Нажмите кнопку ниже, чтобы задать новый пароль.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto;">
<tr><td style="background:#c0392b;border:2px solid #c0392b;">
<a href="{reset_url}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:'Courier New',monospace;font-size:13px;letter-spacing:0.15em;text-transform:uppercase;color:#ffffff;text-decoration:none;font-weight:700;">Задать новый пароль</a>
</td></tr></table>
<p style="font-size:13px;line-height:1.55;margin:24px 0 8px;color:#3a3a5e;">Если кнопка не открывается, скопируйте ссылку:</p>
<p style="font-size:12px;line-height:1.55;margin:0 0 24px;word-break:break-all;font-family:'Courier New',monospace;color:#2c3e80;">{reset_url}</p>
<p style="font-size:12px;line-height:1.55;margin:0 0 6px;color:#3a3a5e;">Ссылка действительна <strong>2 часа</strong>. Если вы не запрашивали сброс — просто проигнорируйте это письмо, пароль останется прежним.</p>
<hr style="border:none;border-top:1px solid #d9d4be;margin:28px 0 18px;">
<p style="font-size:11px;line-height:1.5;margin:0;color:#7a7a8e;font-family:'Courier New',monospace;">Это автоматическое письмо. Отвечать на него не нужно.</p>
</td></tr></table>
</td></tr></table>
</body></html>"""
    text = (
        f"{greet}\n\n"
        f"Для сброса пароля на сайте Диплом-Инж.рф перейдите по ссылке:\n"
        f"{reset_url}\n\n"
        f"Ссылка действительна 2 часа.\n"
        f"Если вы не запрашивали сброс — проигнорируйте это письмо.\n\n"
        f"— Диплом-Инж.рф\n"
    )
    return send_email(to_email, subject, html, text)


def send_verify_email(to_email: str, full_name: str, raw_token: str) -> bool:
    """Письмо с одноразовой ссылкой на /verify-email?token=…"""
    verify_url = f"{SITE_URL}/verify-email?token={raw_token}"
    greet = f"Здравствуйте, {full_name}!" if full_name else "Здравствуйте!"
    subject = "Подтверждение email · Диплом-Инж.рф"

    html = _verify_email_html(verify_url, greet)
    text = (
        f"{greet}\n\n"
        f"Подтвердите email на сайте Диплом-Инж.рф, перейдя по ссылке:\n"
        f"{verify_url}\n\n"
        f"Ссылка действительна 24 часа. Если вы не регистрировались — проигнорируйте это письмо.\n\n"
        f"— Диплом-Инж.рф\n"
    )
    return send_email(to_email, subject, html, text)