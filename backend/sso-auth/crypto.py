"""
Криптография SSO:
  - base64url (без паддинга) — нужно для JWT
  - JWT HS256 sign/verify (с проверкой exp)
  - PBKDF2-SHA256 + pepper для паролей (200_000 итераций)
  - refresh-токен (raw для клиента + SHA-256 для БД)
  - PKCE code_verifier/challenge S256 для OAuth 2.1
"""
import base64
import hashlib
import hmac
import json
import secrets
import time

from config import JWT_SECRET, PEPPER


def b64url_encode(data: bytes) -> str:
    """base64url без паддинга — формат JWT."""
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('ascii')


def b64url_decode(s: str) -> bytes:
    """base64url с автоматическим добавлением паддинга."""
    pad = '=' * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)


# === Пароли ===

def hash_password(password: str) -> str:
    """PBKDF2-SHA256 + pepper. 200_000 итераций. Формат: pbkdf2_sha256$iters$salt$dk."""
    salt = secrets.token_bytes(16)
    seasoned = (password + PEPPER).encode('utf-8')
    dk = hashlib.pbkdf2_hmac('sha256', seasoned, salt, 200_000)
    return f"pbkdf2_sha256$200000${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"


def verify_password(password: str, stored: str) -> bool:
    """Сравнивает пароль с хешем из БД (constant-time)."""
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


# === JWT (HS256) ===

def sign_jwt(payload: dict) -> str:
    """Подписывает payload секретом SSO_JWT_SECRET. Алгоритм HS256."""
    header = {'alg': 'HS256', 'typ': 'JWT'}
    h_b = b64url_encode(json.dumps(header, separators=(',', ':')).encode())
    p_b = b64url_encode(json.dumps(payload, separators=(',', ':')).encode())
    signing_input = f'{h_b}.{p_b}'.encode()
    sig = hmac.new(JWT_SECRET.encode(), signing_input, hashlib.sha256).digest()
    return f'{h_b}.{p_b}.{b64url_encode(sig)}'


def verify_jwt(token: str) -> dict | None:
    """Проверяет подпись и срок (exp). Возвращает payload или None."""
    try:
        h_b, p_b, s_b = token.split('.')
        signing_input = f'{h_b}.{p_b}'.encode()
        expected_sig = hmac.new(JWT_SECRET.encode(), signing_input, hashlib.sha256).digest()
        actual_sig = b64url_decode(s_b)
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None
        payload = json.loads(b64url_decode(p_b))
        if payload.get('exp', 0) < int(time.time()):
            return None
        return payload
    except Exception:
        return None


# === Refresh-токены и одноразовые токены ===

def generate_refresh_token() -> tuple[str, str]:
    """
    Возвращает (raw_token, sha256_hash).
    Raw отдаётся клиенту, hash — в БД. Так утечка БД не даёт refresh.
    """
    raw = secrets.token_urlsafe(48)
    h = hashlib.sha256(raw.encode()).hexdigest()
    return raw, h


# === PKCE (OAuth 2.1) ===

def generate_pkce() -> tuple[str, str]:
    """Возвращает (code_verifier, code_challenge) методом S256 для VK ID."""
    verifier = secrets.token_urlsafe(64)[:128]
    digest = hashlib.sha256(verifier.encode('ascii')).digest()
    challenge = base64.urlsafe_b64encode(digest).rstrip(b'=').decode('ascii')
    return verifier, challenge
