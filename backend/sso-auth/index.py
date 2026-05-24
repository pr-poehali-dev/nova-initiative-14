"""
Business: SSO авторизация — регистрация, логин, refresh, userinfo, logout, verify-email, resend-verification.
Args: event.queryStringParameters.action; httpMethod POST/GET/OPTIONS; body JSON.
Returns: HTTP-ответ с access_token, refresh_token и профилем пользователя.
"""
import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import smtplib
import ssl
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid

import psycopg2
import psycopg2.extras


JWT_SECRET = os.environ['SSO_JWT_SECRET']
PEPPER = os.environ['SSO_PASSWORD_PEPPER']
ACCESS_TOKEN_TTL = 60 * 60          # 1 час
REFRESH_TOKEN_TTL = 60 * 60 * 24 * 30  # 30 дней
VERIFY_TOKEN_TTL = 60 * 60 * 24     # 24 часа на подтверждение email
ISSUER = 'https://xn----gtbhgbqhkfi.xn--p1ai'
SITE_URL = ISSUER

SMTP_HOST = 'smtp.yandex.ru'
SMTP_PORT = 465

OAUTH_REDIRECT_URI = f'{SITE_URL}/oauth/callback'
OAUTH_STATE_TTL = 60 * 10  # 10 минут

# Конфигурация OAuth-провайдеров.
# Все провайдеры используют единый redirect_uri и единую логику OAuth 2.0 Authorization Code Flow.
OAUTH_PROVIDERS = {
    'yandex': {
        'auth_url': 'https://oauth.yandex.ru/authorize',
        'token_url': 'https://oauth.yandex.ru/token',
        'userinfo_url': 'https://login.yandex.ru/info?format=json',
        'scope': 'login:email login:info login:avatar',
        'client_id_env': 'OAUTH_YANDEX_CLIENT_ID',
        'client_secret_env': 'OAUTH_YANDEX_CLIENT_SECRET',
    },
    'vk': {
        # VK ID (новый OAuth 2.1 + PKCE). Используем "ВК ID для бизнеса" endpoints.
        'auth_url': 'https://id.vk.com/authorize',
        'token_url': 'https://id.vk.com/oauth2/auth',
        'userinfo_url': 'https://id.vk.com/oauth2/user_info',
        'scope': 'email',
        'client_id_env': 'OAUTH_VK_CLIENT_ID',
        'client_secret_env': 'OAUTH_VK_CLIENT_SECRET',
        'use_pkce': True,
    },
    'google': {
        'auth_url': 'https://accounts.google.com/o/oauth2/v2/auth',
        'token_url': 'https://oauth2.googleapis.com/token',
        'userinfo_url': 'https://openidconnect.googleapis.com/v1/userinfo',
        'scope': 'openid email profile',
        'client_id_env': 'OAUTH_GOOGLE_CLIENT_ID',
        'client_secret_env': 'OAUTH_GOOGLE_CLIENT_SECRET',
    },
    'mailru': {
        'auth_url': 'https://oauth.mail.ru/login',
        'token_url': 'https://oauth.mail.ru/token',
        'userinfo_url': 'https://oauth.mail.ru/userinfo',
        'scope': 'userinfo',
        'client_id_env': 'OAUTH_MAILRU_CLIENT_ID',
        'client_secret_env': 'OAUTH_MAILRU_CLIENT_SECRET',
    },
}

EMAIL_RE = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Authorization, Authorization',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json; charset=utf-8',
}


# ============ Утилиты ============

def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('ascii')


def _b64url_decode(s: str) -> bytes:
    pad = '=' * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)


def _json_response(status: int, body: dict) -> dict:
    return {
        'statusCode': status,
        'headers': CORS,
        'body': json.dumps(body, ensure_ascii=False),
    }


def _hash_password(password: str) -> str:
    """PBKDF2-SHA256 + pepper. 200_000 итераций."""
    salt = secrets.token_bytes(16)
    seasoned = (password + PEPPER).encode('utf-8')
    dk = hashlib.pbkdf2_hmac('sha256', seasoned, salt, 200_000)
    return f"pbkdf2_sha256$200000${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"


def _verify_password(password: str, stored: str) -> bool:
    try:
        algo, iters, salt_b64, dk_b64 = stored.split('$')
        if algo != 'pbkdf2_sha256':
            return False
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(dk_b64)
        seasoned = (password + PEPPER).encode('utf-8')
        actual = hashlib.pbkdf2_hmac('sha256', seasoned, salt, int(iters))
        return hmac.compare_digest(expected, actual)
    except Exception:
        return False


def _sign_jwt(payload: dict) -> str:
    header = {'alg': 'HS256', 'typ': 'JWT'}
    h_b = _b64url_encode(json.dumps(header, separators=(',', ':')).encode())
    p_b = _b64url_encode(json.dumps(payload, separators=(',', ':')).encode())
    signing_input = f'{h_b}.{p_b}'.encode()
    sig = hmac.new(JWT_SECRET.encode(), signing_input, hashlib.sha256).digest()
    return f'{h_b}.{p_b}.{_b64url_encode(sig)}'


