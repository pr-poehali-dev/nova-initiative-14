"""
Action-handlers паролевой авторизации:
  register / login / refresh / userinfo / logout
  verify-email / resend-verification
  request-reset / reset-password

OAuth-actions вынесены в oauth.py.
"""
import hashlib
import secrets as _secrets
from datetime import datetime, timedelta, timezone

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
from mailer import send_verify_email, send_reset_email


def action_register(conn, body: dict, ua: str, ip: str) -> dict:
    """
    Регистрация по email + паролю.
    Создаёт пользователя с ролью 'student', отправляет письмо с verify-ссылкой.
    Логин до подтверждения email невозможен.

    Дополнительные поля:
      - ref_code: реф-код пригласившего (привязывается referred_by_user_id)
      - marketing_consent: согласие на маркетинговую рассылку
      - join_waitlist: записать в лист ожидания CAE
    После создания юзера начисляются стартовые баллы и ачивки.
    """
    email = (body.get('email') or '').strip().lower()
    password = body.get('password') or ''
    full_name = (body.get('full_name') or '').strip()[:200]
    ref_code = (body.get('ref_code') or '').strip().upper()[:16]
    marketing_consent = bool(body.get('marketing_consent'))
    join_waitlist = bool(body.get('join_waitlist'))

    # Источник ПЕРВОГО касания (атрибуция регистрации). Передаётся фронтом из
    # localStorage (lib/attribution.ts). Если поля нет — остаётся NULL.
    attr = body.get('attribution') or {}
    sg_type = (attr.get('sourceType') or '')[:24] or None
    sg_label = (attr.get('sourceLabel') or '')[:160] or None
    sg_landing = (attr.get('landingPath') or '')[:255] or None
    sg_utm_source = (attr.get('utmSource') or '')[:120] or None
    sg_utm_campaign = (attr.get('utmCampaign') or '')[:120] or None

    if not EMAIL_RE.match(email):
        return json_response(400, {'error': 'invalid_email', 'message': 'Некорректный email'})
    if len(password) < 8:
        return json_response(400, {'error': 'weak_password', 'message': 'Пароль должен быть не короче 8 символов'})
    if len(password) > 200:
        return json_response(400, {'error': 'long_password', 'message': 'Пароль слишком длинный'})

    # Определяем реферера по коду (если задан)
    referrer_id = None
    if ref_code:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM sso_users WHERE referral_code = %s",
                (ref_code,),
            )
            r = cur.fetchone()
            if r:
                referrer_id = int(r[0])

    with conn.cursor() as cur:
        cur.execute("SELECT id FROM sso_users WHERE email = %s", (email,))
        if cur.fetchone():
            return json_response(409, {'error': 'email_taken', 'message': 'Пользователь с таким email уже зарегистрирован'})

        password_hash = hash_password(password)
        cur.execute(
            "INSERT INTO sso_users "
            "(email, password_hash, full_name, referred_by_user_id, marketing_consent, "
            " signup_source_type, signup_source_label, signup_landing_path, "
            " signup_utm_source, signup_utm_campaign) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (email, password_hash, full_name or None, referrer_id, marketing_consent,
             sg_type, sg_label, sg_landing, sg_utm_source, sg_utm_campaign),
        )
        user_id = cur.fetchone()[0]
        cur.execute(
            "INSERT INTO sso_user_roles (user_id, role) VALUES (%s, 'student')",
            (user_id,),
        )

        # Подключаем к листу ожидания (если согласился)
        if join_waitlist:
            cur.execute(
                "INSERT INTO cae_waitlist (email, full_name, user_id, referral_source) "
                "VALUES (%s, %s, %s, %s)",
                (email, full_name or None, user_id,
                 ('ref:' + ref_code) if ref_code else 'register_form'),
            )

        # Стартовая запись очков
        cur.execute(
            "INSERT INTO user_points (user_id, total_points) VALUES (%s, 0) "
            "ON CONFLICT (user_id) DO NOTHING",
            (user_id,),
        )

        # Ачивка «Ранняя пташка» — без очков, для коллекции
        cur.execute(
            "INSERT INTO user_achievements (user_id, achievement_code) "
            "VALUES (%s, 'early_bird') ON CONFLICT (user_id, achievement_code) DO NOTHING",
            (user_id,),
        )

        # +10 баллов новичку (за «Раннюю пташку»)
        cur.execute(
            "INSERT INTO user_points_log "
            "(user_id, points, reason, note, dedup_key) "
            "VALUES (%s, 10, 'signup_bonus', 'Регистрация', %s) "
            "ON CONFLICT (dedup_key) DO NOTHING",
            (user_id, f'signup:{user_id}'),
        )
        cur.execute(
            "UPDATE user_points SET total_points = total_points + 10, updated_at = now() "
            "WHERE user_id = %s",
            (user_id,),
        )

        # +10 баллов рефереру за приведённого друга
        if referrer_id:
            cur.execute(
                "INSERT INTO user_points (user_id, total_points) VALUES (%s, 0) "
                "ON CONFLICT (user_id) DO NOTHING",
                (referrer_id,),
            )
            cur.execute(
                "INSERT INTO user_points_log "
                "(user_id, points, reason, ref_user_id, note, dedup_key) "
                "VALUES (%s, 10, 'referral_signup', %s, %s, %s) "
                "ON CONFLICT (dedup_key) DO NOTHING",
                (referrer_id, user_id, f'Реф-регистрация #{user_id}',
                 f'ref_signup:{referrer_id}:{user_id}'),
            )
            cur.execute(
                "UPDATE user_points SET total_points = total_points + 10, "
                "referrals_count = referrals_count + 1, updated_at = now() "
                "WHERE user_id = %s",
                (referrer_id,),
            )

            # Ачивка «Первое приглашение» рефереру — выдаём по факту регистрации
            # первого реферала, не дожидаясь его «активности» (расчёта).
            # Юзер ожидает ачивку как только друг зарегистрировался по его коду.
            # ON CONFLICT гарантирует идемпотентность для повторных рефералов.
            cur.execute(
                "INSERT INTO user_achievements (user_id, achievement_code) "
                "VALUES (%s, 'first_invite') "
                "ON CONFLICT (user_id, achievement_code) DO NOTHING "
                "RETURNING id",
                (referrer_id,),
            )
            if cur.fetchone():
                # Ачивка реально выдана впервые — начисляем её очки (20)
                cur.execute(
                    "SELECT points FROM achievement_types WHERE code = 'first_invite'",
                )
                pts_row = cur.fetchone()
                pts = int(pts_row[0]) if pts_row else 0
                if pts > 0:
                    cur.execute(
                        "INSERT INTO user_points_log "
                        "(user_id, points, reason, note, dedup_key) "
                        "VALUES (%s, %s, 'achievement:first_invite', "
                        "'Ачивка: Первое приглашение', %s) "
                        "ON CONFLICT (dedup_key) DO NOTHING",
                        (referrer_id, pts, f'ach:{referrer_id}:first_invite'),
                    )
                    cur.execute(
                        "UPDATE user_points SET total_points = total_points + %s, "
                        "updated_at = now() WHERE user_id = %s",
                        (pts, referrer_id),
                    )
    conn.commit()

    raw_token = create_verify_token(conn, user_id)
    sent = send_verify_email(email, full_name, raw_token)

    return json_response(201, {
        'ok': True,
        'email_sent': sent,
        'email': email,
        'referrer_credited': bool(referrer_id),
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


def action_request_reset(conn, body: dict) -> dict:
    """
    Запрос сброса пароля — отправляет письмо со ссылкой /reset-password?token=...
    Намеренно всегда 200: не раскрываем, существует ли email.
    Rate-limit: один токен за 10 минут для одного email.
    """
    email = (body.get('email') or '').strip().lower()
    if not EMAIL_RE.match(email):
        return json_response(400, {'error': 'invalid_email'})

    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, full_name, email_verified_at, is_active FROM sso_users WHERE email = %s",
            (email,),
        )
        row = cur.fetchone()

    if not row:
        return json_response(200, {'ok': True, 'message': 'Если email зарегистрирован, мы отправили ссылку.'})

    user_id, full_name, verified_at, is_active = row
    if not is_active:
        return json_response(200, {'ok': True, 'message': 'Если email зарегистрирован, мы отправили ссылку.'})

    # Дедупликация: если уже есть свежий неиспользованный токен — не плодим новые
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM sso_action_tokens "
            "WHERE user_id = %s AND purpose = 'reset_password' AND used_at IS NULL "
            "AND expires_at > now() AND created_at > now() - INTERVAL '10 minutes'",
            (user_id,),
        )
        if cur.fetchone():
            return json_response(200, {
                'ok': True,
                'message': 'Письмо уже отправлено. Если не пришло — подождите 10 минут и попробуйте снова.',
            })

    raw = _secrets.token_urlsafe(32)
    h = hashlib.sha256(raw.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=2)
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO sso_action_tokens (user_id, purpose, token_hash, expires_at) "
            "VALUES (%s, 'reset_password', %s, %s)",
            (user_id, h, expires_at),
        )
    conn.commit()

    sent = send_reset_email(email, full_name or '', raw)
    return json_response(200, {'ok': True, 'email_sent': sent,
                               'message': 'Если email зарегистрирован, мы отправили ссылку.'})


