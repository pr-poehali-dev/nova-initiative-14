"""
Рекламные кампании: управление, статистика, заказы печати.

Экшены (требуют is_admin):
  - ad_campaigns_list   — список кампаний со сводной статистикой
  - ad_campaign_save    — создать/обновить кампанию (если не залочена)
  - ad_campaign_print   — зафиксировать заказ печати (+ лочит кампанию)
  - ad_campaigns_overview — сводная эффективность всех источников (для графика)

Доход кампании = сумма оплат (cae_payments status='paid') пользователей,
пришедших по этой метке (signup_utm_campaign), с разбивкой по типу покупки.
Метка к пользователю прикрепляется при регистрации (signup_utm_campaign) —
пользователь её не видит.
"""
import json

import psycopg2.extras

from db_helpers import json_response


def _is_admin(conn, user_id: int) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT is_admin FROM sso_users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        return bool(row and row[0])


def _sanitize_slug(v: str) -> str:
    import re
    v = (v or "").strip().lower().replace(" ", "_")
    return re.sub(r"[^a-z0-9_-]", "", v)[:120]


def _campaign_stats(conn, slug: str) -> dict:
    """Сводная статистика по одной кампании (по utm_campaign = slug)."""
    rc = psycopg2.extras.RealDictCursor
    label_like = f"%{slug}%"
    with conn.cursor(cursor_factory=rc) as cur:
        # Визиты (по utm_campaign в site_visits)
        cur.execute(
            "SELECT COUNT(*) AS c FROM site_visits WHERE utm_campaign = %s",
            (slug,),
        )
        visits = cur.fetchone()["c"]

        # Регистрации (по signup_utm_campaign в sso_users)
        cur.execute(
            "SELECT COUNT(*) AS c FROM sso_users WHERE signup_utm_campaign = %s",
            (slug,),
        )
        signups = cur.fetchone()["c"]

        # Доход с разбивкой по типу покупки (CAE: subscription/package).
        cur.execute(
            "SELECT p.item_type AS t, COALESCE(SUM(p.amount_kopecks),0) AS sum_k, COUNT(*) AS cnt "
            "FROM cae_payments p "
            "JOIN sso_users u ON u.id = p.user_id "
            "WHERE u.signup_utm_campaign = %s AND p.status = 'paid' "
            "GROUP BY p.item_type",
            (slug,),
        )
        revenue_cae = 0
        revenue_by_type = {}
        for r in cur.fetchall():
            revenue_by_type[r["t"]] = int(r["sum_k"])
            revenue_cae += int(r["sum_k"])

        # Сколько в среднем приглашённых от пришедших по кампании
        cur.execute(
            "SELECT COALESCE(AVG(inv.cnt),0) AS avg_inv FROM ("
            "  SELECT u.id, ("
            "    SELECT COUNT(*) FROM sso_users r WHERE r.referred_by_user_id = u.id"
            "  ) AS cnt FROM sso_users u WHERE u.signup_utm_campaign = %s"
            ") inv",
            (slug,),
        )
        avg_invited = float(cur.fetchone()["avg_inv"] or 0)

        # Печать: суммарный тираж и стоимость
        cur.execute(
            "SELECT COALESCE(SUM(o.quantity),0) AS qty, COALESCE(SUM(o.total_kopecks),0) AS cost "
            "FROM ad_campaign_print_orders o "
            "JOIN ad_campaigns c ON c.id = o.campaign_id "
            "WHERE c.slug = %s",
            (slug,),
        )
        prow = cur.fetchone()
        printed = int(prow["qty"])
        print_cost_k = int(prow["cost"])

        # История заказов печати (последние 50, новые сверху).
        cur.execute(
            "SELECT o.id, o.quantity, o.total_kopecks, "
            "to_char(o.created_at,'YYYY-MM-DD HH24:MI') AS created "
            "FROM ad_campaign_print_orders o "
            "JOIN ad_campaigns c ON c.id = o.campaign_id "
            "WHERE c.slug = %s ORDER BY o.created_at DESC LIMIT 50",
            (slug,),
        )
        orders = [
            {
                "id": r["id"],
                "quantity": int(r["quantity"]),
                "total_kopecks": int(r["total_kopecks"]),
                "created": r["created"],
            }
            for r in cur.fetchall()
        ]

    conv = round(signups / visits * 100, 1) if visits else 0.0
    cost_per_signup = round(print_cost_k / 100 / signups, 2) if signups else 0.0
    return {
        "visits": visits,
        "signups": signups,
        "conversion": conv,
        "revenue_kopecks": revenue_cae,
        "revenue_by_type": revenue_by_type,
        "avg_invited": round(avg_invited, 2),
        "printed": printed,
        "print_cost_kopecks": print_cost_k,
        "cost_per_signup_rub": cost_per_signup,
        "unit_price_kopecks": round(print_cost_k / printed) if printed else 0,
        "orders": orders,
    }


