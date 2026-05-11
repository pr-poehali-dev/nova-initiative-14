import json
import os
import urllib.request

def handler(event: dict, context) -> dict:
    """Создаёт анонимный лид в Битрикс24 при выходе посетителя с сайта (если не заполнял форму)."""
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }

    body = json.loads(event.get('body', '{}'))
    visitor = body.get('visitor', {})

    pages_visited = ' → '.join(visitor.get('pages', [])) or '—'
    referrer = visitor.get('referrer', '—')
    time_on_site = visitor.get('timeOnSite', 0)
    minutes = time_on_site // 60
    seconds = time_on_site % 60
    time_str = f'{minutes} мин {seconds} сек' if minutes else f'{seconds} сек'
    device = visitor.get('device', '—')

    utm_parts = []
    if visitor.get('utmSource'): utm_parts.append(f"utm_source={visitor['utmSource']}")
    if visitor.get('utmMedium'): utm_parts.append(f"utm_medium={visitor['utmMedium']}")
    if visitor.get('utmCampaign'): utm_parts.append(f"utm_campaign={visitor['utmCampaign']}")
    utm_str = ', '.join(utm_parts) if utm_parts else '—'

    source_ip = event.get('requestContext', {}).get('identity', {}).get('sourceIp', '—')

    comments = (
        f'Анонимный посетитель покинул сайт без заявки\n\n'
        f'Путь по сайту: {pages_visited}\n'
        f'Откуда пришёл: {referrer}\n'
        f'Время на сайте: {time_str}\n'
        f'Устройство: {device}\n'
        f'UTM-метки: {utm_str}\n'
        f'IP: {source_ip}'
    )

    webhook_url = os.environ['BITRIX24_WEBHOOK_URL'].rstrip('/')

    fields = {
        'TITLE': 'Анонимный посетитель сайта',
        'COMMENTS': comments,
        'SOURCE_ID': 'WEB',
        'STATUS_ID': 'NEW',
    }

    target_url = f'{webhook_url}/crm.lead.add.json'
    print(f'[track-visit] POST {target_url}')

    payload = json.dumps({'fields': fields}).encode('utf-8')
    req = urllib.request.Request(
        target_url,
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )

    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f'[track-visit] Error: {e}')
        return {
            'statusCode': 502,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'ok': False, 'error': str(e)})
        }

    lead_id = result.get('result')

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'ok': True, 'lead_id': lead_id})
    }