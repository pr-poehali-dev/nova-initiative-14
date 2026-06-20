import json
import os
import urllib.request
import psycopg2
import psycopg2.extras

SITE_URL = "https://xn----gtbhgbqhkfi.xn--p1ai"
# Ключ IndexNow: ДОЛЖЕН совпадать с именем файла-подтверждения в /public
# (a7f3c9e1b54d4e8fa2c6079b3d8e5f10.txt) и с ключом функции indexnow. Иначе
# Яндекс отклонит переобход — keyLocation укажет на несуществующий файл.
INDEXNOW_KEY = "a7f3c9e1b54d4e8fa2c6079b3d8e5f10"


def _cors(extra=None):
    h = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
    }
    if extra:
        h.update(extra)
    return h


def _article_row(row, full):
    item = {
        'id': row['id'],
        'slug': row['slug'],
        'h1': row['h1'],
        'seo_title': row['seo_title'],
        'seo_description': row['seo_description'],
        'seo_keywords': row['seo_keywords'] or '',
        'summary': row['summary'],
        'author_name': row['author_name'],
        'author_role': row['author_role'],
        'cover_url': row['cover_url'] or '',
        'reading_minutes': row['reading_minutes'],
        'published_at': row['published_at'].isoformat() if row['published_at'] else None,
        'updated_at': row['updated_at'].isoformat() if row['updated_at'] else None,
    }
    if full:
        item['quick_facts'] = row['quick_facts'] or []
        item['body_html'] = row['body_html']
        item['bibliography'] = row['bibliography'] or []
    return item


def _handle_articles(conn, params):
    slug = (params or {}).get('slug')
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        if slug:
            cur.execute(
                "SELECT * FROM engineering_articles WHERE slug = %s AND is_published = TRUE",
                (slug,),
            )
            row = cur.fetchone()
            if not row:
                return {
                    'statusCode': 404,
                    'headers': _cors({'Content-Type': 'application/json'}),
                    'body': json.dumps({'error': 'Not found'}),
                }
            return {
                'statusCode': 200,
                'headers': _cors({'Content-Type': 'application/json; charset=utf-8'}),
                'body': json.dumps(_article_row(dict(row), True), ensure_ascii=False),
            }
        cur.execute(
            "SELECT id, slug, h1, seo_title, seo_description, seo_keywords, summary, "
            "author_name, author_role, cover_url, "
            "reading_minutes, published_at, updated_at "
            "FROM engineering_articles WHERE is_published = TRUE "
            "ORDER BY published_at DESC"
        )
        rows = cur.fetchall()
        articles = []
        for r in rows:
            d = dict(r)
            d['quick_facts'] = []
            d['body_html'] = ''
            d['bibliography'] = []
            articles.append(_article_row(d, False))
        return {
            'statusCode': 200,
            'headers': _cors({'Content-Type': 'application/json; charset=utf-8'}),
            'body': json.dumps({'articles': articles}, ensure_ascii=False),
        }


def _handle_sitemap(conn):
    # Дата последнего изменения сайта в целом — берём свежайшую дату
    # обновления опубликованной статьи (фолбэк — сегодня). Используется
    # как lastmod для разделов блога и главной, чтобы роботы видели свежесть.
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    with conn.cursor() as cur:
        cur.execute(
            "SELECT MAX(updated_at) FROM engineering_articles WHERE is_published = TRUE"
        )
        row = cur.fetchone()
        latest_article = row[0].strftime("%Y-%m-%d") if row and row[0] else today

    # (path, changefreq, priority, lastmod)
    static_pages = [
        ("/", "daily", "1.0", latest_article),
        ("/blog", "daily", "0.9", latest_article),
        ("/cae", "weekly", "0.9", today),
        ("/cae/changelog", "weekly", "0.6", today),
        ("/program", "monthly", "0.9", today),
        ("/pricing", "monthly", "0.9", today),
        ("/contacts", "monthly", "0.9", today),
        ("/cases", "monthly", "0.8", today),
        ("/experts", "monthly", "0.8", today),
        ("/reviews", "monthly", "0.8", today),
        ("/faq", "monthly", "0.7", today),
        ("/about", "monthly", "0.7", today),
        ("/vacancies", "monthly", "0.6", today),
        ("/privacy", "yearly", "0.3", today),
        ("/offer", "yearly", "0.3", today),
    ]
    parts = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path, freq, prio, lastmod in static_pages:
        parts.append('  <url>')
        parts.append(f'    <loc>{SITE_URL}{path}</loc>')
        parts.append(f'    <lastmod>{lastmod}</lastmod>')
        parts.append(f'    <changefreq>{freq}</changefreq>')
        parts.append(f'    <priority>{prio}</priority>')
        parts.append('  </url>')

    with conn.cursor() as cur:
        cur.execute(
            "SELECT slug, COALESCE(updated_at, published_at) AS lm "
            "FROM engineering_articles "
            "WHERE is_published = TRUE ORDER BY lm DESC"
        )
        for slug, lm in cur.fetchall():
            parts.append('  <url>')
            parts.append(f'    <loc>{SITE_URL}/blog/{slug}</loc>')
            if lm:
                parts.append(f'    <lastmod>{lm.strftime("%Y-%m-%d")}</lastmod>')
            parts.append('    <changefreq>weekly</changefreq>')
            parts.append('    <priority>0.8</priority>')
            parts.append('  </url>')
    parts.append('</urlset>')
    return {
        'statusCode': 200,
        # Короткий кэш (10 мин) — чтобы свежие статьи попадали в карту почти сразу.
        'headers': _cors({'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=600'}),
        'body': '\n'.join(parts),
    }


