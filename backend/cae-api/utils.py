"""
Чистые утилиты cae-api:
  - client_ip / user_agent — выжимки из event
  - slugify                — нормализация имени проекта в URL-friendly slug
  - project_to_dict        — сериализация записи cae_projects в JSON-объект
"""
import re

EMAIL_RE = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
SLUG_RE = re.compile(r'[^a-z0-9-]+')


def client_ip(event: dict) -> str:
    """Возвращает IP клиента из requestContext.identity.sourceIp (обрезка до 64 символов)."""
    ctx = event.get('requestContext') or {}
    identity = ctx.get('identity') or {}
    return (identity.get('sourceIp') or '')[:64]


def user_agent(event: dict) -> str:
    """User-Agent из заголовков, обрезано до 512 символов."""
    headers = event.get('headers') or {}
    return (headers.get('User-Agent') or headers.get('user-agent') or '')[:512]


def slugify(name: str, fallback: str) -> str:
    """
    Транслитерация русских названий проектов в URL-friendly slug.
    Длина — максимум 48 символов, минимум 1 (fallback).
    """
    s = (name or '').lower().strip()
    table = str.maketrans({
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'i', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh', 'ъ': '',
        'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
        ' ': '-', '_': '-', '/': '-', '\\': '-', '.': '-', ',': '-',
    })
    s = s.translate(table)
    s = SLUG_RE.sub('-', s)
    s = re.sub(r'-+', '-', s).strip('-')[:48]
    return s or fallback


def project_to_dict(row: dict) -> dict:
    """Сериализация записи cae_projects в JSON-объект для фронта."""
    return {
        'id': row['id'],
        'name': row['name'],
        'slug': row['slug'],
        'description': row['description'] or '',
        'project_type': row['project_type'],
        'units_length': row['units_length'],
        'units_force': row['units_force'],
        'is_archived': row['is_archived'],
        'current_version_id': row['current_version_id'],
        'created_at': row['created_at'].isoformat() if row['created_at'] else None,
        'updated_at': row['updated_at'].isoformat() if row['updated_at'] else None,
    }