def _verify_jwt(token: str) -> dict | None:
    try:
        h_b, p_b, s_b = token.split('.')
        signing_input = f'{h_b}.{p_b}'.encode()
        expected_sig = hmac.new(JWT_SECRET.encode(), signing_input, hashlib.sha256).digest()
        actual_sig = _b64url_decode(s_b)
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None
        payload = json.loads(_b64url_decode(p_b))
        if payload.get('exp', 0) < int(time.time()):
            return None
        return payload
    except Exception:
        return None


def _generate_refresh_token() -> tuple[str, str]:
    """Возвращает (raw_token, sha256_hash). Raw отдаётся клиенту, hash — в БД."""
    raw = secrets.token_urlsafe(48)
    h = hashlib.sha256(raw.encode()).hexdigest()
    return raw, h


def _get_user_payload(conn, user_id: int) -> dict:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT id, email, full_name, phone, avatar_url, locale, "
            "email_verified_at, is_active, created_at "
            "FROM sso_users WHERE id = %s",
            (user_id,),
        )
        u = cur.fetchone()
        if not u:
            return {}
        cur.execute("SELECT role FROM sso_user_roles WHERE user_id = %s", (user_id,))
        roles = [r['role'] for r in cur.fetchall()]
        return {
            'id': u['id'],
            'email': u['email'],
            'full_name': u['full_name'],
            'phone': u['phone'],
            'avatar_url': u['avatar_url'],
            'locale': u['locale'],
            'email_verified': bool(u['email_verified_at']),
            'is_active': u['is_active'],
            'roles': roles,
            'created_at': u['created_at'].isoformat() if u['created_at'] else None,
        }


def _issue_tokens(conn, user_id: int, user_agent: str, ip: str, client_id: str = 'main') -> dict:
    """Выпускает access JWT + refresh-токен, сохраняет refresh в БД."""
    user = _get_user_payload(conn, user_id)
    now = int(time.time())
    access_payload = {
        'sub': str(user_id),
        'email': user.get('email'),
        'name': user.get('full_name'),
        'roles': user.get('roles', []),
        'iat': now,
        'exp': now + ACCESS_TOKEN_TTL,
        'iss': ISSUER,
        'aud': client_id,
    }
    access_token = _sign_jwt(access_payload)

    raw_refresh, refresh_hash = _generate_refresh_token()
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=REFRESH_TOKEN_TTL)

    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO sso_refresh_tokens (user_id, client_id, token_hash, expires_at, user_agent, ip) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (user_id, client_id, refresh_hash, expires_at, (user_agent or '')[:512], (ip or '')[:64]),
        )
        cur.execute("UPDATE sso_users SET last_login_at = NOW() WHERE id = %s", (user_id,))
    conn.commit()

    return {
        'access_token': access_token,
        'refresh_token': raw_refresh,
        'token_type': 'Bearer',
        'expires_in': ACCESS_TOKEN_TTL,
        'user': user,
    }


def _to_punycode_email(addr: str) -> str:
    """Преобразует email с кириллическим доменом в ASCII (Punycode)."""
    if not addr or '@' not in addr:
        return addr
    local, domain = addr.rsplit('@', 1)
    try:
        domain_ascii = domain.encode('idna').decode('ascii')
    except Exception:
        domain_ascii = domain
    return f'{local}@{domain_ascii}'


def _create_verify_token(conn, user_id: int) -> str:
    """Создаёт одноразовый токен подтверждения email и сохраняет его SHA-256."""
    raw = secrets.token_urlsafe(32)
    h = hashlib.sha256(raw.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=VERIFY_TOKEN_TTL)
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO sso_action_tokens (user_id, purpose, token_hash, expires_at) "
            "VALUES (%s, %s, %s, %s)",
            (user_id, 'verify_email', h, expires_at),
        )
    conn.commit()
    return raw


