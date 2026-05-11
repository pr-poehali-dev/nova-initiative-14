import json
import os
import psycopg2

def handler(event, context):
    """Возвращает контакты и блоки раздела «О нас» из БД."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400'}, 'body': ''}

    schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
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
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'contacts': contacts, 'about': about_sections}, ensure_ascii=False)
    }
