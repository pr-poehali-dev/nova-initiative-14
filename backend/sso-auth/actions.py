"""
Action-handlers паролевой авторизации:
  register / login / refresh / userinfo / logout
  verify-email / resend-verification

OAuth-actions вынесены в oauth.py.
"""
import hashlib
from datetime import datetime, timezone

from config import EMAIL_RE
from crypto import hash_password, verify_jwt, verify_password
from db_helpers import (
    check_rate_limit,
    create_verify_token,
    get_user_payload,
    issue_tokens,
    json_response,
    log_attempt,
)
from mailer import send_verify_email


def action_register(conn, body: dict, ua: str, ip: str) -> dict:
    """
    Регистрация по email + паролю.
    Создаёт пользователя с ролью 'student', отправляет письмо с verify-ссылкой.
    Логин до подтверждения email невозможен.
    """
    email = (body.get('email') or '').strip().lower()
    password = body.get('password') or ''
    full_name = (body.get('full_name') or '').strip()[:200]

    if not EMAIL_RE.match(email):
        return json_response(400, {'error': 'invalid_email', 'message': 'Некорректный email'})
    if len(password) < 8:
        return json_response(400, {'error': 'weak_password', 'message': 'Пароль должен быть не короче 8 символов'})
    if len(password) > 200:
        return json_response(400, {'error': 'long_password', 'message': 'Пароль слишком длинный'})

    with conn.cursor() as cur:
        cur.execute("SELECT id FROM sso_users WHERE email = %s", (email,))
        if cur.fetchone():
            return json_response(409, {'error': 'email_taken', 'message': 'Пользователь с таким email уже зарегистрирован'})

        password_hash = hash_password(password)
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

    raw_token = create_verify_token(conn, user_id)
    sent = send_verify_email(email, full_name, raw_token)

    return json_response(201, {
        'ok': True,
        'email_sent': sent,
        'email': email,
        'message': 'Аккаунт создан. Подтвердите email — мы отправили ссылку на ваш адрес.',
    })


def action_login(conn, body: dict, ua: str, ip: str) -> dict:
    """
    Логин email + пароль.
    Защита: rate limit (10 ошибок/IP/10мин), требование email_verified.
    """
    email = (body.get('email') or '').strip().lower()
    password = body.get('password') or ''

    if not email or not password:
        return json_response(400, {'error': 'missing_credentials', 'message': 'Введите email и пароль'})

    if not check_rate_limit(conn, ip):
        return json_response(429, {'error': 'too_many_attempts', 'message': 'Слишком много попыток. Попробуйте через 10 минут.'})

    with conn.cursor() as cur:
        cur.execute("SELECT id, password_hash, is_active, email_verified_at FROM sso_users WHERE email = %s", (email,))
        row = cur.fetchone()

    if not row or not verify_password(password, row[1]):
        log_attempt(conn, email, ip, False, ua)
        return json_response(401, {'error': 'invalid_credentials', 'message': 'Неверный email или пароль'})

    user_id, _, is_active, verified_at = row
    if not is_active:
        log_attempt(conn, email, ip, False, ua)
        return json_response(403, {'error': 'account_disabled', 'message': 'Аккаунт деактивирован'})

    if verified_at is None:
        log_attempt(conn, email, ip, False, ua)
        return json_response(403, {
            'error': 'email_not_verified',
            'message': 'Подтвердите email — мы отправили вам ссылку. Если письма нет, нажмите «отправить заново».',
            'email': email,
        })

    log_attempt(conn, email, ip, True, ua)
    return json_response(200, issue_tokens(conn, user_id, ua, ip))


def action_refresh(conn, body: dict, ua: str, ip: str) -> dict:
    """
    Ротация refresh-токена: старый отзывается, выдаётся новая пара.
    Защита от повторного использования: revoked_at + expires_at.
    """
    raw = (body.get('refresh_token') or '').strip()
    if not raw:
        return json_response(400, {'error': 'missing_refresh', 'message': 'Нет refresh-токена'})
    h = hashlib.sha256(raw.encode()).hexdigest()

    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, user_id, expires_at, revoked_at, client_id "
            "FROM sso_refresh_tokens WHERE token_hash = %s",
            (h,),
        )
        row = cur.fetchone()
        if not row:
            return json_response(401, {'error': 'invalid_refresh'})
        token_id, user_id, expires_at, revoked_at, client_id = row
        if revoked_at is not None:
            return json_response(401, {'error': 'token_revoked'})
        if expires_at < datetime.now(timezone.utc):
            return json_response(401, {'error': 'token_expired'})

        cur.execute("UPDATE sso_refresh_tokens SET revoked_at = NOW() WHERE id = %s", (token_id,))
    conn.commit()

    return json_response(200, issue_tokens(conn, user_id, ua, ip, client_id=client_id))


