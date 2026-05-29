"""
OAuth 2.0/2.1 Authorization Code Flow + VK ID OneTap SDK.

Поддерживаемые провайдеры: yandex, vk (PKCE), google, mailru. Единая логика:
  1. /oauth-start  → создаёт state в БД, возвращает authorize_url
  2. редирект пользователя → провайдер
  3. /oauth-callback ← код от провайдера → меняем на access_token →
     запрашиваем userinfo → нормализуем → login_or_register_by_identity

Конфликт email: если на email уже есть паролевой аккаунт, возвращаем 409,
чтобы пользователь сначала вошёл паролем и потом привязал identity.
VK SDK action_oauth_vk_sdk дополнительно поддерживает sub_provider=mail_ru/ok_ru.
"""
import hashlib
import json
import os
import secrets
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

from config import (
    OAUTH_PROVIDERS,
    OAUTH_REDIRECT_URI,
    OAUTH_STATE_TTL,
)
from crypto import generate_pkce, hash_password
from db_helpers import issue_tokens, json_response


# === HTTP-помощники ===

def http_post_form(url: str, data: dict, headers: dict | None = None) -> dict:
    """POST form-urlencoded → JSON. Поднимает Exception при сетевой ошибке."""
    body = urllib.parse.urlencode(data).encode('utf-8')
    req_headers = {'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded'}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(url, data=body, headers=req_headers, method='POST')
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode('utf-8'))


def http_get_json(url: str, headers: dict | None = None) -> dict:
    """GET → JSON."""
    req_headers = {'Accept': 'application/json'}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(url, headers=req_headers, method='GET')
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode('utf-8'))


def oauth_provider_enabled(provider: str) -> bool:
    """Провайдер настроен, если есть и client_id, и client_secret в ENV."""
    cfg = OAUTH_PROVIDERS.get(provider)
    if not cfg:
        return False
    return bool(os.environ.get(cfg['client_id_env']) and os.environ.get(cfg['client_secret_env']))


# === Обмен code → token и нормализация userinfo ===

def exchange_code(provider: str, code: str, code_verifier: str | None) -> dict:
    """Меняет authorization code на access_token у провайдера (form-urlencoded)."""
    cfg = OAUTH_PROVIDERS[provider]
    data = {
        'grant_type': 'authorization_code',
        'code': code,
        'client_id': os.environ[cfg['client_id_env']],
        'client_secret': os.environ[cfg['client_secret_env']],
        'redirect_uri': OAUTH_REDIRECT_URI,
    }
    if code_verifier:
        data['code_verifier'] = code_verifier
    return http_post_form(cfg['token_url'], data)


def fetch_userinfo(provider: str, access_token: str) -> dict:
    """
    Запрашивает профиль у провайдера и приводит к единой структуре:
      { provider_user_id, email, email_verified, full_name, avatar_url, raw }
    """
    cfg = OAUTH_PROVIDERS[provider]
    raw = http_get_json(cfg['userinfo_url'], headers={'Authorization': f'Bearer {access_token}'})

    if provider == 'yandex':
        # yandex.ru/dev/id/doc/dg/api-id/reference/response.html
        email = (raw.get('default_email') or '').lower() or None
        emails = raw.get('emails') or []
        if not email and emails:
            email = str(emails[0]).lower()
        avatar = (
            f"https://avatars.yandex.net/get-yapic/{raw['default_avatar_id']}/islands-200"
            if raw.get('default_avatar_id') and not raw.get('is_avatar_empty')
            else None
        )
        return {
            'provider_user_id': str(raw.get('id') or ''),
            'email': email,
            'email_verified': True,  # Яндекс отдаёт только верифицированные email
            'full_name': raw.get('real_name') or raw.get('display_name') or '',
            'avatar_url': avatar,
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
            'full_name': raw.get('name')
            or ' '.join(filter(None, [raw.get('first_name'), raw.get('last_name')]))
            or '',
            'avatar_url': raw.get('image'),
            'raw': raw,
        }

    return {
        'provider_user_id': '', 'email': None, 'email_verified': False,
        'full_name': '', 'avatar_url': None, 'raw': raw,
    }


# === Общая логика login-or-register ===

