import base64
import json
import os
import urllib.request

import psycopg2


def _save_visit(visitor: dict, source_ip: str) -> None:
    """Сохраняет визит в site_visits (источник перехода + поведение).
    Дедупликация по visit_key, чтобы повторные beacon'ы одного визита
    не плодили строки. Ошибки записи не должны ронять основной флоу."""
    dsn = os.environ.get('DATABASE_URL')
    if not dsn:
        return

    attr = visitor.get('attribution') or {}
    source_type = (attr.get('sourceType') or 'direct')[:24]
    source_label = (attr.get('sourceLabel') or 'Прямой заход')[:160]
    referrer = visitor.get('referrer') or attr.get('referrer') or None
    utm_source = (visitor.get('utmSource') or attr.get('utmSource') or '')[:120] or None
    utm_medium = (visitor.get('utmMedium') or attr.get('utmMedium') or '')[:120] or None
    utm_campaign = (visitor.get('utmCampaign') or attr.get('utmCampaign') or '')[:120] or None
    landing_path = (visitor.get('landingPath') or attr.get('landingPath') or '')[:255] or None
    pages = ' → '.join(visitor.get('pages', [])) or None
    device = (visitor.get('device') or '')[:24] or None
    time_on_site = int(visitor.get('timeOnSite') or 0)
    user_agent = visitor.get('userAgent') or None
    visit_key = (visitor.get('visitKey') or '')[:80] or None

    conn = psycopg2.connect(dsn)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO site_visits "
                "(source_type, source_label, referrer, utm_source, utm_medium, "
                " utm_campaign, landing_path, pages, device, time_on_site, ip, "
                " user_agent, visit_key) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) "
                "ON CONFLICT (visit_key) DO UPDATE SET "
                "  pages = EXCLUDED.pages, "
                "  time_on_site = EXCLUDED.time_on_site",
                (source_type, source_label, referrer, utm_source, utm_medium,
                 utm_campaign, landing_path, pages, device, time_on_site,
                 source_ip, user_agent, visit_key),
            )
        conn.commit()
    finally:
        conn.close()


def _visit_summary(visitor: dict, source_ip: str) -> str:
    """Текстовое описание одного визита для CRM."""
    pages_visited = ' → '.join(visitor.get('pages', [])) or '—'
    referrer = visitor.get('referrer', '—')
    time_on_site = int(visitor.get('timeOnSite') or 0)
    minutes, seconds = time_on_site // 60, time_on_site % 60
    time_str = f'{minutes} мин {seconds} сек' if minutes else f'{seconds} сек'
    device = visitor.get('device', '—')
    attr = visitor.get('attribution') or {}
    source_str = attr.get('sourceLabel') or '—'

    utm_parts = []
    if visitor.get('utmSource'):
        utm_parts.append(f"utm_source={visitor['utmSource']}")
    if visitor.get('utmMedium'):
        utm_parts.append(f"utm_medium={visitor['utmMedium']}")
    if visitor.get('utmCampaign'):
        utm_parts.append(f"utm_campaign={visitor['utmCampaign']}")
    utm_str = ', '.join(utm_parts) if utm_parts else '—'

    return (
        f'Путь по сайту: {pages_visited}\n'
        f'Источник: {source_str}\n'
        f'Откуда пришёл: {referrer}\n'
        f'Время на сайте: {time_str}\n'
        f'Устройство: {device}\n'
        f'UTM-метки: {utm_str}\n'
        f'IP: {source_ip}'
    )


def _ip_lead_lookup(source_ip: str):
    """Возвращает (известен_ли_ip, bitrix_lead_id) для IP из crm_ip_leads.
    Если IP нет в таблице — (False, None)."""
    dsn = os.environ.get('DATABASE_URL')
    if not dsn or not source_ip:
        return False, None
    conn = psycopg2.connect(dsn)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT bitrix_lead_id FROM crm_ip_leads WHERE ip = %s",
                (source_ip,),
            )
            row = cur.fetchone()
            if row is None:
                return False, None
            return True, row[0]
    finally:
        conn.close()


def _ip_lead_remember(source_ip: str, lead_id) -> None:
    """Создаёт/обновляет запись IP → лид. При повторе увеличивает счётчик."""
    dsn = os.environ.get('DATABASE_URL')
    if not dsn or not source_ip:
        return
    conn = psycopg2.connect(dsn)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO crm_ip_leads (ip, bitrix_lead_id, visits_count, first_at, last_at) "
                "VALUES (%s, %s, 1, now(), now()) "
                "ON CONFLICT (ip) DO UPDATE SET "
                "  visits_count = crm_ip_leads.visits_count + 1, "
                "  last_at = now(), "
                "  bitrix_lead_id = COALESCE(crm_ip_leads.bitrix_lead_id, EXCLUDED.bitrix_lead_id)",
                (source_ip, lead_id),
            )
        conn.commit()
    finally:
        conn.close()