def _send_email(to: str, subject: str, html_body: str, text_body: str) -> bool:
    """Отправляет письмо через Яндекс 360 SMTP.
    SMTP-аутентификация под основным аккаунтом (YANDEX_SMTP_USER, обычно info@),
    у которого есть роль shared_mailbox_sender. Заголовок From ставится от имени
    общего ящика no-reply@ (SSO_SMTP_FROM). Так Яндекс разрешает 'Отправить как'.
    Не валит запрос при ошибке.
    """
    smtp_login_raw = os.environ.get('YANDEX_SMTP_USER') or os.environ.get('SSO_SMTP_USER')
    smtp_password = os.environ.get('YANDEX_SMTP_PASSWORD') or os.environ.get('SSO_SMTP_PASSWORD')
    smtp_from_raw = os.environ.get('SSO_SMTP_FROM') or os.environ.get('SSO_SMTP_USER') or smtp_login_raw

    if not smtp_login_raw or not smtp_password:
        print('[sso-auth] SMTP secrets not configured, email skipped')
        return False

    smtp_login = _to_punycode_email(smtp_login_raw.strip())
    smtp_from = _to_punycode_email((smtp_from_raw or smtp_login_raw).strip())
    recipient = _to_punycode_email(to.strip())

    msg = EmailMessage()
    msg.set_charset('utf-8')
    msg['Subject'] = subject
    msg['From'] = formataddr(('Диплом-Инж.рф', smtp_from), charset='utf-8')
    msg['To'] = recipient
    msg['Reply-To'] = formataddr(('Диплом-Инж.рф · поддержка', smtp_login), charset='utf-8')
    msg['Date'] = formatdate(localtime=True)
    msg['Message-ID'] = make_msgid(domain=smtp_from.split('@')[-1])
    msg.set_content(text_body)
    msg.add_alternative(html_body, subtype='html')

    try:
        ctx = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ctx, timeout=20) as server:
            server.login(smtp_login, smtp_password)
            # Envelope-from = реальный smtp_login (для DKIM/SPF Яндекс).
            # Header From = no-reply@ (для пользователя в его клиенте).
            server.send_message(msg, from_addr=smtp_login, to_addrs=[recipient])
        print(f'[sso-auth] email sent: login={smtp_login} from_header={smtp_from} to={recipient}')
        return True
    except Exception as e:
        print(f'[sso-auth] SMTP error: type={type(e).__name__} msg={e!r}')
        return False


