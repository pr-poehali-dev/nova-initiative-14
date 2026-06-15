"""
Дашборд владельца: сводная статистика продукта (требует is_admin).

action_owner_dashboard — за период (по умолчанию 30 дней) возвращает:
  - users:     всего/новые/верифицированы/онлайн сейчас/активны за 24ч/7д;
  - solves:    всего расчётов, успешные/с ошибкой, среднее число
               узлов/элементов/нагрузок, макс. сложность, среднее время,
               разбивка по типам проектов, ряд по дням;
  - projects:  всего/активные/архивные, разбивка по типам;
  - referrals: топ-приглашающих, всего приглашено и активных рефералов;
  - top_users: самые активные по числу расчётов.

Сложность расчёта берётся из cae_solver_runs.payload_jsonb:
  nodes / elements / loads — это JSON-массивы, длина = размер задачи.
"""
import psycopg2.extras

from db_helpers import json_response


def _is_admin(conn, user_id: int) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT is_admin FROM sso_users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        return bool(row and row[0])


def action_owner_dashboard(conn, admin_id: int, params: dict) -> dict:
    """Сводный дашборд владельца: пользователи, расчёты, проекты, рефералы."""
    if not _is_admin(conn, admin_id):
        return json_response(403, {'error': 'forbidden'})

    try:
        days = int(params.get('days') or 30)
    except (TypeError, ValueError):
        days = 30
    days = max(1, min(days, 365))

    since = f"now() - interval '{days} days'"
    rc = psycopg2.extras.RealDictCursor

    with conn.cursor(cursor_factory=rc) as cur:
        # ── Пользователи и онлайн ─────────────────────────────────────────
        # «Онлайн» приближённо: была активность (last_login_at) за 15 минут.
        # «Активные» по более широким окнам — для понимания удержания.
        cur.execute(
            "SELECT "
            "COUNT(*) AS total, "
            f"COUNT(*) FILTER (WHERE created_at >= {since}) AS new_period, "
            "COUNT(*) FILTER (WHERE email_verified_at IS NOT NULL) AS verified, "
            "COUNT(*) FILTER (WHERE last_login_at >= now() - interval '15 minutes') AS online, "
            "COUNT(*) FILTER (WHERE last_login_at >= now() - interval '24 hours') AS active_24h, "
            "COUNT(*) FILTER (WHERE last_login_at >= now() - interval '7 days') AS active_7d "
            "FROM sso_users"
        )
        u = cur.fetchone()
        users = {
            'total': u['total'],
            'new_period': u['new_period'],
            'verified': u['verified'],
            'online': u['online'],
            'active_24h': u['active_24h'],
            'active_7d': u['active_7d'],
        }

        # ── Расчёты и сложность ──────────────────────────────────────────
        cur.execute(
            "SELECT "
            "COUNT(*) AS runs, "
            "COUNT(*) FILTER (WHERE status = 'ok') AS ok, "
            "COUNT(*) FILTER (WHERE status = 'error') AS err, "
            f"COUNT(*) FILTER (WHERE created_at >= {since}) AS runs_period, "
            "ROUND(AVG(jsonb_array_length(payload_jsonb->'nodes'))::numeric, 1) AS avg_nodes, "
            "ROUND(AVG(jsonb_array_length(payload_jsonb->'elements'))::numeric, 1) AS avg_elems, "
            "ROUND(AVG(jsonb_array_length(payload_jsonb->'loads'))::numeric, 1) AS avg_loads, "
            "MAX(jsonb_array_length(payload_jsonb->'elements')) AS max_elems, "
            "ROUND(AVG(duration_ms)::numeric) AS avg_ms "
            "FROM cae_solver_runs"
        )
        s = cur.fetchone()

        def _num(v):
            return float(v) if v is not None else 0

        solves = {
            'runs': s['runs'],
            'ok': s['ok'],
            'err': s['err'],
            'runs_period': s['runs_period'],
            'avg_nodes': _num(s['avg_nodes']),
            'avg_elems': _num(s['avg_elems']),
            'avg_loads': _num(s['avg_loads']),
            'max_elems': int(s['max_elems']) if s['max_elems'] is not None else 0,
            'avg_ms': int(s['avg_ms']) if s['avg_ms'] is not None else 0,
        }

        # Расчёты по типам проектов (через join на проект)
        cur.execute(
            "SELECT COALESCE(p.project_type, 'unknown') AS t, COUNT(*) AS cnt "
            "FROM cae_solver_runs r "
            "LEFT JOIN cae_projects p ON p.id = r.project_id "
            "GROUP BY t ORDER BY cnt DESC"
        )
        solves_by_type = [{'type': r['t'], 'count': r['cnt']} for r in cur.fetchall()]

        # Ряд расчётов по дням
        cur.execute(
            "SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS d, "
            "COUNT(*) AS cnt, "
            "COUNT(*) FILTER (WHERE status = 'error') AS errs "
            f"FROM cae_solver_runs WHERE created_at >= {since} "
            "GROUP BY d ORDER BY d"
        )
        solves_daily = [
            {'date': r['d'], 'count': r['cnt'], 'errors': r['errs']}
            for r in cur.fetchall()
        ]

        # Распределение сложности по корзинам (число элементов)
        cur.execute(
            "SELECT "
            "COUNT(*) FILTER (WHERE n <= 5) AS b1, "
            "COUNT(*) FILTER (WHERE n BETWEEN 6 AND 20) AS b2, "
            "COUNT(*) FILTER (WHERE n BETWEEN 21 AND 50) AS b3, "
            "COUNT(*) FILTER (WHERE n > 50) AS b4 "
            "FROM (SELECT jsonb_array_length(payload_jsonb->'elements') AS n "
            "FROM cae_solver_runs) q"
        )
        b = cur.fetchone()
        complexity = [
            {'bucket': '1–5 элем.', 'count': b['b1']},
            {'bucket': '6–20 элем.', 'count': b['b2']},
            {'bucket': '21–50 элем.', 'count': b['b3']},
            {'bucket': '50+ элем.', 'count': b['b4']},
        ]

        # ── Проекты ──────────────────────────────────────────────────────
        cur.execute(
            "SELECT COUNT(*) AS total, "
            "COUNT(*) FILTER (WHERE is_archived) AS archived, "
            f"COUNT(*) FILTER (WHERE created_at >= {since}) AS new_period "
            "FROM cae_projects"
        )
        p = cur.fetchone()
        cur.execute(
            "SELECT project_type AS t, COUNT(*) AS cnt FROM cae_projects "
            "GROUP BY t ORDER BY cnt DESC"
        )
        projects_by_type = [{'type': r['t'], 'count': r['cnt']} for r in cur.fetchall()]
        projects = {
            'total': p['total'],
            'archived': p['archived'],
            'active': p['total'] - p['archived'],
            'new_period': p['new_period'],
            'by_type': projects_by_type,
        }

        # ── Приглашения и рефералы ───────────────────────────────────────
        # Сколько всего пользователей пришло по приглашению (есть referred_by).
        cur.execute(
            "SELECT COUNT(*) AS invited_total, "
            f"COUNT(*) FILTER (WHERE created_at >= {since}) AS invited_period "
            "FROM sso_users WHERE referred_by_user_id IS NOT NULL"
        )
        rf = cur.fetchone()

        # Топ-приглашающих: считаем приведённых и из них активных (сделали расчёт).
        cur.execute(
            "SELECT inviter.id, inviter.email, inviter.full_name, "
            "COUNT(ref.id) AS invited, "
            "COUNT(ref.id) FILTER (WHERE EXISTS ("
            "  SELECT 1 FROM cae_solver_runs sr WHERE sr.owner_id = ref.id"
            ")) AS active "
            "FROM sso_users inviter "
            "JOIN sso_users ref ON ref.referred_by_user_id = inviter.id "
            "GROUP BY inviter.id, inviter.email, inviter.full_name "
            "ORDER BY invited DESC LIMIT 20"
        )
        top_inviters = [
            {
                'id': r['id'],
                'name': r['full_name'] or r['email'],
                'invited': r['invited'],
                'active': r['active'],
            }
            for r in cur.fetchall()
        ]
        referrals = {
            'invited_total': rf['invited_total'],
            'invited_period': rf['invited_period'],
            'top_inviters': top_inviters,
        }

        # ── Топ активных пользователей по числу расчётов ──────────────────
        cur.execute(
            "SELECT u.id, u.email, u.full_name, "
            "COUNT(r.id) AS runs, "
            "MAX(r.created_at) AS last_run "
            "FROM sso_users u "
            "JOIN cae_solver_runs r ON r.owner_id = u.id "
            "GROUP BY u.id, u.email, u.full_name "
            "ORDER BY runs DESC LIMIT 20"
        )
        top_users = [
            {
                'id': r['id'],
                'name': r['full_name'] or r['email'],
                'runs': r['runs'],
                'last_run': r['last_run'].isoformat() if r['last_run'] else None,
            }
            for r in cur.fetchall()
        ]

    return json_response(200, {
        'period_days': days,
        'users': users,
        'solves': solves,
        'solves_by_type': solves_by_type,
        'solves_daily': solves_daily,
        'complexity': complexity,
        'projects': projects,
        'referrals': referrals,
        'top_users': top_users,
    })