def _bitrix_request(webhook_url: str, method: str, payload: dict) -> dict:
    """POST к методу Битрикс24, возвращает распарсенный JSON."""
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        f'{webhook_url}/{method}.json',
        data=data,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))


def _push_bitrix_lead(visitor: dict, source_ip: str):
    """Создаёт анонимный лид в Битрикс24. Возвращает ID лида или None."""
    webhook_url = os.environ.get('BITRIX24_WEBHOOK_URL')
    if not webhook_url:
        return None
    webhook_url = webhook_url.rstrip('/')

    comments = 'Анонимный посетитель покинул сайт без заявки\n\n' + _visit_summary(visitor, source_ip)
    fields = {
        'TITLE': 'Анонимный посетитель сайта',
        'COMMENTS': comments,
        'SOURCE_ID': 'WEB',
        'STATUS_ID': 'NEW',
    }
    res = _bitrix_request(webhook_url, 'crm.lead.add', {'fields': fields})
    return res.get('result')


def _append_bitrix_visit(lead_id, visitor: dict, source_ip: str) -> None:
    """Добавляет в существующий лид запись о повторном визите того же IP
    (комментарий в таймлайн). Если lead_id неизвестен — ничего не делает."""
    webhook_url = os.environ.get('BITRIX24_WEBHOOK_URL')
    if not webhook_url or not lead_id:
        return
    webhook_url = webhook_url.rstrip('/')
    comment = 'Повторный визит того же посетителя (IP уже в базе)\n\n' + _visit_summary(visitor, source_ip)
    _bitrix_request(webhook_url, 'crm.timeline.comment.add', {
        'fields': {
            'ENTITY_ID': lead_id,
            'ENTITY_TYPE': 'lead',
            'COMMENT': comment,
        }
    })


def handler(event: dict, context) -> dict:
    """Принимает данные о визите: пишет статистику в БД (site_visits).
    Для анонимных посетителей работает с CRM по дедупликации IP: если IP уже
    был в базе (crm_ip_leads) — дописывает визит в историю существующего лида,
    иначе создаёт новый лид и запоминает связь IP → лид. Заходы своих
    (авторизованные, внутренние, превью poehali.dev) в CRM не попадают."""
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
            'body': '',
        }

    # Тело может прийти base64-кодированным (navigator.sendBeacon / прокси).
    raw = event.get('body') or '{}'
    if event.get('isBase64Encoded'):
        try:
            raw = base64.b64decode(raw).decode('utf-8')
        except Exception:
            raw = '{}'
    try:
        body = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        body = {}
    visitor = body.get('visitor', {})
    source_ip = event.get('requestContext', {}).get('identity', {}).get('sourceIp', '—')

    saved = False
    try:
        _save_visit(visitor, source_ip)
        saved = True
    except Exception as e:
        print(f'[track-visit] DB error: {e}')

    # Заход через превью редактора poehali.dev не должен порождать лид в CRM.
    # Проверяем явный флаг с фронта и подстраховываемся по referrer.
    referrer = (visitor.get('referrer') or '').lower()
    is_preview = bool(visitor.get('isPreview')) or 'poehali.dev' in referrer

    # Авторизованные посетители («свои») не должны создавать анонимный лид/сделку.
    # Статистику визита при этом пишем всегда (см. _save_visit выше).
    is_authenticated = bool(visitor.get('isAuthenticated'))

    # Внутренний переход по нашему же домену (диплом-инж.рф в punycode) —
    # это навигация по сайту, а не новый посетитель: лид не создаём.
    attr = visitor.get('attribution') or {}
    source_type = (attr.get('sourceType') or '').lower()
    is_internal = (
        source_type == 'internal'
        or 'xn----gtbhgbqhkfi' in referrer
        or 'xn--p1ai' in referrer
    )

    # Работа с CRM — только если посетитель НЕ отправлял форму (иначе по нему
    # уже создан именной лид через create-lead), это не превью, не авторизован
    # и не внутренний переход.
    crm_action = 'skipped'
    if (not visitor.get('formSubmitted')
            and not is_preview
            and not is_authenticated
            and not is_internal):
        try:
            # Дедупликация по IP: если IP уже был в базе — не создаём новый лид,
            # а дописываем визит в историю существующего лида. Иначе — новый лид.
            known, lead_id = _ip_lead_lookup(source_ip)
            if known:
                _append_bitrix_visit(lead_id, visitor, source_ip)
                _ip_lead_remember(source_ip, lead_id)
                crm_action = 'appended'
            else:
                new_lead_id = _push_bitrix_lead(visitor, source_ip)
                _ip_lead_remember(source_ip, new_lead_id)
                crm_action = 'created'
        except Exception as e:
            print(f'[track-visit] Bitrix error: {e}')
            crm_action = 'error'

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'ok': True, 'saved': saved, 'crm': crm_action}),
    }