def _send_verify_email(to_email: str, full_name: str, raw_token: str) -> bool:
    verify_url = f"{SITE_URL}/verify-email?token={raw_token}"
    greet = f"Здравствуйте, {full_name}!" if full_name else "Здравствуйте!"
    subject = "Подтверждение email · Диплом-Инж.рф"

    html = f"""<!DOCTYPE html>
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

    text = (
        f"{greet}\n\n"
        f"Вы зарегистрировались на сайте Диплом-Инж.рф. Чтобы активировать аккаунт, "
        f"подтвердите ваш email, перейдя по ссылке ниже:\n\n"
        f"{verify_url}\n\n"
        f"Ссылка действительна 24 часа. Если вы не регистрировались — просто проигнорируйте это письмо.\n\n"
        f"— Диплом-Инж.рф\n"
    )
    return _send_email(to_email, subject, html, text)


def _client_ip(event: dict) -> str:
    ctx = event.get('requestContext') or {}
    identity = ctx.get('identity') or {}
    return (identity.get('sourceIp') or '')[:64]


def _user_agent(event: dict) -> str:
    headers = event.get('headers') or {}
    return headers.get('User-Agent') or headers.get('user-agent') or ''


def _log_attempt(conn, email: str, ip: str, success: bool, ua: str) -> None:
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO sso_login_attempts (email, ip, success, user_agent) "
                "VALUES (%s, %s, %s, %s)",
                ((email or '')[:255], ip[:64], success, (ua or '')[:512]),
            )
        conn.commit()
    except Exception as e:
        print(f'[sso-auth] log_attempt error: {e}')


def _check_rate_limit(conn, ip: str) -> bool:
    """Не более 10 неуспешных попыток с одного IP за 10 минут."""
    if not ip:
        return True
    with conn.cursor() as cur:
        cur.execute(
            "SELECT COUNT(*) FROM sso_login_attempts "
            "WHERE ip = %s AND success = FALSE AND created_at > NOW() - INTERVAL '10 minutes'",
            (ip,),
        )
        count = cur.fetchone()[0]
        return count < 10


# ============ Обработчики ============

def _action_register(conn, body: dict, ua: str, ip: str) -> dict:
    email = (body.get('email') or '').strip().lower()
    password = body.get('password') or ''
    full_name = (body.get('full_name') or '').strip()[:200]

    if not EMAIL_RE.match(email):
        return _json_response(400, {'error': 'invalid_email', 'message': 'Некорректный email'})
    if len(password) < 8:
        return _json_response(400, {'error': 'weak_password', 'message': 'Пароль должен быть не короче 8 символов'})
    if len(password) > 200:
        return _json_response(400, {'error': 'long_password', 'message': 'Пароль слишком длинный'})

    with conn.cursor() as cur:
        cur.execute("SELECT id FROM sso_users WHERE email = %s", (email,))
        if cur.fetchone():
            return _json_response(409, {'error': 'email_taken', 'message': 'Пользователь с таким email уже зарегистрирован'})

        password_hash = _hash_password(password)
        cur.execute(
            "INSERT INTO sso_users (email, password_hash, full_name) "
            "VALUES (%s, %s, %s) RETURNING id",
            (email, password_hash, full_name or None),
        )
        user_id = cur.fetchone()[0]
        cur.execute(
            "INSERT INTO sso_user_roles (user_id, role) VALUES (%s, 'student')",
            (user_id,),
        )
    conn.commit()

    raw_token = _create_verify_token(conn, user_id)
    sent = _send_verify_email(email, full_name, raw_token)

    return _json_response(201, {
        'ok': True,
        'email_sent': sent,
        'email': email,
        'message': 'Аккаунт создан. Подтвердите email — мы отправили ссылку на ваш адрес.',
    })


def _action_login(conn, body: dict, ua: str, ip: str) -> dict:
    email = (body.get('email') or '').strip().lower()
    password = body.get('password') or ''

    if not email or not password:
        return _json_response(400, {'error': 'missing_credentials', 'message': 'Введите email и пароль'})

    if not _check_rate_limit(conn, ip):
        return _json_response(429, {'error': 'too_many_attempts', 'message': 'Слишком много попыток. Попробуйте через 10 минут.'})

    with conn.cursor() as cur:
        cur.execute("SELECT id, password_hash, is_active, email_verified_at FROM sso_users WHERE email = %s", (email,))
        row = cur.fetchone()

    if not row or not _verify_password(password, row[1]):
        _log_attempt(conn, email, ip, False, ua)
        return _json_response(401, {'error': 'invalid_credentials', 'message': 'Неверный email или пароль'})

    user_id, _, is_active, verified_at = row
    if not is_active:
        _log_attempt(conn, email, ip, False, ua)
        return _json_response(403, {'error': 'account_disabled', 'message': 'Аккаунт деактивирован'})

    if verified_at is None:
        _log_attempt(conn, email, ip, False, ua)
        return _json_response(403, {
            'error': 'email_not_verified',
            'message': 'Подтвердите email — мы отправили вам ссылку. Если письма нет, нажмите «отправить заново».',
            'email': email,
        })

    _log_attempt(conn, email, ip, True, ua)
    tokens = _issue_tokens(conn, user_id, ua, ip)
    return _json_response(200, tokens)


def _action_refresh(conn, body: dict, ua: str, ip: str) -> dict:
    raw = (body.get('refresh_token') or '').strip()
    if not raw:
        return _json_response(400, {'error': 'missing_refresh', 'message': 'Нет refresh-токена'})
    h = hashlib.sha256(raw.encode()).hexdigest()

    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, user_id, expires_at, revoked_at, client_id "
            "FROM sso_refresh_tokens WHERE token_hash = %s",
            (h,),
        )
        row = cur.fetchone()
        if not row:
            return _json_response(401, {'error': 'invalid_refresh'})
        token_id, user_id, expires_at, revoked_at, client_id = row
        if revoked_at is not None:
            return _json_response(401, {'error': 'token_revoked'})
        if expires_at < datetime.now(timezone.utc):
            return _json_response(401, {'error': 'token_expired'})

        # Ротация: отзываем старый, выдаём новый
        cur.execute("UPDATE sso_refresh_tokens SET revoked_at = NOW() WHERE id = %s", (token_id,))
    conn.commit()

    tokens = _issue_tokens(conn, user_id, ua, ip, client_id=client_id)
    return _json_response(200, tokens)


def _action_userinfo(conn, event: dict) -> dict:
    headers = event.get('headers') or {}
    auth = headers.get('X-Authorization') or headers.get('Authorization') or ''
    if not auth.startswith('Bearer '):
        return _json_response(401, {'error': 'missing_token'})
    token = auth[7:].strip()
    payload = _verify_jwt(token)
    if not payload:
        return _json_response(401, {'error': 'invalid_token'})
    user = _get_user_payload(conn, int(payload['sub']))
    if not user:
        return _json_response(404, {'error': 'user_not_found'})
    return _json_response(200, {'user': user})


def _action_logout(conn, body: dict) -> dict:
    raw = (body.get('refresh_token') or '').strip()
    if not raw:
        return _json_response(400, {'error': 'missing_refresh'})
    h = hashlib.sha256(raw.encode()).hexdigest()
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE sso_refresh_tokens SET revoked_at = NOW() "
            "WHERE token_hash = %s AND revoked_at IS NULL",
            (h,),
        )
    conn.commit()
    return _json_response(200, {'ok': True})


def _action_verify_email(conn, body: dict, ua: str, ip: str) -> dict:
    raw = (body.get('token') or '').strip()
    if not raw:
        return _json_response(400, {'error': 'missing_token'})
    h = hashlib.sha256(raw.encode()).hexdigest()

    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, user_id, expires_at, used_at FROM sso_action_tokens "
            "WHERE token_hash = %s AND purpose = 'verify_email'",
            (h,),
        )
        row = cur.fetchone()
        if not row:
            return _json_response(400, {'error': 'invalid_token', 'message': 'Ссылка недействительна или уже использована.'})
        token_id, user_id, expires_at, used_at = row
        if used_at is not None:
            return _json_response(400, {'error': 'already_used', 'message': 'Эта ссылка уже была использована.'})
        if expires_at < datetime.now(timezone.utc):
            return _json_response(400, {'error': 'token_expired', 'message': 'Ссылка истекла. Запросите новую.'})

        cur.execute("UPDATE sso_action_tokens SET used_at = NOW() WHERE id = %s", (token_id,))
        cur.execute("UPDATE sso_users SET email_verified_at = NOW() WHERE id = %s", (user_id,))
    conn.commit()

    tokens = _issue_tokens(conn, user_id, ua, ip)
    return _json_response(200, tokens)


def _action_resend_verification(conn, body: dict) -> dict:
    email = (body.get('email') or '').strip().lower()
    if not EMAIL_RE.match(email):
        return _json_response(400, {'error': 'invalid_email'})

    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, full_name, email_verified_at FROM sso_users WHERE email = %s",
            (email,),
        )
        row = cur.fetchone()

    # Не раскрываем существование email
    if not row:
        return _json_response(200, {'ok': True, 'message': 'Если email зарегистрирован, мы отправили ссылку повторно.'})

    user_id, full_name, verified_at = row
    if verified_at is not None:
        return _json_response(200, {'ok': True, 'message': 'Email уже подтверждён, можете войти.'})

    raw_token = _create_verify_token(conn, user_id)
    sent = _send_verify_email(email, full_name or '', raw_token)
    return _json_response(200, {
        'ok': True,
        'email_sent': sent,
        'message': 'Если email зарегистрирован, мы отправили ссылку повторно.',
    })


# ============ OAuth: внешние провайдеры ============

def _http_post_form(url: str, data: dict, headers: dict = None) -> dict:
    """POST form-urlencoded → JSON. Возвращает разобранный ответ или поднимает Exception."""
    body = urllib.parse.urlencode(data).encode('utf-8')
    req_headers = {'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded'}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(url, data=body, headers=req_headers, method='POST')
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode('utf-8'))


def _http_get_json(url: str, headers: dict = None) -> dict:
    """GET → JSON."""
    req_headers = {'Accept': 'application/json'}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(url, headers=req_headers, method='GET')
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode('utf-8'))


def _oauth_provider_enabled(provider: str) -> bool:
    cfg = OAUTH_PROVIDERS.get(provider)
    if not cfg:
        return False
    return bool(os.environ.get(cfg['client_id_env']) and os.environ.get(cfg['client_secret_env']))


def _generate_pkce() -> tuple[str, str]:
    """Возвращает (code_verifier, code_challenge S256)."""
    verifier = secrets.token_urlsafe(64)[:128]
    digest = hashlib.sha256(verifier.encode('ascii')).digest()
    challenge = base64.urlsafe_b64encode(digest).rstrip(b'=').decode('ascii')
    return verifier, challenge


def _action_oauth_start(conn, params: dict, ip: str) -> dict:
    """Возвращает URL для редиректа на провайдера."""
    provider = (params.get('provider') or '').strip().lower()
    if provider not in OAUTH_PROVIDERS:
        return _json_response(400, {'error': 'unknown_provider'})
    if not _oauth_provider_enabled(provider):
        return _json_response(503, {'error': 'provider_disabled', 'message': f'Провайдер {provider} не настроен.'})

    cfg = OAUTH_PROVIDERS[provider]
    client_id = os.environ[cfg['client_id_env']]
    redirect_after = (params.get('redirect_after') or '/account').strip()[:512]

    raw_state = secrets.token_urlsafe(32)
    state_hash = hashlib.sha256(raw_state.encode()).hexdigest()
    code_verifier = None
    code_challenge = None
    if cfg.get('use_pkce'):
        code_verifier, code_challenge = _generate_pkce()

    expires_at = datetime.now(timezone.utc) + timedelta(seconds=OAUTH_STATE_TTL)
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO sso_oauth_states (state_hash, provider, code_verifier, redirect_after, ip, expires_at) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (state_hash, provider, code_verifier, redirect_after, ip[:64], expires_at),
        )
    conn.commit()

    qs = {
        'response_type': 'code',
        'client_id': client_id,
        'redirect_uri': OAUTH_REDIRECT_URI,
        'scope': cfg['scope'],
        'state': raw_state,
    }
    if code_challenge:
        qs['code_challenge'] = code_challenge
        qs['code_challenge_method'] = 'S256'
    if provider == 'yandex':
        qs['force_confirm'] = 'yes'  # всегда показывать выбор аккаунта
    if provider == 'google':
        qs['access_type'] = 'online'
        qs['prompt'] = 'select_account'

    authorize_url = f"{cfg['auth_url']}?{urllib.parse.urlencode(qs)}"
    return _json_response(200, {'authorize_url': authorize_url, 'provider': provider})


def _exchange_code(provider: str, code: str, code_verifier: str | None) -> dict:
    """Меняет authorization code на access_token у провайдера."""
    cfg = OAUTH_PROVIDERS[provider]
    client_id = os.environ[cfg['client_id_env']]
    client_secret = os.environ[cfg['client_secret_env']]
    data = {
        'grant_type': 'authorization_code',
        'code': code,
        'client_id': client_id,
        'client_secret': client_secret,
        'redirect_uri': OAUTH_REDIRECT_URI,
    }
    if code_verifier:
        data['code_verifier'] = code_verifier
    return _http_post_form(cfg['token_url'], data)


def _fetch_userinfo(provider: str, access_token: str) -> dict:
    """Запрашивает профиль пользователя у провайдера и нормализует к единой структуре:
    { provider_user_id, email, email_verified, full_name, avatar_url, raw }"""
    cfg = OAUTH_PROVIDERS[provider]
    headers = {'Authorization': f'Bearer {access_token}'}
    raw = _http_get_json(cfg['userinfo_url'], headers=headers)

    if provider == 'yandex':
        # https://yandex.ru/dev/id/doc/dg/api-id/reference/response.html
        email = (raw.get('default_email') or '').lower() or None
        emails = raw.get('emails') or []
        if not email and emails:
            email = str(emails[0]).lower()
        return {
            'provider_user_id': str(raw.get('id') or ''),
            'email': email,
            'email_verified': True,  # Яндекс отдаёт только верифицированные email
            'full_name': raw.get('real_name') or raw.get('display_name') or '',
            'avatar_url': f"https://avatars.yandex.net/get-yapic/{raw['default_avatar_id']}/islands-200" if raw.get('default_avatar_id') and not raw.get('is_avatar_empty') else None,
            'raw': raw,
        }

    if provider == 'google':
        # OpenID Connect userinfo
        return {
            'provider_user_id': str(raw.get('sub') or ''),
            'email': (raw.get('email') or '').lower() or None,
            'email_verified': bool(raw.get('email_verified')),
            'full_name': raw.get('name') or '',
            'avatar_url': raw.get('picture'),
            'raw': raw,
        }

    if provider == 'vk':
        # VK ID /oauth2/user_info: { user: {...} } или плоский объект
        u = raw.get('user') or raw
        full_name = ' '.join(filter(None, [u.get('first_name'), u.get('last_name')])) or ''
        return {
            'provider_user_id': str(u.get('user_id') or u.get('id') or ''),
            'email': (u.get('email') or '').lower() or None,
            'email_verified': bool(u.get('verified') or u.get('email')),
            'full_name': full_name,
            'avatar_url': u.get('avatar') or u.get('photo_200'),
            'raw': raw,
        }

    if provider == 'mailru':
        return {
            'provider_user_id': str(raw.get('id') or raw.get('email') or ''),
            'email': (raw.get('email') or '').lower() or None,
            'email_verified': True,  # Mail.ru OAuth отдаёт только верифицированные адреса
            'full_name': raw.get('name') or ' '.join(filter(None, [raw.get('first_name'), raw.get('last_name')])) or '',
            'avatar_url': raw.get('image'),
            'raw': raw,
        }

    return {'provider_user_id': '', 'email': None, 'email_verified': False, 'full_name': '', 'avatar_url': None, 'raw': raw}


def _action_oauth_callback(conn, body: dict, ua: str, ip: str) -> dict:
    """Принимает code + state от фронта, обменивает на токены и логинит/регистрирует."""
    code = (body.get('code') or '').strip()
    raw_state = (body.get('state') or '').strip()
    if not code or not raw_state:
        return _json_response(400, {'error': 'missing_code_or_state'})

    state_hash = hashlib.sha256(raw_state.encode()).hexdigest()
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, provider, code_verifier, redirect_after, expires_at, used_at "
            "FROM sso_oauth_states WHERE state_hash = %s",
            (state_hash,),
        )
        row = cur.fetchone()
        if not row:
            return _json_response(400, {'error': 'invalid_state'})
        state_id, provider, code_verifier, redirect_after, expires_at, used_at = row
        if used_at is not None:
            return _json_response(400, {'error': 'state_already_used'})
        if expires_at < datetime.now(timezone.utc):
            return _json_response(400, {'error': 'state_expired'})
        cur.execute("UPDATE sso_oauth_states SET used_at = NOW() WHERE id = %s", (state_id,))
    conn.commit()

    # Обмен code → access_token у провайдера
    try:
        token_resp = _exchange_code(provider, code, code_verifier)
    except Exception as e:
        print(f'[sso-auth] OAuth token exchange failed for {provider}: {e!r}')
        return _json_response(502, {'error': 'oauth_exchange_failed', 'message': str(e)[:200]})

    access_token = token_resp.get('access_token')
    if not access_token:
        return _json_response(502, {'error': 'no_access_token', 'detail': str(token_resp)[:300]})

    try:
        profile = _fetch_userinfo(provider, access_token)
    except Exception as e:
        print(f'[sso-auth] OAuth userinfo failed for {provider}: {e!r}')
        return _json_response(502, {'error': 'userinfo_failed', 'message': str(e)[:200]})

    provider_user_id = profile['provider_user_id']
    email = profile['email']
    if not provider_user_id:
        return _json_response(502, {'error': 'no_provider_user_id'})

    # 1) Ищем существующую identity для этого провайдера
    with conn.cursor() as cur:
        cur.execute(
            "SELECT user_id FROM sso_user_identities WHERE provider = %s AND provider_user_id = %s",
            (provider, provider_user_id),
        )
        existing = cur.fetchone()

    if existing:
        user_id = existing[0]
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE sso_user_identities SET last_login_at = NOW(), email = %s, raw_profile = %s "
                "WHERE provider = %s AND provider_user_id = %s",
                (email, json.dumps(profile['raw'], ensure_ascii=False), provider, provider_user_id),
            )
        conn.commit()
        tokens = _issue_tokens(conn, user_id, ua, ip)
        return _json_response(200, {**tokens, 'redirect_after': redirect_after})

    # 2) Identity нет, но есть email. Проверяем — есть ли пользователь с таким email?
    if email:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM sso_users WHERE email = %s", (email,))
            existing_user = cur.fetchone()
        if existing_user:
            # Конфликт: email уже занят паролевым аккаунтом. Блокируем.
            return _json_response(409, {
                'error': 'email_taken',
                'message': 'Аккаунт с таким email уже существует. Войдите паролем — в личном кабинете вы сможете привязать вход через ' + provider + '.',
                'email': email,
            })

    # 3) Регистрируем нового пользователя. Email может быть None (VK без email).
    if not email:
        # MVP: требуем email — иначе не сможем восстановить аккаунт. Просим юзера войти иначе.
        return _json_response(400, {
            'error': 'email_not_provided',
            'message': f'Провайдер {provider} не передал email. Войдите паролем или попробуйте другой способ входа.',
        })

    with conn.cursor() as cur:
        # Случайный пароль — пользователь сможет задать через "восстановление пароля"
        random_pwd = _hash_password(secrets.token_urlsafe(32))
        cur.execute(
            "INSERT INTO sso_users (email, password_hash, full_name, email_verified_at) "
            "VALUES (%s, %s, %s, NOW()) RETURNING id",
            (email, random_pwd, profile.get('full_name') or None),
        )
        user_id = cur.fetchone()[0]
        cur.execute("INSERT INTO sso_user_roles (user_id, role) VALUES (%s, 'student')", (user_id,))
        cur.execute(
            "INSERT INTO sso_user_identities (user_id, provider, provider_user_id, email, raw_profile) "
            "VALUES (%s, %s, %s, %s, %s)",
            (user_id, provider, provider_user_id, email, json.dumps(profile['raw'], ensure_ascii=False)),
        )
    conn.commit()

    tokens = _issue_tokens(conn, user_id, ua, ip)
    return _json_response(201, {**tokens, 'redirect_after': redirect_after})


def _action_oauth_providers(conn) -> dict:
    """Возвращает список настроенных OAuth-провайдеров для фронта."""
    enabled = [p for p in OAUTH_PROVIDERS if _oauth_provider_enabled(p)]
    # VK ID SDK включён, если есть OAUTH_VK_CLIENT_ID (SDK не требует client_secret).
    vk_sdk_enabled = bool(os.environ.get('OAUTH_VK_CLIENT_ID'))
    return _json_response(200, {
        'providers': enabled,
        'vk_sdk': {
            'enabled': vk_sdk_enabled,
            'app_id': os.environ.get('OAUTH_VK_CLIENT_ID') if vk_sdk_enabled else None,
        },
    })


def _login_or_register_by_identity(conn, provider: str, profile: dict, ua: str, ip: str, redirect_after: str) -> dict:
    """Общая логика: найти identity, если нет — создать пользователя. Конфликт email → 409."""
    provider_user_id = profile.get('provider_user_id')
    email = profile.get('email')
    if not provider_user_id:
        return _json_response(502, {'error': 'no_provider_user_id'})

    with conn.cursor() as cur:
        cur.execute(
            "SELECT user_id FROM sso_user_identities WHERE provider = %s AND provider_user_id = %s",
            (provider, provider_user_id),
        )
        existing = cur.fetchone()

    if existing:
        user_id = existing[0]
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE sso_user_identities SET last_login_at = NOW(), email = %s, raw_profile = %s "
                "WHERE provider = %s AND provider_user_id = %s",
                (email, json.dumps(profile.get('raw') or {}, ensure_ascii=False), provider, provider_user_id),
            )
        conn.commit()
        tokens = _issue_tokens(conn, user_id, ua, ip)
        return _json_response(200, {**tokens, 'redirect_after': redirect_after})

    if email:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM sso_users WHERE email = %s", (email,))
            existing_user = cur.fetchone()
        if existing_user:
            return _json_response(409, {
                'error': 'email_taken',
                'message': f'Аккаунт с таким email уже существует. Войдите паролем — в личном кабинете вы сможете привязать вход через {provider}.',
                'email': email,
            })

    if not email:
        return _json_response(400, {
            'error': 'email_not_provided',
            'message': f'Провайдер {provider} не передал email. Войдите паролем или попробуйте другой способ входа.',
        })

    with conn.cursor() as cur:
        random_pwd = _hash_password(secrets.token_urlsafe(32))
        cur.execute(
            "INSERT INTO sso_users (email, password_hash, full_name, email_verified_at) "
            "VALUES (%s, %s, %s, NOW()) RETURNING id",
            (email, random_pwd, profile.get('full_name') or None),
        )
        user_id = cur.fetchone()[0]
        cur.execute("INSERT INTO sso_user_roles (user_id, role) VALUES (%s, 'student')", (user_id,))
        cur.execute(
            "INSERT INTO sso_user_identities (user_id, provider, provider_user_id, email, raw_profile) "
            "VALUES (%s, %s, %s, %s, %s)",
            (user_id, provider, provider_user_id, email, json.dumps(profile.get('raw') or {}, ensure_ascii=False)),
        )
    conn.commit()
    tokens = _issue_tokens(conn, user_id, ua, ip)
    return _json_response(201, {**tokens, 'redirect_after': redirect_after})


def _action_oauth_vk_sdk(conn, body: dict, ua: str, ip: str) -> dict:
    """Принимает access_token (или id_token) от VK ID OneTap SDK,
    запрашивает профиль и логинит/регистрирует пользователя.
    Дополнительно поддерживает sub_provider=mail_ru|ok_ru (VK ID отдаёт через них).
    """
    access_token = (body.get('access_token') or '').strip()
    sub_provider = (body.get('sub_provider') or 'vk').strip().lower()
    redirect_after = (body.get('redirect_after') or '/account').strip()[:512]
    raw_user = body.get('user') or {}

    if not access_token:
        return _json_response(400, {'error': 'missing_access_token'})

    # VK ID v2 user_info endpoint
    try:
        resp = _http_post_form(
            'https://id.vk.com/oauth2/user_info',
            {
                'client_id': os.environ.get('OAUTH_VK_CLIENT_ID', ''),
                'access_token': access_token,
            },
        )
    except Exception as e:
        print(f'[sso-auth] VK SDK user_info failed: {e!r}')
        # Если не удалось получить — попробуем использовать данные, которые SDK прислал в payload
        resp = {'user': raw_user}

    u = resp.get('user') or raw_user or {}
    if not u:
        return _json_response(502, {'error': 'no_user_data'})

    full_name = ' '.join(filter(None, [u.get('first_name'), u.get('last_name')])) or ''
    email = (u.get('email') or '').lower() or None
    provider_user_id = str(u.get('user_id') or u.get('id') or '')

    # Определяем фактический провайдер: vk / mailru / ok
    provider_map = {
        'mail_ru': 'mailru',
        'mailru': 'mailru',
        'ok_ru': 'ok',
        'ok': 'ok',
        'vk': 'vk',
    }
    provider = provider_map.get(sub_provider, 'vk')

    profile = {
        'provider_user_id': provider_user_id,
        'email': email,
        'email_verified': True,
        'full_name': full_name,
        'avatar_url': u.get('avatar') or u.get('photo_200'),
        'raw': u,
    }

    return _login_or_register_by_identity(conn, provider, profile, ua, ip, redirect_after)


# ============ Handler ============

def handler(event: dict, context) -> dict:
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = (params.get('action') or '').strip()

    if not action:
        return _json_response(400, {'error': 'missing_action', 'message': 'Укажите ?action=register|login|refresh|userinfo|logout|verify-email|resend-verification|oauth-providers|oauth-start|oauth-callback'})

    try:
        body_raw = event.get('body') or '{}'
        if event.get('isBase64Encoded'):
            body_raw = base64.b64decode(body_raw).decode('utf-8')
        body = json.loads(body_raw) if body_raw.strip() else {}
    except Exception:
        return _json_response(400, {'error': 'invalid_json'})

    ua = _user_agent(event)
    ip = _client_ip(event)

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        if action == 'register' and method == 'POST':
            return _action_register(conn, body, ua, ip)
        if action == 'login' and method == 'POST':
            return _action_login(conn, body, ua, ip)
        if action == 'refresh' and method == 'POST':
            return _action_refresh(conn, body, ua, ip)
        if action == 'userinfo' and method == 'GET':
            return _action_userinfo(conn, event)
        if action == 'logout' and method == 'POST':
            return _action_logout(conn, body)
        if action == 'verify-email' and method == 'POST':
            return _action_verify_email(conn, body, ua, ip)
        if action == 'resend-verification' and method == 'POST':
            return _action_resend_verification(conn, body)
        if action == 'oauth-providers' and method == 'GET':
            return _action_oauth_providers(conn)
        if action == 'oauth-start' and method == 'GET':
            return _action_oauth_start(conn, params, ip)
        if action == 'oauth-callback' and method == 'POST':
            return _action_oauth_callback(conn, body, ua, ip)
        if action == 'oauth-vk-sdk' and method == 'POST':
            return _action_oauth_vk_sdk(conn, body, ua, ip)
        return _json_response(404, {'error': 'unknown_action'})
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(f'[sso-auth] error type={type(e).__name__} msg={e!r}')
        print(f'[sso-auth] traceback: {tb}')
        return _json_response(500, {
            'error': 'internal_error',
            'message': f'{type(e).__name__}: {e}'[:300],
        })
    finally:
        conn.close()