def _handle_ping(conn):
    """Уведомляет поисковики (IndexNow: Яндекс + Bing) об обновлении контента.

    Отправляет список актуальных публичных URL одним батч-запросом. Это
    заставляет роботов прийти на переобход почти сразу, а не ждать планового
    обхода. Вызывать после публикации/обновления статьи.
    """
    # Все публичные статические разделы (совпадают со sitemap).
    static_paths = [
        "/", "/blog",
        "/cae", "/cae/raschet-balki-onlayn", "/cae/raschet-ramy-onlayn",
        "/cae/raschet-fermy-onlayn", "/cae/changelog",
        "/program", "/pricing", "/contacts", "/cases", "/experts",
        "/reviews", "/faq", "/about", "/vacancies", "/privacy", "/offer",
    ]
    urls = [f"{SITE_URL}{p}" for p in static_paths]
    with conn.cursor() as cur:
        cur.execute(
            "SELECT slug FROM engineering_articles WHERE is_published = TRUE"
        )
        for (slug,) in cur.fetchall():
            urls.append(f"{SITE_URL}/blog/{slug}")

    payload = json.dumps({
        "host": "xn----gtbhgbqhkfi.xn--p1ai",
        "key": INDEXNOW_KEY,
        "keyLocation": f"{SITE_URL}/{INDEXNOW_KEY}.txt",
        "urlList": urls,
    }).encode("utf-8")

    result = {"submitted": len(urls), "endpoints": {}}
    for ep in ("https://yandex.com/indexnow", "https://api.indexnow.org/indexnow"):
        try:
            req = urllib.request.Request(
                ep, data=payload,
                headers={"Content-Type": "application/json; charset=utf-8"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                result["endpoints"][ep] = resp.status
        except Exception as e:
            result["endpoints"][ep] = f"error: {type(e).__name__}"

    return {
        'statusCode': 200,
        'headers': _cors({'Content-Type': 'application/json; charset=utf-8'}),
        'body': json.dumps(result, ensure_ascii=False),
    }


def handler(event, context):
    """Возвращает контакты, блоки «О нас», статьи блога, sitemap.xml или пинг поисковиков."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': _cors(), 'body': ''}

    params = event.get('queryStringParameters') or {}
    resource = params.get('resource')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        if resource == 'articles':
            return _handle_articles(conn, params)
        if resource == 'sitemap':
            return _handle_sitemap(conn)
        if resource == 'ping':
            return _handle_ping(conn)

        schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
        with conn.cursor() as cur:
            cur.execute(
                "SELECT key, value, label FROM {schema}.contacts ORDER BY sort_order".format(schema=schema)
            )
            contact_rows = cur.fetchall()

            about_sections = []
            try:
                cur.execute(
                    "SELECT id, title, body, sort_order FROM {schema}.about_sections WHERE is_visible = TRUE ORDER BY sort_order, id".format(schema=schema)
                )
                about_rows = cur.fetchall()
                about_sections = [
                    {'id': r[0], 'title': r[1], 'body': r[2], 'sort_order': r[3]}
                    for r in about_rows
                ]
            except Exception as e:
                print(f'[get-contacts] about_sections skipped: {e}')
    finally:
        conn.close()

    contacts = {row[0]: {'value': row[1], 'label': row[2]} for row in contact_rows}

    return {
        'statusCode': 200,
        'headers': _cors({'Content-Type': 'application/json'}),
        'body': json.dumps({'contacts': contacts, 'about': about_sections}, ensure_ascii=False)
    }