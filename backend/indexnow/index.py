"""
Business: Переобход страниц в Яндексе через IndexNow + список всех страниц сайта
          со статусом индексации (Яндекс.Вебмастер API). Позволяет владельцу
          выбрать конкретные страницы (галочками) и отправить их на переобход,
          с автоподсветкой непроиндексированных.
Args: event с httpMethod, queryStringParameters.action ('list' | 'submit'),
      body (JSON: {"urls": [...]} для submit).
Returns: для list — все страницы + статус индексации; для submit — статус IndexNow.
"""
import json
import os
import urllib.request
import urllib.error

import psycopg2

SITE_HOST = 'xn----gtbhgbqhkfi.xn--p1ai'  # пуникод домена диплом-инж.рф
SITE_URL = f'https://{SITE_HOST}'
INDEXNOW_KEY = 'a7f3c9e1b54d4e8fa2c6079b3d8e5f10'
INDEXNOW_ENDPOINT = 'https://yandex.com/indexnow'

# Статические страницы сайта (совпадают со sitemap). (path, человекочитаемое имя)
STATIC_PAGES = [
    ('/', 'Главная'),
    ('/cae', 'CAE — расчёты'),
    ('/cae/raschet-balki-onlayn', 'Расчёт балки'),
    ('/cae/raschet-ramy-onlayn', 'Расчёт рамы'),
    ('/cae/raschet-fermy-onlayn', 'Расчёт фермы'),
    ('/cae/changelog', 'CAE — журнал версий'),
    ('/program', 'Программа'),
    ('/pricing', 'Тарифы'),
    ('/contacts', 'Контакты'),
    ('/cases', 'Кейсы'),
    ('/experts', 'Наставники'),
    ('/reviews', 'Отзывы'),
    ('/faq', 'FAQ'),
    ('/about', 'О нас'),
    ('/vacancies', 'Вакансии'),
    ('/blog', 'Журнал (блог)'),
    ('/privacy', 'Политика конфиденциальности'),
    ('/offer', 'Оферта'),
]

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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


def _all_pages() -> list:
    """Собирает все публичные страницы: статические + статьи блога из БД."""
    pages = [{'path': p, 'title': name} for p, name in STATIC_PAGES]
    dsn = os.environ.get('DATABASE_URL')
    if dsn:
        try:
            conn = psycopg2.connect(dsn)
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT slug, COALESCE(h1, seo_title, slug) "
                        "FROM engineering_articles WHERE is_published = TRUE "
                        "ORDER BY COALESCE(updated_at, published_at) DESC"
                    )
                    for slug, title in cur.fetchall():
                        pages.append({'path': f'/blog/{slug}', 'title': f'Статья: {title}'})
            finally:
                conn.close()
        except Exception as e:
            print(f'[indexnow] DB error: {e}')
    return pages


def _yandex_api(path: str):
    """GET к Яндекс.Вебмастер API с OAuth-токеном. Возвращает dict или None."""
    token = os.environ.get('YANDEX_WEBMASTER_TOKEN')
    if not token:
        return None
    req = urllib.request.Request(
        f'https://api.webmaster.yandex.net{path}',
        headers={'Authorization': f'OAuth {token}'},
        method='GET',
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read().decode('utf-8'))
    except Exception as e:
        print(f'[indexnow] yandex api error {path}: {e}')
        return None


def _indexed_urls() -> tuple:
    """Возвращает (set проиндексированных URL, ok). ok=False если API недоступен
    (нет токена/ошибка) — тогда статус индексации показывать не можем."""
    user = _yandex_api('/v4/user/')
    if not user or 'user_id' not in user:
        return set(), False
    user_id = user['user_id']

    hosts = _yandex_api(f'/v4/user/{user_id}/hosts/')
    if not hosts or not hosts.get('hosts'):
        return set(), False
    # Ищем наш хост среди подтверждённых.
    host_id = None
    for h in hosts['hosts']:
        hid = h.get('host_id', '')
        if SITE_HOST in hid or 'диплом' in hid or 'p1ai' in hid:
            host_id = hid
            break
    if not host_id:
        host_id = hosts['hosts'][0].get('host_id')
    if not host_id:
        return set(), False

    indexed = set()
    offset = 0
    # Постранично выбираем проиндексированные URL (по 100 за запрос).
    for _ in range(50):  # максимум 5000 URL — с запасом для нашего сайта
        data = _yandex_api(
            f'/v4/user/{user_id}/hosts/{host_id}/search-urls/in-search/samples/'
            f'?limit=100&offset={offset}'
        )
        if not data:
            break
        samples = data.get('samples') or []
        for s in samples:
            u = s.get('url')
            if u:
                indexed.add(u.rstrip('/') or u)
        if len(samples) < 100:
            break
        offset += 100
    return indexed, True


def _handle_list():
    """Все страницы сайта + статус индексации (если доступен Вебмастер API)."""
    pages = _all_pages()
    indexed, status_ok = _indexed_urls()

    def is_indexed(path):
        full = (SITE_URL + path).rstrip('/') or SITE_URL
        return full in indexed or (SITE_URL + path) in indexed

    items = []
    for p in pages:
        item = {'path': p['path'], 'title': p['title'], 'url': SITE_URL + p['path']}
        item['indexed'] = is_indexed(p['path']) if status_ok else None
        items.append(item)

    return _resp(200, {
        'ok': True,
        'index_status_available': status_ok,
        'indexed_count': len(indexed) if status_ok else None,
        'pages': items,
    })


def _handle_submit(body):
    raw = body.get('urls') or []
    urls = []
    for u in raw:
        abs_u = _to_abs(u)
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
        INDEXNOW_ENDPOINT, data=payload,
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

    ok = code in (200, 202)
    return _resp(200, {
        'ok': ok,
        'indexnow_status': code,
        'indexnow_response': text[:500],
        'sent_count': len(urls),
        'sent_urls': urls,
    })


def handler(event, context):
    method = event.get('httpMethod', 'POST')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action', 'submit')

    if action == 'list' and method == 'GET':
        return _handle_list()

    if method != 'POST':
        return _resp(405, {'error': 'method_not_allowed'})

    try:
        body = json.loads(event.get('body') or '{}')
    except (ValueError, TypeError):
        body = {}

    # Обратная совместимость: POST без action со списком urls = submit.
    return _handle_submit(body)
