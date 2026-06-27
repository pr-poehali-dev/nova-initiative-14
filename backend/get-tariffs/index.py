import json
import os
import psycopg2

def handler(event, context):
    """Возвращает активные тарифы из БД. По умолчанию — тарифы обучения,
    при ?kind=widget — публичные тарифы виджета (для лендинга и КП)."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400'}, 'body': ''}

    params = event.get('queryStringParameters') or {}
    kind = params.get('kind', 'edu')
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        with conn.cursor() as cur:
            if kind == 'widget':
                cur.execute(
                    "SELECT id, slug, name, price_monthly, calc_limit, max_sites, "
                    "features, is_popular, sort_order "
                    "FROM widget_tariffs WHERE is_active = true ORDER BY sort_order"
                )
            else:
                cur.execute(
                    "SELECT id, pos, slug, title, duration, audience, format, price, price_label, "
                    "includes, between_sessions, review_policy, limits_info, "
                    "cta_text, cta_link, is_popular, is_warning, sort_order "
                    "FROM tariffs WHERE is_active = true ORDER BY sort_order"
                )
            columns = [desc[0] for desc in cur.description]
            rows = cur.fetchall()
    finally:
        conn.close()

    tariffs = []
    for row in rows:
        item = dict(zip(columns, row))
        if 'includes' in item:
            item['includes'] = list(item['includes']) if item['includes'] else []
        if 'features' in item:
            item['features'] = list(item['features']) if item['features'] else []
        tariffs.append(item)

    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'tariffs': tariffs}, ensure_ascii=False, default=str)
    }