def action_userinfo(conn, event: dict) -> dict:
    """Профиль пользователя по access-токену (Bearer). 401 если токен невалиден."""
    headers = event.get('headers') or {}
    auth = headers.get('X-Authorization') or headers.get('Authorization') or ''
    if not auth.startswith('Bearer '):
        return json_response(401, {'error': 'missing_token'})
    token = auth[7:].strip()
    payload = verify_jwt(token)
    if not payload:
        return json_response(401, {'error': 'invalid_token'})
    user = get_user_payload(conn, int(payload['sub']))
    if not user:
        return json_response(404, {'error': 'user_not_found'})
    return json_response(200, {'user': user})


def action_logout(conn, body: dict) -> dict:
    """Отзывает refresh-токен. Access-токен остаётся действителен до exp (≤1ч)."""
    raw = (body.get('refresh_token') or '').strip()
    if not raw:
        return json_response(400, {'error': 'missing_refresh'})
    h = hashlib.sha256(raw.encode()).hexdigest()
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE sso_refresh_tokens SET revoked_at = NOW() "
            "WHERE token_hash = %s AND revoked_at IS NULL",
            (h,),
        )
    conn.commit()
    return json_response(200, {'ok': True})


def action_verify_email(conn, body: dict, ua: str, ip: str) -> dict:
    """
    Подтверждение email по одноразовому токену.
    После успеха автоматически логинит пользователя (выпускает токены).
    """
    raw = (body.get('token') or '').strip()
    if not raw:
        return json_response(400, {'error': 'missing_token'})
    h = hashlib.sha256(raw.encode()).hexdigest()

    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, user_id, expires_at, used_at FROM sso_action_tokens "
            "WHERE token_hash = %s AND purpose = 'verify_email'",
            (h,),
        )
        row = cur.fetchone()
        if not row:
            return json_response(400, {'error': 'invalid_token', 'message': 'Ссылка недействительна или уже использована.'})
        token_id, user_id, expires_at, used_at = row
        if used_at is not None:
            return json_response(400, {'error': 'already_used', 'message': 'Эта ссылка уже была использована.'})
        if expires_at < datetime.now(timezone.utc):
            return json_response(400, {'error': 'token_expired', 'message': 'Ссылка истекла. Запросите новую.'})

        cur.execute("UPDATE sso_action_tokens SET used_at = NOW() WHERE id = %s", (token_id,))
        cur.execute("UPDATE sso_users SET email_verified_at = NOW() WHERE id = %s", (user_id,))
    conn.commit()

    return json_response(200, issue_tokens(conn, user_id, ua, ip))


def action_resend_verification(conn, body: dict) -> dict:
    """
    Повторная отправка письма подтверждения.
    Не раскрываем существование email — всегда возвращаем 200 с обтекаемым сообщением.
    """
    email = (body.get('email') or '').strip().lower()
    if not EMAIL_RE.match(email):
        return json_response(400, {'error': 'invalid_email'})

    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, full_name, email_verified_at FROM sso_users WHERE email = %s",
            (email,),
        )
        row = cur.fetchone()

    if not row:
        return json_response(200, {'ok': True, 'message': 'Если email зарегистрирован, мы отправили ссылку повторно.'})

    user_id, full_name, verified_at = row
    if verified_at is not None:
        return json_response(200, {'ok': True, 'message': 'Email уже подтверждён, можете войти.'})

    raw_token = create_verify_token(conn, user_id)
    sent = send_verify_email(email, full_name or '', raw_token)
    return json_response(200, {
        'ok': True,
        'email_sent': sent,
        'message': 'Если email зарегистрирован, мы отправили ссылку повторно.',
    })
