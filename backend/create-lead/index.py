import json
import os
import urllib.request
import urllib.parse

def handler(event: dict, context) -> dict:
    """Создаёт лид в Битрикс24 из данных формы заявки с сайта."""
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

    name = body.get('name', '')
    contact = body.get('contact', '')
    university = body.get('university', '')
    topic = body.get('topic', '')
    time_left = body.get('timeLeft', '')
    has_chapters = body.get('hasChapters', '')
    pages_ready = body.get('pagesReady', '')
    has_comments = body.get('hasComments', '')
    comments_text = body.get('commentsText', '')

    time_labels = {
        '3+': 'Больше 3 месяцев',
        '1-3': '1–3 месяца',
        '2-4w': '2–4 недели',
        '<1w': 'Меньше недели',
        'unknown': 'Не знаю точно',
    }
    time_str = time_labels.get(time_left, time_left)

    comments_block = ''
    if has_comments == 'yes' and comments_text:
        comments_block = f'\nЗамечания руководителя: {comments_text}'

    chapters_block = ''
    if has_chapters == 'yes':
        chapters_block = f'\nСтраниц готово: {pages_ready}' if pages_ready else '\nЕсть написанные главы'

    comments = (
        f'Время до защиты: {time_str}\n'
        f'Университет/кафедра: {university}\n'
        f'Тема ВКР: {topic}'
        f'{chapters_block}'
        f'{comments_block}'
    )

    webhook_url = os.environ['BITRIX24_WEBHOOK_URL'].rstrip('/')

    phone_value = contact if contact.startswith('+') or contact[0].isdigit() else None
    telegram_value = contact if contact.startswith('@') else None

    fields = {
        'TITLE': f'Заявка с сайта: {name}',
        'NAME': name,
        'COMMENTS': comments,
        'SOURCE_ID': 'WEB',
    }

    if phone_value:
        fields['PHONE'] = [{'VALUE': phone_value, 'VALUE_TYPE': 'WORK'}]
    if telegram_value:
        fields['IM'] = [{'VALUE': telegram_value, 'VALUE_TYPE': 'TELEGRAM'}]
    if not phone_value and not telegram_value:
        fields['PHONE'] = [{'VALUE': contact, 'VALUE_TYPE': 'WORK'}]

    target_url = f'{webhook_url}/crm.lead.add.json'
    print(f'[create-lead] POST {target_url}')

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
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f'[create-lead] HTTP {e.code}: {error_body}')
        return {
            'statusCode': 502,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'ok': False, 'error': f'HTTP {e.code}', 'detail': error_body})
        }

    lead_id = result.get('result')

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'ok': True, 'lead_id': lead_id})
    }