def action_ad_campaigns_list(conn, admin_id: int, params: dict) -> dict:
    """Список всех кампаний со сводной статистикой по каждой."""
    if not _is_admin(conn, admin_id):
        return json_response(403, {"error": "forbidden"})
    rc = psycopg2.extras.RealDictCursor
    with conn.cursor(cursor_factory=rc) as cur:
        cur.execute(
            "SELECT id, slug, name, kind, config_jsonb, is_locked, "
            "to_char(created_at,'YYYY-MM-DD') AS created "
            "FROM ad_campaigns ORDER BY created_at DESC"
        )
        rows = cur.fetchall()
    campaigns = []
    for r in rows:
        campaigns.append({
            "id": r["id"],
            "slug": r["slug"],
            "name": r["name"],
            "kind": r["kind"],
            "config": r["config_jsonb"],
            "isLocked": r["is_locked"],
            "created": r["created"],
            "stats": _campaign_stats(conn, r["slug"]),
        })
    return json_response(200, {"campaigns": campaigns})


def action_ad_campaign_save(conn, admin_id: int, body: dict) -> dict:
    """Создать или обновить кампанию. Залоченную редактировать нельзя."""
    if not _is_admin(conn, admin_id):
        return json_response(403, {"error": "forbidden"})

    slug = _sanitize_slug(body.get("slug") or "")
    name = (body.get("name") or "").strip()[:200]
    kind = (body.get("kind") or "print")[:16]
    config = body.get("config")
    if not slug:
        return json_response(400, {"error": "bad_slug", "message": "Укажите метку (slug) кампании"})
    if not name:
        name = slug

    with conn.cursor() as cur:
        cur.execute("SELECT id, is_locked FROM ad_campaigns WHERE slug = %s", (slug,))
        existing = cur.fetchone()
        if existing:
            if existing[1]:
                return json_response(409, {
                    "error": "locked",
                    "message": "Кампания заказана в печать — редактирование запрещено",
                })
            cur.execute(
                "UPDATE ad_campaigns SET name=%s, kind=%s, config_jsonb=%s, updated_at=now() "
                "WHERE slug=%s RETURNING id",
                (name, kind, json.dumps(config, ensure_ascii=False) if config else None, slug),
            )
            cid = cur.fetchone()[0]
        else:
            cur.execute(
                "INSERT INTO ad_campaigns (slug, name, kind, config_jsonb, created_by) "
                "VALUES (%s,%s,%s,%s,%s) RETURNING id",
                (slug, name, kind,
                 json.dumps(config, ensure_ascii=False) if config else None, admin_id),
            )
            cid = cur.fetchone()[0]
    conn.commit()
    return json_response(200, {"ok": True, "id": cid, "slug": slug})


