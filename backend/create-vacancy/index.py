import json
import os
import urllib.request

def handler(event: dict, context) -> dict:
    """Создаёт лид-вакансию наставника в Битрикс24 из данных формы."""
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
    education = body.get('education', '')
    experience = body.get('experience', '')
    about = body.get('about', '')
    resume_link = body.get('resumeLink', '')
    specialization = body.get('specialization', '')

    comments_parts = [
        f'Образование/вуз: {education}' if education else '',
        f'Опыт в преподавании/наставничестве: {experience}' if experience else '',
        f'О себе / почему хочет к нам: {about}' if about else '',
        f'Ссылка на резюме/портфолио: {resume_link}' if resume_link else '',
        f'Специализация/темы ВКР: {specialization}' if specialization else '',
    ]
    comments = '\n'.join([p for p in comments_parts if p])

    webhook_url = os.environ['BITRIX24_WEBHOOK_URL'].rstrip('/')

    is_phone = contact and (contact.startswith('+') or (contact and contact[0].isdigit()))
    is_telegram = contact.startswith('@')
    is_email = '@' in contact and not is_telegram

    fields = {
        'TITLE': f'Вакансия Наставник: {name}',
        'NAME': name,
        'COMMENTS': comments,
        'SOURCE_ID': 'WEB',
        'SOURCE_DESCRIPTION': 'Заявка на вакансию наставника с сайта',
        'STATUS_ID': 'NEW',
    }

    if is_phone:
        fields['PHONE'] = [{'VALUE': contact, 'VALUE_TYPE': 'WORK'}]
    elif is_telegram:
        fields['IM'] = [{'VALUE': contact, 'VALUE_TYPE': 'TELEGRAM'}]
    elif is_email:
        fields['EMAIL'] = [{'VALUE': contact, 'VALUE_TYPE': 'WORK'}]
    else:
        fields['PHONE'] = [{'VALUE': contact, 'VALUE_TYPE': 'WORK'}]

    target_url = f'{webhook_url}/crm.lead.add.json'
    print(f'[create-vacancy] POST {target_url}')

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
        print(f'[create-vacancy] Error: {e}')
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
