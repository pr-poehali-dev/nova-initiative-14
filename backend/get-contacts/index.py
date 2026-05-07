import json
import os
import psycopg2

def handler(event, context):
    """Возвращает контактную информацию из базы данных в виде словаря key→value."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400'}, 'body': ''}

    schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT key, value, label FROM {schema}.contacts ORDER BY sort_order".format(schema=schema)
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    contacts = {row[0]: {'value': row[1], 'label': row[2]} for row in rows}

    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'contacts': contacts}, ensure_ascii=False)
    }