def action_ad_campaign_print(conn, admin_id: int, body: dict) -> dict:
    """Фиксирует заказ печати: добавляет тираж и лочит кампанию.
    Повторные заказы суммируются. quantity + total_kopecks из модалки."""
    if not _is_admin(conn, admin_id):
        return json_response(403, {"error": "forbidden"})

    slug = _sanitize_slug(body.get("slug") or "")
    try:
        quantity = int(body.get("quantity") or 0)
        total_kopecks = int(round(float(body.get("total_rub") or 0) * 100))
    except (TypeError, ValueError):
        return json_response(400, {"error": "bad_input"})
    if not slug or quantity <= 0:
        return json_response(400, {"error": "bad_input", "message": "Укажите кампанию и количество"})

    with conn.cursor() as cur:
        cur.execute("SELECT id FROM ad_campaigns WHERE slug = %s", (slug,))
        row = cur.fetchone()
        if not row:
            # Кампании ещё нет — создаём на лету из config (если передан)
            config = body.get("config")
            name = (body.get("name") or slug)[:200]
            cur.execute(
                "INSERT INTO ad_campaigns (slug, name, kind, config_jsonb, created_by, is_locked) "
                "VALUES (%s,%s,'print',%s,%s,TRUE) RETURNING id",
                (slug, name, json.dumps(config, ensure_ascii=False) if config else None, admin_id),
            )
            cid = cur.fetchone()[0]
        else:
            cid = row[0]
            cur.execute("UPDATE ad_campaigns SET is_locked = TRUE, updated_at = now() WHERE id = %s", (cid,))

        cur.execute(
            "INSERT INTO ad_campaign_print_orders (campaign_id, quantity, total_kopecks, created_by) "
            "VALUES (%s,%s,%s,%s)",
            (cid, quantity, total_kopecks, admin_id),
        )
    conn.commit()
    return json_response(200, {"ok": True, "slug": slug, "stats": _campaign_stats(conn, slug)})


def action_ad_campaigns_overview(conn, admin_id: int, params: dict) -> dict:
    """Сводная эффективность ВСЕХ источников (онлайн + офлайн) — для кругового
    графика. Группируем регистрации по типу источника первого касания, а для
    QR-флаеров/кампаний — по метке."""
    if not _is_admin(conn, admin_id):
        return json_response(403, {"error": "forbidden"})
    rc = psycopg2.extras.RealDictCursor
    with conn.cursor(cursor_factory=rc) as cur:
        # Регистрации по типу источника (онлайн/офлайн все каналы)
        cur.execute(
            "SELECT COALESCE(signup_source_type,'unknown') AS st, COUNT(*) AS cnt "
            "FROM sso_users GROUP BY st ORDER BY cnt DESC"
        )
        by_type = [{"sourceType": r["st"], "signups": r["cnt"]} for r in cur.fetchall()]

        # Кампании (по метке): регистрации + доход
        cur.execute(
            "SELECT signup_utm_campaign AS c, COUNT(*) AS cnt "
            "FROM sso_users WHERE signup_utm_campaign IS NOT NULL AND signup_utm_campaign <> '' "
            "GROUP BY c ORDER BY cnt DESC LIMIT 50"
        )
        campaigns_sig = {r["c"]: r["cnt"] for r in cur.fetchall()}

        cur.execute(
            "SELECT u.signup_utm_campaign AS c, COALESCE(SUM(p.amount_kopecks),0) AS rev "
            "FROM cae_payments p JOIN sso_users u ON u.id = p.user_id "
            "WHERE p.status = 'paid' AND u.signup_utm_campaign IS NOT NULL "
            "GROUP BY c",
            (),
        )
        campaigns_rev = {r["c"]: int(r["rev"]) for r in cur.fetchall()}

    by_campaign = [
        {"campaign": c, "signups": cnt, "revenue_kopecks": campaigns_rev.get(c, 0)}
        for c, cnt in campaigns_sig.items()
    ]
    return json_response(200, {
        "by_source_type": by_type,
        "by_campaign": by_campaign,
    })