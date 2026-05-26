"""
Конфигурация SSO: TTL токенов, SMTP, CORS, регулярки, провайдеры OAuth.

OAUTH_PROVIDERS — единый реестр настроек для Authorization Code Flow.
Каждый провайдер указывает URL'ы и имена ENV-переменных (client_id/secret),
по которым `_oauth_provider_enabled()` определяет, включён ли провайдер.

VK ID использует OAuth 2.1 + PKCE (use_pkce=True), остальные — стандартный
OAuth 2.0. redirect_uri единый для всех провайдеров.
"""
import os
import re


# === JWT и токены ===
JWT_SECRET = os.environ['SSO_JWT_SECRET']
PEPPER = os.environ['SSO_PASSWORD_PEPPER']

ACCESS_TOKEN_TTL = 60 * 60              # 1 час
REFRESH_TOKEN_TTL = 60 * 60 * 24 * 30   # 30 дней
VERIFY_TOKEN_TTL = 60 * 60 * 24         # 24 часа на подтверждение email

ISSUER = 'https://xn----gtbhgbqhkfi.xn--p1ai'
SITE_URL = ISSUER

# === SMTP (Яндекс 360, общий ящик) ===
SMTP_HOST = 'smtp.yandex.ru'
SMTP_PORT = 465

# === OAuth ===
OAUTH_REDIRECT_URI = f'{SITE_URL}/oauth/callback'
OAUTH_STATE_TTL = 60 * 10  # 10 минут на завершение OAuth-flow

# Конфигурация OAuth-провайдеров. use_pkce=True → дополнительно
# генерируется code_verifier/code_challenge S256.
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
        # VK ID (OAuth 2.1 + PKCE), endpoints «ВК ID для бизнеса».
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
