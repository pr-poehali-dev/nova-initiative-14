"""
Биллинг виджета (постоплата «в долг» + перерасход +50%).

Модель:
  - У партнёра есть тариф (plan), цена (monthly_price_rub) и месячный лимит
    расчётов (monthly_calc_limit) — суммарный по всем посетителям.
  - На каждый календарный месяц заводится строка widget_billing_periods.
    Новый месяц открывается АВТОМАТИЧЕСКИ при первом обращении в нём —
    даже если прошлый не оплачен (постоплата в долг).
  - При открытии периода сразу начисляется base_price_rub (amount_due).
  - Каждый расчёт инкрементит calc_used. Когда calc_used превышает лимит
    (с учётом доп-пакетов), начисляется доп-пакет: +50% цены и +50% лимита.
  - Долг партнёра = сумма (amount_due - amount_paid) по всем периодам.
  - Оплата вносится владельцем вручную (widget_payments) и гасит долг.

Все функции принимают открытое psycopg2-соединение conn и не коммитят сами,
кроме помеченных (_record_payment коммитит). Ошибки наружу не прячем —
вызывающий решает, что делать.
"""
import datetime


def _month_bounds(today: datetime.date):
    """Возвращает (первый_день_месяца, последний_день_месяца)."""
    start = today.replace(day=1)
    if start.month == 12:
        nxt = start.replace(year=start.year + 1, month=1)
    else:
        nxt = start.replace(month=start.month + 1)
    end = nxt - datetime.timedelta(days=1)
    return start, end


def get_or_open_period(conn, partner: dict) -> dict:
    """Возвращает текущий (этого месяца) биллинг-период партнёра, открывая его
    при необходимости. partner — dict с id, plan, monthly_price_rub,
    monthly_calc_limit."""
    today = datetime.date.today()
    start, end = _month_bounds(today)

    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, plan, base_price_rub, calc_limit, calc_used, extra_packs, "
            "amount_due, amount_paid, status, notified_80, notified_100, "
            "period_start, period_end "
            "FROM widget_billing_periods "
            "WHERE partner_id = %s AND period_start = %s",
            (partner['id'], start),
        )
        row = cur.fetchone()
        if row:
            return _row_to_period(row)

        # Открываем новый период: сразу начисляем цену тарифа (постоплата).
        base_price = partner['monthly_price_rub']
        calc_limit = partner['monthly_calc_limit']
        cur.execute(
            "INSERT INTO widget_billing_periods "
            "(partner_id, period_start, period_end, plan, base_price_rub, "
            " calc_limit, amount_due, status) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, 'open') "
            "RETURNING id, plan, base_price_rub, calc_limit, calc_used, extra_packs, "
            "amount_due, amount_paid, status, notified_80, notified_100, "
            "period_start, period_end",
            (partner['id'], start, end, partner['plan'], base_price,
             calc_limit, base_price),
        )
        conn.commit()
        return _row_to_period(cur.fetchone())


def _row_to_period(row) -> dict:
    return {
        'id': row[0], 'plan': row[1], 'base_price_rub': row[2], 'calc_limit': row[3],
        'calc_used': row[4], 'extra_packs': row[5], 'amount_due': row[6],
        'amount_paid': row[7], 'status': row[8], 'notified_80': row[9],
        'notified_100': row[10], 'period_start': row[11], 'period_end': row[12],
    }


