"""
Business: Отправка страниц сайта на переобход в Яндекс через протокол IndexNow.
          Уведомляет поисковик о новых/изменённых URL (например, CAE-посадочных),
          чтобы ускорить их индексацию.
Args: event с httpMethod, body (JSON: {"urls": ["/cae", ...]} — пути или полные URL;
      если не передано — отправляется набор ключевых страниц по умолчанию).
Returns: HTTP-ответ со статусом IndexNow и списком отправленных URL.
"""
import json
import urllib.request
import urllib.error

SITE_HOST = 'xn----gtbhgbqhkfi.xn--p1ai'  # пуникод домена диплом-инж.рф
SITE_URL = f'https://{SITE_HOST}'
INDEXNOW_KEY = 'a7f3c9e1b54d4e8fa2c6079b3d8e5f10'
INDEXNOW_ENDPOINT = 'https://yandex.com/indexnow'

# Ключевые страницы по умолчанию (если клиент не передал свой список).
DEFAULT_PATHS = [
    '/',
    '/cae',
    '/cae/raschet-balki-onlayn',
    '/cae/raschet-ramy-onlayn',
    '/cae/raschet-fermy-onlayn',
    '/program',
    '/pricing',
    '/blog',
]

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
}


def _resp(status, body):
    return {'statusCode': status, 'headers': CORS, 'body': json.dumps(body, ensure_ascii=False)}


def _to_abs(u: str) -> str:
    u = (u or '').strip()
    if not u:
        return ''
    if u.startswith('http://') or u.startswith('https://'):
        return u
    if not u.startswith('/'):
        u = '/' + u
    return SITE_URL + u


def handler(event, context):
    method = event.get('httpMethod', 'POST')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}
    if method != 'POST':
        return _resp(405, {'error': 'method_not_allowed'})

    try:
        body = json.loads(event.get('body') or '{}')
    except (ValueError, TypeError):
        body = {}

    raw = body.get('urls') or DEFAULT_PATHS
    urls = []
    for u in raw:
        abs_u = _to_abs(u)
        # Отправляем только URL нашего домена.
        if abs_u and abs_u.startswith(SITE_URL) and abs_u not in urls:
            urls.append(abs_u)

    if not urls:
        return _resp(400, {'error': 'no_valid_urls'})

    payload = json.dumps({
        'host': SITE_HOST,
        'key': INDEXNOW_KEY,
        'keyLocation': f'{SITE_URL}/{INDEXNOW_KEY}.txt',
        'urlList': urls,
    }).encode('utf-8')

    req = urllib.request.Request(
        INDEXNOW_ENDPOINT,
        data=payload,
        headers={'Content-Type': 'application/json; charset=utf-8'},
        method='POST',
    )

    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            code = r.getcode()
            text = r.read().decode('utf-8', errors='replace')
    except urllib.error.HTTPError as e:
        code = e.code
        text = e.read().decode('utf-8', errors='replace')
    except urllib.error.URLError as e:
        return _resp(502, {'error': 'indexnow_unreachable', 'detail': str(e.reason)})

    # IndexNow: 200/202 — принято; 403 — ключ не подтверждён; 422 — несоответствие домена.
    ok = code in (200, 202)
    return _resp(200, {
        'ok': ok,
        'indexnow_status': code,
        'indexnow_response': text[:500],
        'sent_count': len(urls),
        'sent_urls': urls,
    })