def login_or_register_by_identity(
    conn, provider: str, profile: dict, ua: str, ip: str, redirect_after: str
) -> dict:
    """
    1) Если identity (provider+provider_user_id) уже есть → логин, обновить last_login_at.
    2) Если email уже занят паролевым аккаунтом → 409 (нужно сначала войти паролем
       и привязать identity в личном кабинете).
    3) Если email отсутствует → 400 (не сможем восстановить аккаунт).
    4) Иначе → новый пользователь + identity + role 'student' + сразу email_verified.
    """
    provider_user_id = profile.get('provider_user_id')
    email = profile.get('email')
    if not provider_user_id:
        return json_response(502, {'error': 'no_provider_user_id'})

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
        tokens = issue_tokens(conn, user_id, ua, ip)
        return json_response(200, {**tokens, 'redirect_after': redirect_after})

    email_verified = bool(profile.get('email_verified'))

    if email:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM sso_users WHERE email = %s", (email,))
            existing_user = cur.fetchone()
        if existing_user:
            existing_uid = existing_user[0]
            # Авто-привязка: провайдер подтвердил владение email (email_verified),
            # значит это тот же человек — безопасно привязать identity и войти.
            if email_verified:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO sso_user_identities "
                        "(user_id, provider, provider_user_id, email, raw_profile) "
                        "VALUES (%s, %s, %s, %s, %s) "
                        "ON CONFLICT (provider, provider_user_id) DO UPDATE "
                        "SET last_login_at = NOW(), email = EXCLUDED.email, "
                        "raw_profile = EXCLUDED.raw_profile",
                        (existing_uid, provider, provider_user_id, email,
                         json.dumps(profile.get('raw') or {}, ensure_ascii=False)),
                    )
                    # Если email ещё не был подтверждён в аккаунте — подтверждаем.
                    cur.execute(
                        "UPDATE sso_users SET email_verified_at = COALESCE(email_verified_at, NOW()) "
                        "WHERE id = %s",
                        (existing_uid,),
                    )
                conn.commit()
                tokens = issue_tokens(conn, existing_uid, ua, ip)
                return json_response(200, {**tokens, 'redirect_after': redirect_after})

            # Email не верифицирован провайдером — требуем вход паролем.
            return json_response(409, {
                'error': 'email_taken',
                'message': f'Аккаунт с таким email уже существует. Войдите паролем — в личном кабинете вы сможете привязать вход через {provider}.',
                'email': email,
            })

    if not email:
        return json_response(400, {
            'error': 'email_not_provided',
            'message': f'Провайдер {provider} не передал email. Войдите паролем или попробуйте другой способ входа.',
        })

    with conn.cursor() as cur:
        # Случайный пароль — пользователь сможет задать через «восстановление пароля».
        random_pwd = hash_password(secrets.token_urlsafe(32))
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
    tokens = issue_tokens(conn, user_id, ua, ip)
    return json_response(201, {**tokens, 'redirect_after': redirect_after})


# === Action-handlers ===

def action_oauth_providers(conn) -> dict:
    """Список настроенных провайдеров для фронта + признак VK SDK."""
    enabled = [p for p in OAUTH_PROVIDERS if oauth_provider_enabled(p)]
    # VK ID SDK включён, если есть OAUTH_VK_CLIENT_ID (SDK не требует client_secret).
    vk_sdk_enabled = bool(os.environ.get('OAUTH_VK_CLIENT_ID'))
    return json_response(200, {
        'providers': enabled,
        'vk_sdk': {
            'enabled': vk_sdk_enabled,
            'app_id': os.environ.get('OAUTH_VK_CLIENT_ID') if vk_sdk_enabled else None,
        },
    })


def action_oauth_start(conn, params: dict, ip: str) -> dict:
    """
    Подготавливает Authorization URL: создаёт одноразовый state (10 мин),
    для VK ID — PKCE pair. Возвращает authorize_url для редиректа.
    """
    provider = (params.get('provider') or '').strip().lower()
    if provider not in OAUTH_PROVIDERS:
        return json_response(400, {'error': 'unknown_provider'})
    if not oauth_provider_enabled(provider):
        return json_response(503, {'error': 'provider_disabled', 'message': f'Провайдер {provider} не настроен.'})

    cfg = OAUTH_PROVIDERS[provider]
    client_id = os.environ[cfg['client_id_env']]
    redirect_after = (params.get('redirect_after') or '/account').strip()[:512]

    raw_state = secrets.token_urlsafe(32)
    state_hash = hashlib.sha256(raw_state.encode()).hexdigest()
    code_verifier = None
    code_challenge = None
    if cfg.get('use_pkce'):
        code_verifier, code_challenge = generate_pkce()

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
        qs['force_confirm'] = 'yes'           # всегда показывать выбор аккаунта
    if provider == 'google':
        qs['access_type'] = 'online'
        qs['prompt'] = 'select_account'

    authorize_url = f"{cfg['auth_url']}?{urllib.parse.urlencode(qs)}"
    return json_response(200, {'authorize_url': authorize_url, 'provider': provider})