def action_reset_password(conn, body: dict, ua: str, ip: str) -> dict:
    """
    Установка нового пароля по одноразовому токену из письма.
    После успеха токен помечается использованным и пользователь автоматически логинится.
    """
    raw = (body.get('token') or '').strip()
    new_password = body.get('password') or ''

    if not raw:
        return json_response(400, {'error': 'missing_token'})
    if len(new_password) < 8:
        return json_response(400, {'error': 'weak_password',
                                   'message': 'Пароль должен быть не короче 8 символов'})
    if len(new_password) > 200:
        return json_response(400, {'error': 'long_password'})

    h = hashlib.sha256(raw.encode()).hexdigest()
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, user_id, expires_at, used_at FROM sso_action_tokens "
            "WHERE token_hash = %s AND purpose = 'reset_password'",
            (h,),
        )
        row = cur.fetchone()

    if not row:
        return json_response(400, {'error': 'invalid_token',
                                   'message': 'Ссылка недействительна или уже использована.'})

    token_id, user_id, expires_at, used_at = row
    if used_at is not None:
        return json_response(400, {'error': 'already_used',
                                   'message': 'Эта ссылка уже была использована.'})
    if expires_at < datetime.now(timezone.utc):
        return json_response(400, {'error': 'token_expired',
                                   'message': 'Ссылка истекла. Запросите новую.'})

    new_hash = hash_password(new_password)
    with conn.cursor() as cur:
        cur.execute("UPDATE sso_action_tokens SET used_at = NOW() WHERE id = %s", (token_id,))
        cur.execute("UPDATE sso_users SET password_hash = %s WHERE id = %s", (new_hash, user_id))
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