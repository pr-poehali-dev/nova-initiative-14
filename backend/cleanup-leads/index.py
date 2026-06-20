import json
import os
import time
import urllib.request
import urllib.error


def _bitrix_call(webhook_url: str, method: str, params: dict) -> dict:
    """Вызывает метод Битрикс24 REST API. Возвращает распарсенный JSON."""
    url = f'{webhook_url}/{method}.json'
    data = json.dumps(params).encode('utf-8')
    req = urllib.request.Request(
        url, data=data,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=25) as resp:
        return json.loads(resp.read().decode('utf-8'))


def _find_preview_leads(webhook_url: str) -> list:
    """Находит ID лидов, в тексте которых есть poehali.dev (заходы через превью
    редактора, в т.ч. preview--*.poehali.dev). Битрикс не умеет искать подстроку
    фильтром, поэтому перебираем все лиды постранично и фильтруем на своей стороне.
    Заголовок НЕ фиксируем — превью-лиды могли создаваться с разными TITLE.
    Реальные заявки с сайта не содержат poehali.dev в комментарии, поэтому
    под фильтр попадают только превью-заходы."""
    ids = []
    start = 0
    while True:
        result = _bitrix_call(webhook_url, 'crm.lead.list', {
            'select': ['ID', 'COMMENTS', 'SOURCE_DESCRIPTION'],
            'start': start,
        })
        leads = result.get('result') or []
        for lead in leads:
            blob = (
                (lead.get('COMMENTS') or '') + ' ' +
                (lead.get('SOURCE_DESCRIPTION') or '')
            ).lower()
            if 'poehali.dev' in blob:
                ids.append(int(lead['ID']))
        nxt = result.get('next')
        if nxt is None:
            break
        start = nxt
        time.sleep(0.1)  # бережём лимит запросов Битрикс
    return ids


def _delete_leads_batch(webhook_url: str, ids: list) -> dict:
    """Удаляет лиды пакетами по 50 через метод batch (быстро, в рамках таймаута).
    Возвращает счётчики успехов и ошибок."""
    deleted = 0
    errors = []
    for i in range(0, len(ids), 50):
        chunk = ids[i:i + 50]
        cmd = {f'd{lead_id}': f'crm.lead.delete?id={lead_id}' for lead_id in chunk}
        try:
            res = _bitrix_call(webhook_url, 'batch', {'halt': 0, 'cmd': cmd})
            result = (res.get('result') or {})
            ok_map = result.get('result') or {}
            err_map = result.get('result_error') or {}
            for lead_id in chunk:
                key = f'd{lead_id}'
                if err_map.get(key):
                    errors.append({'id': lead_id, 'error': str(err_map[key])})
                elif ok_map.get(key) is True or key in ok_map:
                    deleted += 1
        except Exception as e:
            errors.append({'chunk_start': chunk[0], 'error': str(e)})
        time.sleep(0.3)
    return {'deleted': deleted, 'errors': errors}


def handler(event: dict, context) -> dict:
    """Массово удаляет из Битрикс24 лиды «Анонимный посетитель» с упоминанием
    poehali.dev в комментарии (заходы через превью редактора).
    GET ?action=preview — только показать количество и ID (без удаления).
    POST ?action=delete — найти и удалить."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
            'body': '',
        }

    webhook_url = os.environ['BITRIX24_WEBHOOK_URL'].rstrip('/')
    params = event.get('queryStringParameters') or {}
    action = params.get('action', 'preview')

    # Диагностика: общее число лидов и пример первой страницы с полями,
    # чтобы понять, в каком поле лежит referrer (preview--*.poehali.dev).
    if action == 'debug':
        all_leads = []
        start = 0
        while True:
            page = _bitrix_call(webhook_url, 'crm.lead.list', {
                'select': ['ID', 'TITLE', 'COMMENTS', 'SOURCE_DESCRIPTION'],
                'start': start,
            })
            chunk = page.get('result') or []
            all_leads.extend(chunk)
            nxt = page.get('next')
            if nxt is None:
                break
            start = nxt
            time.sleep(0.1)
        # Показываем полный текст COMMENTS у первых «Анонимных» лидов,
        # чтобы увидеть, где реально лежит referrer preview--*.poehali.dev.
        anon = [l for l in all_leads if (l.get('TITLE') or '').startswith('Анонимный')][:4]
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({
                'ok': True,
                'total_fetched': len(all_leads),
                'anon_samples': [{
                    'id': l['ID'],
                    'comments': l.get('COMMENTS'),
                    'source_description': l.get('SOURCE_DESCRIPTION'),
                } for l in anon],
            }, ensure_ascii=False),
        }

    ids = _find_preview_leads(webhook_url)

    if action == 'delete' and method == 'POST':
        result = _delete_leads_batch(webhook_url, ids)
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({
                'ok': True,
                'found': len(ids),
                'deleted': result['deleted'],
                'errors': result['errors'],
            }, ensure_ascii=False),
        }

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps({'ok': True, 'found': len(ids), 'ids': ids}, ensure_ascii=False),
    }