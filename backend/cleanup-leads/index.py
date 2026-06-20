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
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        # Битрикс отвечает 400 с JSON-телом ошибки (например, элемент не найден).
        try:
            return json.loads(e.read().decode('utf-8'))
        except Exception:
            return {'error': f'HTTP {e.code}'}


# Карта сущностей: lead (лиды) и deal (сделки) имеют разные REST-методы.
ENTITIES = {
    'lead': {'list': 'crm.lead.list', 'get': 'crm.lead.get', 'delete': 'crm.lead.delete'},
    'deal': {'list': 'crm.deal.list', 'get': 'crm.deal.get', 'delete': 'crm.deal.delete'},
}


def _find_preview_items(webhook_url: str, entity: str) -> list:
    """Находит ID элементов (лидов или сделок), в тексте которых есть poehali.dev
    (заходы через превью редактора, в т.ч. preview--*.poehali.dev).
    Битрикс не умеет искать подстроку фильтром, поэтому перебираем все элементы
    постранично и фильтруем на своей стороне по COMMENTS и SOURCE_DESCRIPTION.
    Реальные заявки с сайта не содержат poehali.dev, поэтому под фильтр попадают
    только превью-заходы."""
    method = ENTITIES[entity]['list']
    ids = []
    start = 0
    while True:
        result = _bitrix_call(webhook_url, method, {
            'select': ['ID', 'COMMENTS', 'SOURCE_DESCRIPTION'],
            'start': start,
        })
        items = result.get('result') or []
        for it in items:
            blob = (
                (it.get('COMMENTS') or '') + ' ' +
                (it.get('SOURCE_DESCRIPTION') or '')
            ).lower()
            if 'poehali.dev' in blob:
                ids.append(int(it['ID']))
        nxt = result.get('next')
        if nxt is None:
            break
        start = nxt
        time.sleep(0.1)  # бережём лимит запросов Битрикс
    return ids


def _delete_items_batch(webhook_url: str, entity: str, ids: list) -> dict:
    """Удаляет элементы пакетами по 50 через метод batch (быстро, в таймаут)."""
    delete_method = ENTITIES[entity]['delete']
    deleted = 0
    errors = []
    for i in range(0, len(ids), 50):
        chunk = ids[i:i + 50]
        cmd = {f'd{item_id}': f'{delete_method}?id={item_id}' for item_id in chunk}
        try:
            res = _bitrix_call(webhook_url, 'batch', {'halt': 0, 'cmd': cmd})
            result = (res.get('result') or {})
            ok_map = result.get('result') or {}
            err_map = result.get('result_error') or {}
            for item_id in chunk:
                key = f'd{item_id}'
                if err_map.get(key):
                    errors.append({'id': item_id, 'error': str(err_map[key])})
                elif ok_map.get(key) is True or key in ok_map:
                    deleted += 1
        except Exception as e:
            errors.append({'chunk_start': chunk[0], 'error': str(e)})
        time.sleep(0.3)
    return {'deleted': deleted, 'errors': errors}


def handler(event: dict, context) -> dict:
    """Массово удаляет из Битрикс24 лиды/сделки с упоминанием poehali.dev
    (анонимные заходы через превью редактора).
    Параметр entity=lead|deal (по умолчанию deal — анонимные посетители
    создаются как сделки).
    GET ?action=preview — показать количество и ID (без удаления).
    GET ?action=inspect&id=N — показать все поля одного элемента.
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
    entity = params.get('entity', 'deal')
    if entity not in ENTITIES:
        entity = 'deal'

    def _resp(payload):
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps(payload, ensure_ascii=False),
        }

    # Проверка одного элемента по ID: показываем все его поля.
    if action == 'inspect':
        res = _bitrix_call(webhook_url, ENTITIES[entity]['get'], {'id': params.get('id')})
        return _resp({'ok': True, 'entity': entity, 'item': res.get('result')})

    # Точечное удаление одного элемента с сырым ответом Битрикса (диагностика).
    if action == 'delete_one':
        res = _bitrix_call(webhook_url, ENTITIES[entity]['delete'], {'id': params.get('id')})
        return _resp({'ok': True, 'entity': entity, 'raw': res})

    # Реально живые элементы из списка превью: list-индекс Битрикса может
    # отдавать «фантомов» (рассинхрон индекса), поэтому проверяем каждый ID
    # через get и при необходимости сразу удаляем существующие.
    if action == 'verify_delete' and method == 'POST':
        candidate_ids = _find_preview_items(webhook_url, entity)
        get_method = ENTITIES[entity]['get']
        delete_method = ENTITIES[entity]['delete']
        alive = []
        for item_id in candidate_ids:
            res = _bitrix_call(webhook_url, get_method, {'id': item_id})
            if res.get('result'):
                alive.append(item_id)
        deleted = 0
        errors = []
        for item_id in alive:
            res = _bitrix_call(webhook_url, delete_method, {'id': item_id})
            if res.get('result') is True:
                deleted += 1
            else:
                errors.append({'id': item_id, 'error': res.get('error_description', 'unknown')})
        return _resp({
            'ok': True, 'entity': entity,
            'candidates': len(candidate_ids),
            'alive': len(alive),
            'deleted': deleted,
            'errors': errors,
        })

    ids = _find_preview_items(webhook_url, entity)

    if action == 'delete' and method == 'POST':
        result = _delete_items_batch(webhook_url, entity, ids)
        return _resp({
            'ok': True,
            'entity': entity,
            'found': len(ids),
            'deleted': result['deleted'],
            'errors': result['errors'],
        })

    return _resp({'ok': True, 'entity': entity, 'found': len(ids), 'ids': ids})