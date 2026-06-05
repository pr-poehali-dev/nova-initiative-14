"""
Business: SSO авторизация — регистрация, логин, refresh, userinfo, logout,
verify-email, resend-verification + OAuth (yandex / vk / google / mailru) + VK ID SDK.
Args: event.queryStringParameters.action; httpMethod POST/GET/OPTIONS; body JSON.
Returns: HTTP-ответ с access_token, refresh_token и профилем пользователя.

Декомпозиция:
  - config.py     — TTL, ISSUER, SMTP, OAUTH_PROVIDERS, CORS, EMAIL_RE
  - crypto.py     — base64url, JWT HS256, PBKDF2-пароли, refresh-токены, PKCE
  - mailer.py     — Яндекс 360 SMTP, Punycode, HTML-шаблон verify-email
  - db_helpers.py — json_response, get_user_payload, issue_tokens,
                    create_verify_token, log_attempt, check_rate_limit
  - actions.py    — register / login / refresh / userinfo / logout /
                    verify-email / resend-verification
  - oauth.py      — start / callback / providers / VK SDK,
                    обмен code→token, нормализация userinfo, login-or-register
"""
import base64
import json
import os

import psycopg2

from actions import (
    action_login,
    action_logout,
    action_refresh,
    action_register,
    action_request_reset,
    action_reset_password,
    action_resend_verification,
    action_userinfo,
    action_verify_email,
)
from account_actions import (
    action_admin_award_points,
    action_admin_set_role,
    action_admin_toggle_active,
    action_admin_users,
    action_change_password,
    action_update_profile,
)
from config import CORS
from db_helpers import client_ip, current_user_id, json_response, user_agent
from oauth import (
    action_list_identities,
    action_oauth_callback,
    action_oauth_providers,
    action_oauth_start,
    action_oauth_vk_sdk,
    action_unlink_identity,
)


