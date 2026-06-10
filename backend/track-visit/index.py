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


def _push_bitrix_lead(visitor: dict, source_ip: str) -> None:
    """Создаёт анонимный лид в Битрикс24 (если настроен вебхук)."""
    webhook_url = os.environ.get('BITRIX24_WEBHOOK_URL')
    if not webhook_url:
        return
    webhook_url = webhook_url.rstrip('/')

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

    comments = (
        f'Анонимный посетитель покинул сайт без заявки\n\n'
        f'Путь по сайту: {pages_visited}\n'
        f'Источник: {source_str}\n'
        f'Откуда пришёл: {referrer}\n'
        f'Время на сайте: {time_str}\n'
        f'Устройство: {device}\n'
        f'UTM-метки: {utm_str}\n'
        f'IP: {source_ip}'
    )

    fields = {
        'TITLE': 'Анонимный посетитель сайта',
        'COMMENTS': comments,
        'SOURCE_ID': 'WEB',
        'STATUS_ID': 'NEW',
    }
    payload = json.dumps({'fields': fields}).encode('utf-8')
    req = urllib.request.Request(
        f'{webhook_url}/crm.lead.add.json',
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    with urllib.request.urlopen(req) as resp:
        json.loads(resp.read().decode('utf-8'))


def handler(event: dict, context) -> dict:
    """Принимает данные о визите: пишет статистику в БД (site_visits) и
    создаёт анонимный лид в Битрикс24, если посетитель ушёл без заявки."""
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

    body = json.loads(event.get('body', '{}'))
    visitor = body.get('visitor', {})
    source_ip = event.get('requestContext', {}).get('identity', {}).get('sourceIp', '—')

    saved = False
    try:
        _save_visit(visitor, source_ip)
        saved = True
    except Exception as e:
        print(f'[track-visit] DB error: {e}')

    # Анонимный лид в CRM — только если посетитель НЕ отправлял форму
    # (иначе по нему уже создан именной лид через create-lead).
    if not visitor.get('formSubmitted'):
        try:
            _push_bitrix_lead(visitor, source_ip)
        except Exception as e:
            print(f'[track-visit] Bitrix error: {e}')

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'ok': True, 'saved': saved}),
    }