"""
Публичные тарифы CAE-калькулятора — без авторизации.
Возвращаются все строки cae_tariffs с is_public=TRUE в порядке sort_order.
"""
import psycopg2.extras

from auth import json_response


def action_tariffs(conn) -> dict:
    """GET /?action=tariffs — список публичных тарифов."""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT slug, name, price_monthly, price_yearly, price_one_off, "
            "max_projects, max_elements, max_solves_per_month, "
            "allow_nonlinear, allow_team, max_team_members "
            "FROM cae_tariffs WHERE is_public = TRUE ORDER BY sort_order"
        )
        items = [dict(r) for r in cur.fetchall()]
    return json_response(200, {'tariffs': items})
