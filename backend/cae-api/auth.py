"""
Авторизация JWT и общие helpers ответа/CORS для cae-api.

CORS-заголовки одинаковы для всех ответов (включая ошибки) — без них
браузер отбросит ответ из-за политики кросс-доменных запросов.

JWT выпускает sso-auth тем же секретом SSO_JWT_SECRET. Здесь — только
проверка подписи и срока годности (exp). Использует HS256 (HMAC-SHA-256).

Auth Header Proxy: фронт шлёт `Authorization: Bearer …`, прокси Cloud
Functions фильтрует Authorization → переименовывает в X-Authorization,
поэтому читаем оба варианта.
"""
import base64
import hashlib
import hmac
import json
import os
import time

JWT_SECRET = os.environ['SSO_JWT_SECRET']

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Authorization, Authorization',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json; charset=utf-8',
}


def json_response(status: int, body: dict) -> dict:
    """Стандартный JSON-ответ с CORS и UTF-8."""
    return {'statusCode': status, 'headers': CORS, 'body': json.dumps(body, ensure_ascii=False)}


def b64url_decode(s: str) -> bytes:
    """Декодирует base64url с автоматическим добавлением паддинга."""
    pad = '=' * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)


def verify_jwt(token: str) -> dict | None:
    """Проверяет JWT, выпущенный sso-auth. Возвращает payload или None."""
    try:
        h_b, p_b, s_b = token.split('.')
        signing_input = f'{h_b}.{p_b}'.encode()
        expected = hmac.new(JWT_SECRET.encode(), signing_input, hashlib.sha256).digest()
        actual = b64url_decode(s_b)
        if not hmac.compare_digest(expected, actual):
            return None
        payload = json.loads(b64url_decode(p_b))
        if payload.get('exp', 0) < int(time.time()):
            return None
        return payload
    except Exception:
        return None


def auth_user(event: dict) -> dict | None:
    """Извлекает user-payload из заголовка Bearer-токена; None если токен невалиден."""
    headers = event.get('headers') or {}
    auth = headers.get('X-Authorization') or headers.get('Authorization') or ''
    if not auth.startswith('Bearer '):
        return None
    return verify_jwt(auth[7:].strip())
