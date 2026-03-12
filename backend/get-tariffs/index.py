import json
import os
import psycopg2

def handler(event, context):
    """Возвращает список активных тарифов из базы данных."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400'}, 'body': ''}

    schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, pos, slug, title, duration, audience, format, price, price_label, "
                "includes, between_sessions, review_policy, limits_info, "
                "cta_text, cta_link, is_popular, is_warning, sort_order "
                "FROM {schema}.tariffs WHERE is_active = true ORDER BY sort_order".format(schema=schema)
            )
            columns = [desc[0] for desc in cur.description]
            rows = cur.fetchall()
    finally:
        conn.close()

    tariffs = []
    for row in rows:
        item = dict(zip(columns, row))
        item['includes'] = list(item['includes']) if item['includes'] else []
        tariffs.append(item)

    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'tariffs': tariffs}, ensure_ascii=False, default=str)
    }
