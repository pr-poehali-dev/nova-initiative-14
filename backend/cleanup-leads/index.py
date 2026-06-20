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


# Карта сущностей CRM: разные REST-методы.
ENTITIES = {
    'lead': {'list': 'crm.lead.list', 'get': 'crm.lead.get', 'delete': 'crm.lead.delete'},
    'deal': {'list': 'crm.deal.list', 'get': 'crm.deal.get', 'delete': 'crm.deal.delete'},
    'contact': {'list': 'crm.contact.list', 'get': 'crm.contact.get', 'delete': 'crm.contact.delete'},
}

# Признаки «моего» захода (не реальная заявка):
#  - заголовок «Анонимный посетитель сайта»;
#  - в тексте есть превью-домен poehali.dev или наш домен (внутренний переход).
ANON_TITLE = 'анонимный посетитель'
SELF_MARKERS = ('poehali.dev', 'xn----gtbhgbqhkfi', 'xn--p1ai', 'внутренний переход')


def _is_self_visit(item: dict) -> bool:
    """True, если запись — анонимный/внутренний/превью-заход (не реальная заявка)."""
    title = (item.get('TITLE') or '').lower()
    if ANON_TITLE in title:
        return True
    blob = ((item.get('COMMENTS') or '') + ' ' + (item.get('SOURCE_DESCRIPTION') or '')).lower()
    return any(m in blob for m in SELF_MARKERS)


def _find_self_items(webhook_url: str, entity: str) -> tuple:
    """Перебирает все элементы сущности и возвращает (ids_для_удаления,
    contact_ids_связанные). Реальные заявки («Заявка с сайта», «Вакансия»)
    не помечаются на удаление."""
    method = ENTITIES[entity]['list']
    select = ['ID', 'TITLE', 'COMMENTS', 'SOURCE_DESCRIPTION']
    if entity == 'deal':
        select.append('CONTACT_ID')
    ids = []
    contact_ids = set()
    start = 0
    while True:
        result = _bitrix_call(webhook_url, method, {'select': select, 'start': start})
        items = result.get('result') or []
        for it in items:
            if _is_self_visit(it):
                ids.append(int(it['ID']))
                cid = it.get('CONTACT_ID')
                if cid:
                    contact_ids.add(int(cid))
        nxt = result.get('next')
        if nxt is None:
            break
        start = nxt
        time.sleep(0.1)
    return ids, contact_ids


def _delete_batch_fast(webhook_url: str, entity: str, ids: list) -> dict:
    """Быстрое удаление пакетами по 50 через batch (без проверки get).
    Подходит для больших объёмов (контакты). Возвращает счётчики."""
    delete_method = ENTITIES[entity]['delete']
    deleted = 0
    errors = []
    for i in range(0, len(ids), 50):
        chunk = ids[i:i + 50]
        cmd = {f'd{item_id}': f'{delete_method}?id={item_id}' for item_id in chunk}
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
        time.sleep(0.2)
    return {'deleted': deleted, 'skipped': 0, 'errors': errors[:20]}


def _delete_verified(webhook_url: str, entity: str, ids: list) -> dict:
    """Удаляет элементы по одному с проверкой через get (надёжно, без «фантомов»
    из рассинхронизированного индекса list). Возвращает счётчики."""
    get_method = ENTITIES[entity]['get']
    delete_method = ENTITIES[entity]['delete']
    deleted = 0
    skipped = 0
    errors = []
    for item_id in ids:
        res = _bitrix_call(webhook_url, get_method, {'id': item_id})
        if not res.get('result'):
            skipped += 1  # уже удалён
            continue
        dres = _bitrix_call(webhook_url, delete_method, {'id': item_id})
        if dres.get('result') is True:
            deleted += 1
        else:
            errors.append({'id': item_id, 'error': dres.get('error_description', 'unknown')})
        time.sleep(0.05)
    return {'deleted': deleted, 'skipped': skipped, 'errors': errors}


def handler(event: dict, context) -> dict:
    """Чистит из Битрикс24 записи, относящиеся к собственным заходам на сайт
    (анонимные/внутренние/превью), оставляя только реальные заявки.

    GET  ?action=preview&entity=deal|lead|contact — показать кандидатов.
    GET  ?action=inspect&entity=...&id=N          — поля одного элемента.
    POST ?action=delete&entity=deal|lead|contact  — удалить по одной сущности.
    POST ?action=clean_anon                       — удалить сделки, их контакты и лиды.
    """
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

    if action == 'inspect':
        res = _bitrix_call(webhook_url, ENTITIES[entity]['get'], {'id': params.get('id')})
        return _resp({'ok': True, 'entity': entity, 'item': res.get('result')})

    # Комплексная очистка: сделки → связанные контакты → лиды, по одному вызову.
    if action == 'clean_anon' and method == 'POST':
        report = {}
        # 1) Сделки + сбор их контактов.
        deal_ids, contact_ids = _find_self_items(webhook_url, 'deal')
        report['deal'] = _delete_verified(webhook_url, 'deal', deal_ids)
        # 2) Контакты: связанные со сделками + анонимные по своим признакам.
        extra_contact_ids, _ = _find_self_items(webhook_url, 'contact')
        all_contacts = list(set(list(contact_ids) + extra_contact_ids))
        report['contact'] = _delete_verified(webhook_url, 'contact', all_contacts)
        # 3) Лиды.
        lead_ids, _ = _find_self_items(webhook_url, 'lead')
        report['lead'] = _delete_verified(webhook_url, 'lead', lead_ids)
        return _resp({'ok': True, 'report': report})

    ids, contact_ids = _find_self_items(webhook_url, entity)

    if action == 'delete' and method == 'POST':
        result = _delete_verified(webhook_url, entity, ids)
        return _resp({'ok': True, 'entity': entity, 'found': len(ids), **result})

    # Быстрое удаление пакетами (для больших объёмов, напр. контактов).
    if action == 'delete_fast' and method == 'POST':
        result = _delete_batch_fast(webhook_url, entity, ids)
        return _resp({'ok': True, 'entity': entity, 'found': len(ids), **result})

    # Удаление с тайм-бюджетом: гарантированно возвращает отчёт до таймаута
    # шлюза. Удаляет batch'ами не дольше budget секунд, остаток вернёт в next.
    if action == 'purge' and method == 'POST':
        budget = 20.0
        t0 = time.time()
        deleted = 0
        errors = []
        delete_method = ENTITIES[entity]['delete']
        for i in range(0, len(ids), 50):
            if time.time() - t0 > budget:
                break
            chunk = ids[i:i + 50]
            cmd = {f'd{x}': f'{delete_method}?id={x}' for x in chunk}
            res = _bitrix_call(webhook_url, 'batch', {'halt': 0, 'cmd': cmd})
            result = (res.get('result') or {})
            ok_map = result.get('result') or {}
            err_map = result.get('result_error') or {}
            for x in chunk:
                k = f'd{x}'
                if err_map.get(k):
                    errors.append({'id': x, 'error': str(err_map[k])})
                elif ok_map.get(k) is True or k in ok_map:
                    deleted += 1
            time.sleep(0.15)
        return _resp({
            'ok': True, 'entity': entity,
            'found': len(ids), 'deleted': deleted,
            'errors': errors[:10],
        })

    return _resp({
        'ok': True, 'entity': entity,
        'found': len(ids), 'ids': ids[:300],
        'linked_contacts': len(contact_ids),
    })