def handler(event: dict, context) -> dict:
    """Маршрутизатор SSO по ?action= и httpMethod. Одно соединение с БД на запрос."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = (params.get('action') or '').strip()

    if not action:
        return json_response(400, {
            'error': 'missing_action',
            'message': (
                'Укажите ?action=register|login|refresh|userinfo|logout|'
                'verify-email|resend-verification|oauth-providers|oauth-start|oauth-callback|oauth-vk-sdk'
            ),
        })

    try:
        body_raw = event.get('body') or '{}'
        if event.get('isBase64Encoded'):
            body_raw = base64.b64decode(body_raw).decode('utf-8')
        body = json.loads(body_raw) if body_raw.strip() else {}
    except Exception:
        return json_response(400, {'error': 'invalid_json'})

    ua = user_agent(event)
    ip = client_ip(event)

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        # === Паролевая авторизация ===
        if action == 'register' and method == 'POST':
            return action_register(conn, body, ua, ip)
        if action == 'login' and method == 'POST':
            return action_login(conn, body, ua, ip)
        if action == 'refresh' and method == 'POST':
            return action_refresh(conn, body, ua, ip)
        if action == 'userinfo' and method == 'GET':
            return action_userinfo(conn, event)
        if action == 'logout' and method == 'POST':
            return action_logout(conn, body)
        if action == 'verify-email' and method == 'POST':
            return action_verify_email(conn, body, ua, ip)
        if action == 'resend-verification' and method == 'POST':
            return action_resend_verification(conn, body)
        if action == 'request-reset' and method == 'POST':
            return action_request_reset(conn, body)
        if action == 'reset-password' and method == 'POST':
            return action_reset_password(conn, body, ua, ip)

        # === DEV: ручная проверка отправки писем ===
        # Используется владельцем проекта для диагностики SMTP.
        # Body: {"to": "..."}. Subject и тело — как у verify-email.
        if action == 'dev-test-email' and method == 'POST':
            from mailer import send_email
            to_addr = (body.get('to') or '').strip()
            subj = body.get('subject') or 'ТЕСТ алгоритма подтверждения'
            text = (
                'Это тестовое письмо от Диплом-Инж.рф.\n\n'
                'Если вы его получили — SMTP работает корректно.\n'
                'Заголовок: ТЕСТ алгоритма подтверждения.\n\n'
                '— Диплом-Инж.рф\n'
            )
            html = (
                '<!DOCTYPE html><html lang="ru"><body style="font-family:Georgia,serif;color:#1a1a2e;">'
                '<h1 style="border-bottom:2px solid #1a1a2e;padding-bottom:8px;">ТЕСТ алгоритма подтверждения</h1>'
                '<p>Это <strong>тестовое письмо</strong> от Диплом-Инж.рф.</p>'
                '<p>Если вы его получили — SMTP работает корректно.</p>'
                '<p style="color:#7a7a8e;font-size:12px;margin-top:24px;">— Диплом-Инж.рф</p>'
                '</body></html>'
            )
            ok = send_email(to_addr, subj, html, text)
            return json_response(200, {'ok': ok, 'to': to_addr})

        # === OAuth ===
        if action == 'oauth-providers' and method == 'GET':
            return action_oauth_providers(conn)
        if action == 'oauth-start' and method == 'GET':
            # Если запрос авторизован (есть токен) — режим привязки в ЛК.
            link_uid = current_user_id(event) if params.get('link') == '1' else None
            return action_oauth_start(conn, params, ip, link_user_id=link_uid)
        if action == 'oauth-callback' and method == 'POST':
            return action_oauth_callback(conn, body, ua, ip)
        if action == 'oauth-vk-sdk' and method == 'POST':
            return action_oauth_vk_sdk(conn, body, ua, ip)

        # === Способы входа (личный кабинет, требуют Bearer-токен) ===
        if action == 'identities' and method == 'GET':
            uid = current_user_id(event)
            if not uid:
                return json_response(401, {'error': 'unauthorized'})
            return action_list_identities(conn, uid)
        if action == 'identity-unlink' and method == 'POST':
            uid = current_user_id(event)
            if not uid:
                return json_response(401, {'error': 'unauthorized'})
            return action_unlink_identity(conn, uid, body)

        # === Профиль (личный кабинет, требуют Bearer-токен) ===
        if action == 'update-profile' and method == 'POST':
            uid = current_user_id(event)
            if not uid:
                return json_response(401, {'error': 'unauthorized'})
            return action_update_profile(conn, uid, body)
        if action == 'change-password' and method == 'POST':
            uid = current_user_id(event)
            if not uid:
                return json_response(401, {'error': 'unauthorized'})
            return action_change_password(conn, uid, body)

        # === Админ: управление пользователями (требуют is_admin) ===
        if action == 'admin-users' and method == 'GET':
            uid = current_user_id(event)
            if not uid:
                return json_response(401, {'error': 'unauthorized'})
            return action_admin_users(conn, uid, params)
        if action == 'admin-set-role' and method == 'POST':
            uid = current_user_id(event)
            if not uid:
                return json_response(401, {'error': 'unauthorized'})
            return action_admin_set_role(conn, uid, body)
        if action == 'admin-toggle-active' and method == 'POST':
            uid = current_user_id(event)
            if not uid:
                return json_response(401, {'error': 'unauthorized'})
            return action_admin_toggle_active(conn, uid, body)
        if action == 'admin-award-points' and method == 'POST':
            uid = current_user_id(event)
            if not uid:
                return json_response(401, {'error': 'unauthorized'})
            return action_admin_award_points(conn, uid, body)

        return json_response(404, {'error': 'unknown_action'})
    except Exception as e:
        import traceback
        print(f'[sso-auth] error type={type(e).__name__} msg={e!r}')
        print(f'[sso-auth] traceback: {traceback.format_exc()}')
        return json_response(500, {
            'error': 'internal_error',
            'message': f'{type(e).__name__}: {e}'[:300],
        })
    finally:
        conn.close()