def effective_limit(period: dict) -> int:
    """Лимит с учётом доп-пакетов: каждый доп-пакет = +50% базового лимита."""
    base = period['calc_limit']
    return base + (base // 2) * period['extra_packs']


def register_calc(conn, partner: dict):
    """Учитывает один расчёт в текущем периоде. Возвращает dict:
       {period, charged_extra: bool, reached_80: bool, reached_100: bool}.
       Если расчёт превысил лимит (с учётом пакетов) — начисляет доп-пакет
       (+50% цены и +50% лимита). Коммитит изменения."""
    period = get_or_open_period(conn, partner)
    limit_before = effective_limit(period)

    new_used = period['calc_used'] + 1
    charged_extra = False
    extra_packs = period['extra_packs']
    amount_due = period['amount_due']

    # Перерасход: расчёт за пределами текущего (с пакетами) лимита.
    if new_used > limit_before:
        extra_packs += 1
        # Доп-пакет = +50% от базовой цены тарифа.
        amount_due += period['base_price_rub'] // 2
        charged_extra = True

    # Пороговые уведомления считаем по новому лимиту.
    limit_after = period['calc_limit'] + (period['calc_limit'] // 2) * extra_packs
    pct = (new_used / limit_after) if limit_after else 1.0
    reached_80 = (not period['notified_80']) and pct >= 0.8 and pct < 1.0
    reached_100 = (not period['notified_100']) and new_used >= limit_after

    with conn.cursor() as cur:
        cur.execute(
            "UPDATE widget_billing_periods SET calc_used = %s, extra_packs = %s, "
            "amount_due = %s, "
            "notified_80 = notified_80 OR %s, notified_100 = notified_100 OR %s, "
            "updated_at = now() WHERE id = %s",
            (new_used, extra_packs, amount_due, reached_80, reached_100, period['id']),
        )
    conn.commit()

    period['calc_used'] = new_used
    period['extra_packs'] = extra_packs
    period['amount_due'] = amount_due
    return {
        'period': period,
        'charged_extra': charged_extra,
        'reached_80': reached_80,
        'reached_100': reached_100,
    }


def partner_debt(conn, partner_id: int) -> int:
    """Суммарный долг партнёра по всем периодам: Σ(amount_due - amount_paid)."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT COALESCE(SUM(amount_due - amount_paid), 0) "
            "FROM widget_billing_periods WHERE partner_id = %s",
            (partner_id,),
        )
        return int(cur.fetchone()[0] or 0)


def billing_summary(conn, partner: dict) -> dict:
    """Полная биллинг-сводка для кабинета партнёра."""
    period = get_or_open_period(conn, partner)
    limit = effective_limit(period)
    debt = partner_debt(conn, partner['id'])
    with conn.cursor() as cur:
        cur.execute(
            "SELECT period_start, plan, calc_used, calc_limit, extra_packs, "
            "amount_due, amount_paid, status "
            "FROM widget_billing_periods WHERE partner_id = %s "
            "ORDER BY period_start DESC LIMIT 12",
            (partner['id'],),
        )
        history = [{
            'period_start': r[0].isoformat() if r[0] else None,
            'plan': r[1], 'calc_used': r[2], 'calc_limit': r[3],
            'extra_packs': r[4], 'amount_due': r[5], 'amount_paid': r[6],
            'status': r[7],
        } for r in cur.fetchall()]

    return {
        'plan': period['plan'],
        'period_start': period['period_start'].isoformat() if period['period_start'] else None,
        'period_end': period['period_end'].isoformat() if period['period_end'] else None,
        'calc_used': period['calc_used'],
        'calc_limit': limit,
        'base_limit': period['calc_limit'],
        'extra_packs': period['extra_packs'],
        'amount_due': period['amount_due'],
        'amount_paid': period['amount_paid'],
        'debt': debt,
        'history': history,
    }


def record_payment(conn, partner_id: int, amount: int, note: str,
                   owner_id: int, period_id=None):
    """Вносит оплату партнёра: пишет в widget_payments и гасит долг по периодам
    (от старых к новым). Коммитит."""
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO widget_payments (partner_id, period_id, amount_rub, note, created_by) "
            "VALUES (%s, %s, %s, %s, %s)",
            (partner_id, period_id, amount, note, owner_id),
        )
        # Гасим долг по периодам от старых к новым.
        remaining = amount
        cur.execute(
            "SELECT id, amount_due - amount_paid AS debt FROM widget_billing_periods "
            "WHERE partner_id = %s AND amount_due > amount_paid "
            "ORDER BY period_start ASC",
            (partner_id,),
        )
        rows = cur.fetchall()
        for pid, debt in rows:
            if remaining <= 0:
                break
            pay = min(remaining, int(debt))
            cur.execute(
                "UPDATE widget_billing_periods SET amount_paid = amount_paid + %s, "
                "updated_at = now() WHERE id = %s",
                (pay, pid),
            )
            remaining -= pay
    conn.commit()
