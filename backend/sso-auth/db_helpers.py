"""
Работа с БД и помощники запросов:
  - json_response       — единый формат ответа с CORS
  - client_ip/user_agent — выжимки из event
  - get_user_payload    — пользователь + его роли для возврата клиенту
  - issue_tokens        — выпустить access JWT + refresh, сохранить в БД
  - create_verify_token — одноразовый токен подтверждения email
  - log_attempt         — лог неуспешного логина
  - check_rate_limit    — не больше 10 неуспешных попыток с одного IP за 10 минут
"""
import hashlib
import json
import time
from datetime import datetime, timedelta, timezone

import psycopg2.extras

from config import (
    ACCESS_TOKEN_TTL,
    CORS,
    ISSUER,
    REFRESH_TOKEN_TTL,
    VERIFY_TOKEN_TTL,
)
from crypto import generate_refresh_token, sign_jwt


def json_response(status: int, body: dict) -> dict:
    """Стандартный JSON-ответ с CORS и UTF-8."""
    return {
        'statusCode': status,
        'headers': CORS,
        'body': json.dumps(body, ensure_ascii=False),
    }


def client_ip(event: dict) -> str:
    """IP клиента (обрезка до 64 символов — формат БД)."""
    ctx = event.get('requestContext') or {}
    identity = ctx.get('identity') or {}
    return (identity.get('sourceIp') or '')[:64]


def user_agent(event: dict) -> str:
    """User-Agent клиента; пустая строка если отсутствует."""
    headers = event.get('headers') or {}
    return headers.get('User-Agent') or headers.get('user-agent') or ''


def get_user_payload(conn, user_id: int) -> dict:
    """Пользователь + его роли в формате для возврата клиенту."""
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


def issue_tokens(conn, user_id: int, ua: str, ip: str, client_id: str = 'main') -> dict:
    """
    Выпускает access JWT (1ч) + refresh-токен (30д).
    Refresh хранится в БД как SHA-256 от raw-значения.
    """
    user = get_user_payload(conn, user_id)
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
    access_token = sign_jwt(access_payload)

    raw_refresh, refresh_hash = generate_refresh_token()
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=REFRESH_TOKEN_TTL)

    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO sso_refresh_tokens (user_id, client_id, token_hash, expires_at, user_agent, ip) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (user_id, client_id, refresh_hash, expires_at, (ua or '')[:512], (ip or '')[:64]),
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


def create_verify_token(conn, user_id: int) -> str:
    """Одноразовый токен подтверждения email (24 часа). В БД — SHA-256."""
    import secrets as _secrets
    raw = _secrets.token_urlsafe(32)
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


def log_attempt(conn, email: str, ip: str, success: bool, ua: str) -> None:
    """Запись в sso_login_attempts. Ошибки логирования не пробрасываем."""
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


def check_rate_limit(conn, ip: str) -> bool:
    """True — можно попытаться. Лимит: 10 неуспешных попыток с IP за 10 минут."""
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
