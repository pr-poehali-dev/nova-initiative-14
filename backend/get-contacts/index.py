import json
import os
import psycopg2
import psycopg2.extras

SITE_URL = "https://xn----gtbhgbqhkfi.xn--p1ai"


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
    static_pages = [
        ("/", "weekly", "1.0"),
        ("/program", "monthly", "0.9"),
        ("/pricing", "monthly", "0.9"),
        ("/cases", "monthly", "0.8"),
        ("/experts", "monthly", "0.8"),
        ("/reviews", "monthly", "0.8"),
        ("/faq", "monthly", "0.7"),
        ("/about", "monthly", "0.7"),
        ("/contacts", "monthly", "0.9"),
        ("/vacancies", "monthly", "0.6"),
        ("/blog", "weekly", "0.9"),
        ("/cae", "weekly", "0.9"),
    ]
    parts = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path, freq, prio in static_pages:
        parts.append('  <url>')
        parts.append(f'    <loc>{SITE_URL}{path}</loc>')
        parts.append(f'    <changefreq>{freq}</changefreq>')
        parts.append(f'    <priority>{prio}</priority>')
        parts.append('  </url>')

    with conn.cursor() as cur:
        cur.execute(
            "SELECT slug, updated_at FROM engineering_articles "
            "WHERE is_published = TRUE ORDER BY updated_at DESC"
        )
        for slug, updated_at in cur.fetchall():
            parts.append('  <url>')
            parts.append(f'    <loc>{SITE_URL}/blog/{slug}</loc>')
            if updated_at:
                parts.append(f'    <lastmod>{updated_at.strftime("%Y-%m-%d")}</lastmod>')
            parts.append('    <changefreq>monthly</changefreq>')
            parts.append('    <priority>0.8</priority>')
            parts.append('  </url>')
    parts.append('</urlset>')
    return {
        'statusCode': 200,
        'headers': _cors({'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600'}),
        'body': '\n'.join(parts),
    }


def handler(event, context):
    """Возвращает контакты, блоки «О нас», статьи блога или sitemap.xml."""
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