def action_oauth_callback(conn, body: dict, ua: str, ip: str) -> dict:
    """
    Принимает code + state от фронта, валидирует state (TTL, одноразовость),
    обменивает на токены, запрашивает userinfo и логинит/регистрирует.
    """
    code = (body.get('code') or '').strip()
    raw_state = (body.get('state') or '').strip()
    if not code or not raw_state:
        return json_response(400, {'error': 'missing_code_or_state'})

    state_hash = hashlib.sha256(raw_state.encode()).hexdigest()
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, provider, code_verifier, redirect_after, expires_at, used_at "
            "FROM sso_oauth_states WHERE state_hash = %s",
            (state_hash,),
        )
        row = cur.fetchone()
        if not row:
            return json_response(400, {'error': 'invalid_state'})
        state_id, provider, code_verifier, redirect_after, expires_at, used_at = row
        if used_at is not None:
            return json_response(400, {'error': 'state_already_used'})
        if expires_at < datetime.now(timezone.utc):
            return json_response(400, {'error': 'state_expired'})
        cur.execute("UPDATE sso_oauth_states SET used_at = NOW() WHERE id = %s", (state_id,))
    conn.commit()

    try:
        token_resp = exchange_code(provider, code, code_verifier)
    except Exception as e:
        print(f'[sso-auth] OAuth token exchange failed for {provider}: {e!r}')
        return json_response(502, {'error': 'oauth_exchange_failed', 'message': str(e)[:200]})

    access_token = token_resp.get('access_token')
    if not access_token:
        return json_response(502, {'error': 'no_access_token', 'detail': str(token_resp)[:300]})

    try:
        profile = fetch_userinfo(provider, access_token)
    except Exception as e:
        print(f'[sso-auth] OAuth userinfo failed for {provider}: {e!r}')
        return json_response(502, {'error': 'userinfo_failed', 'message': str(e)[:200]})

    return login_or_register_by_identity(conn, provider, profile, ua, ip, redirect_after)


def action_oauth_vk_sdk(conn, body: dict, ua: str, ip: str) -> dict:
    """
    VK ID OneTap SDK: фронт уже получил access_token, мы запрашиваем
    профиль через /oauth2/user_info. sub_provider=mail_ru|ok_ru — VK ID
    отдаёт через них (тогда identity сохраняется под нужным провайдером).
    """
    access_token = (body.get('access_token') or '').strip()
    sub_provider = (body.get('sub_provider') or 'vk').strip().lower()
    redirect_after = (body.get('redirect_after') or '/account').strip()[:512]
    raw_user = body.get('user') or {}

    if not access_token:
        return json_response(400, {'error': 'missing_access_token'})

    try:
        resp = http_post_form(
            'https://id.vk.com/oauth2/user_info',
            {
                'client_id': os.environ.get('OAUTH_VK_CLIENT_ID', ''),
                'access_token': access_token,
            },
        )
    except Exception as e:
        print(f'[sso-auth] VK SDK user_info failed: {e!r}')
        # Фолбэк на user-payload, который SDK прислал сам.
        resp = {'user': raw_user}

    u = resp.get('user') or raw_user or {}
    if not u:
        return json_response(502, {'error': 'no_user_data'})

    full_name = ' '.join(filter(None, [u.get('first_name'), u.get('last_name')])) or ''
    email = (u.get('email') or '').lower() or None
    provider_user_id = str(u.get('user_id') or u.get('id') or '')

    # Маппинг sub_provider → внутреннее имя identity.
    provider_map = {
        'mail_ru': 'mailru', 'mailru': 'mailru',
        'ok_ru': 'ok',       'ok': 'ok',
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
    return login_or_register_by_identity(conn, provider, profile, ua, ip, redirect_after)