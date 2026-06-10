"""
Действия личного кабинета и админ-управления пользователями.

Пользовательские (нужен Bearer-токен своего аккаунта):
  - update_profile   — смена имени (full_name)
  - change_password  — смена пароля (с проверкой текущего)

Админские (нужен is_admin):
  - admin_users          — список пользователей с баллами и ролями
  - admin_set_role       — выдать/снять флаг is_admin / is_owner
  - admin_toggle_active  — заблокировать/разблокировать вход (is_active)
  - admin_award_points   — ручное начисление баллов пользователю

Все ответы — через json_response (единый CORS-формат).
"""
from crypto import hash_password, verify_password
from db_helpers import get_user_payload, json_response

MAX_NAME_LEN = 200


def _is_admin(conn, user_id: int) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT is_admin FROM sso_users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        return bool(row and row[0])


# ──────────────────────────── Пользователь ────────────────────────────

def action_update_profile(conn, user_id: int, body: dict) -> dict:
    """Обновляет отображаемое имя пользователя. Возвращает свежий профиль."""
    full_name = (body.get('full_name') or '').strip()[:MAX_NAME_LEN]
    if not full_name:
        return json_response(400, {
            'error': 'empty_name',
            'message': 'Имя не может быть пустым',
        })
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE sso_users SET full_name = %s, updated_at = now() WHERE id = %s",
            (full_name, user_id),
        )
    conn.commit()
    return json_response(200, {'ok': True, 'user': get_user_payload(conn, user_id)})


def action_change_password(conn, user_id: int, body: dict) -> dict:
    """
    Меняет пароль. Если у пользователя уже есть пароль — требуется текущий.
    Если входил только через OAuth (пароля нет) — позволяет задать первый пароль.
    """
    current = body.get('current_password') or ''
    new_password = body.get('new_password') or ''

    if len(new_password) < 8:
        return json_response(400, {
            'error': 'weak_password',
            'message': 'Новый пароль должен быть не короче 8 символов',
        })
    if len(new_password) > 200:
        return json_response(400, {
            'error': 'long_password',
            'message': 'Пароль слишком длинный',
        })

    with conn.cursor() as cur:
        cur.execute("SELECT password_hash FROM sso_users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        if not row:
            return json_response(404, {'error': 'user_not_found'})
        stored = row[0]

        # Если пароль уже установлен — проверяем текущий.
        if stored:
            if not current:
                return json_response(400, {
                    'error': 'current_required',
                    'message': 'Введите текущий пароль',
                })
            if not verify_password(current, stored):
                return json_response(403, {
                    'error': 'wrong_password',
                    'message': 'Текущий пароль указан неверно',
                })

        cur.execute(
            "UPDATE sso_users SET password_hash = %s, updated_at = now() WHERE id = %s",
            (hash_password(new_password), user_id),
        )
        # Отзываем все refresh-токены, кроме текущей сессии нельзя различить —
        # отзываем все: после смены пароля безопаснее перелогиниться на других
        # устройствах. Текущая вкладка продолжит работать по access-токену.
        cur.execute(
            "UPDATE sso_refresh_tokens SET revoked_at = now() "
            "WHERE user_id = %s AND revoked_at IS NULL",
            (user_id,),
        )
    conn.commit()
    return json_response(200, {
        'ok': True,
        'message': 'Пароль изменён. На других устройствах потребуется войти заново.',
    })


# ──────────────────────────── Админ ────────────────────────────

def action_admin_users(conn, admin_id: int, params: dict) -> dict:
    """Список пользователей (до 200) с баллами, ролями и флагами. Поиск по q."""
    if not _is_admin(conn, admin_id):
        return json_response(403, {'error': 'forbidden'})

    q = (params.get('q') or '').strip().lower()
    import psycopg2.extras
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        sql = (
            "SELECT u.id, u.email, u.full_name, u.is_active, u.is_admin, u.is_owner, "
            "u.email_verified_at, u.created_at, u.last_login_at, "
            "COALESCE(p.total_points, 0) AS total_points "
            "FROM sso_users u "
            "LEFT JOIN user_points p ON p.user_id = u.id "
        )
        args: list = []
        if q:
            sql += "WHERE LOWER(u.email) LIKE %s OR LOWER(COALESCE(u.full_name,'')) LIKE %s "
            like = f'%{q}%'
            args += [like, like]
        sql += "ORDER BY u.created_at DESC LIMIT 200"
        cur.execute(sql, args)
        rows = cur.fetchall()

    users = [{
        'id': r['id'],
        'email': r['email'],
        'full_name': r['full_name'],
        'is_active': r['is_active'],
        'is_admin': bool(r['is_admin']),
        'is_owner': bool(r['is_owner']),
        'email_verified': bool(r['email_verified_at']),
        'total_points': r['total_points'],
        'created_at': r['created_at'].isoformat() if r['created_at'] else None,
        'last_login_at': r['last_login_at'].isoformat() if r['last_login_at'] else None,
    } for r in rows]
    return json_response(200, {'users': users})


def action_admin_set_role(conn, admin_id: int, body: dict) -> dict:
    """Выдать/снять флаг роли (is_admin или is_owner) пользователю."""
    if not _is_admin(conn, admin_id):
        return json_response(403, {'error': 'forbidden'})

    target_id = body.get('user_id')
    field = (body.get('field') or '').strip()
    value = bool(body.get('value'))
    if field not in ('is_admin', 'is_owner'):
        return json_response(400, {'error': 'bad_field', 'message': 'field: is_admin | is_owner'})
    try:
        target_id = int(target_id)
    except (TypeError, ValueError):
        return json_response(400, {'error': 'bad_user_id'})

    # Защита: нельзя снять с себя последний админ-флаг (чтобы не потерять доступ).
    if field == 'is_admin' and not value and target_id == admin_id:
        return json_response(400, {
            'error': 'self_demote',
            'message': 'Нельзя снять админ-права с самого себя',
        })

    with conn.cursor() as cur:
        cur.execute(
            f"UPDATE sso_users SET {field} = %s, updated_at = now() WHERE id = %s",
            (value, target_id),
        )
        if cur.rowcount == 0:
            return json_response(404, {'error': 'user_not_found'})
    conn.commit()
    return json_response(200, {'ok': True})


def action_admin_toggle_active(conn, admin_id: int, body: dict) -> dict:
    """Блокировка/разблокировка входа пользователя (is_active)."""
    if not _is_admin(conn, admin_id):
        return json_response(403, {'error': 'forbidden'})

    target_id = body.get('user_id')
    value = bool(body.get('value'))
    try:
        target_id = int(target_id)
    except (TypeError, ValueError):
        return json_response(400, {'error': 'bad_user_id'})

    if target_id == admin_id and not value:
        return json_response(400, {
            'error': 'self_block',
            'message': 'Нельзя заблокировать самого себя',
        })

    with conn.cursor() as cur:
        cur.execute(
            "UPDATE sso_users SET is_active = %s, updated_at = now() WHERE id = %s",
            (value, target_id),
        )
        if cur.rowcount == 0:
            return json_response(404, {'error': 'user_not_found'})
        # При блокировке — отзываем все refresh-токены, чтобы выкинуть из сессий.
        if not value:
            cur.execute(
                "UPDATE sso_refresh_tokens SET revoked_at = now() "
                "WHERE user_id = %s AND revoked_at IS NULL",
                (target_id,),
            )
    conn.commit()
    return json_response(200, {'ok': True})


def action_admin_award_points(conn, admin_id: int, body: dict) -> dict:
    """Ручное начисление (или списание) баллов пользователю с записью в лог."""
    if not _is_admin(conn, admin_id):
        return json_response(403, {'error': 'forbidden'})

    target_id = body.get('user_id')
    points = body.get('points')
    note = (body.get('note') or '').strip()[:200]
    try:
        target_id = int(target_id)
        points = int(points)
    except (TypeError, ValueError):
        return json_response(400, {'error': 'bad_input'})
    if points == 0:
        return json_response(400, {'error': 'zero_points', 'message': 'Укажите ненулевое число баллов'})
    if abs(points) > 100000:
        return json_response(400, {'error': 'too_many', 'message': 'Слишком большое значение'})

    with conn.cursor() as cur:
        cur.execute("SELECT id FROM sso_users WHERE id = %s", (target_id,))
        if not cur.fetchone():
            return json_response(404, {'error': 'user_not_found'})

        cur.execute(
            "INSERT INTO user_points (user_id, total_points) VALUES (%s, 0) "
            "ON CONFLICT (user_id) DO NOTHING",
            (target_id,),
        )
        cur.execute(
            "INSERT INTO user_points_log (user_id, points, reason, note) "
            "VALUES (%s, %s, 'admin_manual', %s)",
            (target_id, points, note or f'Ручное начисление админом #{admin_id}'),
        )
        cur.execute(
            "UPDATE user_points SET total_points = GREATEST(total_points + %s, 0), "
            "updated_at = now() WHERE user_id = %s",
            (points, target_id),
        )
        cur.execute("SELECT total_points FROM user_points WHERE user_id = %s", (target_id,))
        total = cur.fetchone()[0]
    conn.commit()
    return json_response(200, {'ok': True, 'total_points': total})


def action_admin_stats(conn, admin_id: int, params: dict) -> dict:
    """
    Сводная статистика для админ-дашборда за период (по умолчанию 30 дней):
      - totals: визиты, уникальные источники, регистрации;
      - visits_by_source: распределение визитов по типу источника + ярлыку;
      - signups_by_source: распределение регистраций по источнику (первое касание);
      - daily: ряд по дням (визиты + регистрации) для графика.
    Доступ только админу.
    """
    if not _is_admin(conn, admin_id):
        return json_response(403, {'error': 'forbidden'})

    try:
        days = int(params.get('days') or 30)
    except (TypeError, ValueError):
        days = 30
    days = max(1, min(days, 365))

    import psycopg2.extras
    rc = psycopg2.extras.RealDictCursor

    since = f"now() - interval '{days} days'"

    with conn.cursor(cursor_factory=rc) as cur:
        # Тоталы
        cur.execute(f"SELECT COUNT(*) AS c FROM site_visits WHERE created_at >= {since}")
        visits_total = cur.fetchone()['c']
        cur.execute(
            f"SELECT COUNT(*) AS c FROM sso_users WHERE created_at >= {since}"
        )
        signups_total = cur.fetchone()['c']

        # Визиты по источникам (тип + ярлык)
        cur.execute(
            "SELECT source_type, source_label, COUNT(*) AS cnt "
            "FROM site_visits "
            f"WHERE created_at >= {since} "
            "GROUP BY source_type, source_label "
            "ORDER BY cnt DESC LIMIT 50"
        )
        visits_by_source = [
            {'sourceType': r['source_type'], 'sourceLabel': r['source_label'],
             'count': r['cnt']}
            for r in cur.fetchall()
        ]

        # Регистрации по источнику первого касания
        cur.execute(
            "SELECT COALESCE(signup_source_type, 'unknown') AS st, "
            "COALESCE(signup_source_label, 'Неизвестно') AS sl, COUNT(*) AS cnt "
            "FROM sso_users "
            f"WHERE created_at >= {since} "
            "GROUP BY st, sl ORDER BY cnt DESC LIMIT 50"
        )
        signups_by_source = [
            {'sourceType': r['st'], 'sourceLabel': r['sl'], 'count': r['cnt']}
            for r in cur.fetchall()
        ]

        # Ряд по дням: визиты
        cur.execute(
            "SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS d, "
            "COUNT(*) AS cnt FROM site_visits "
            f"WHERE created_at >= {since} GROUP BY d ORDER BY d"
        )
        visits_daily = {r['d']: r['cnt'] for r in cur.fetchall()}

        # Ряд по дням: регистрации
        cur.execute(
            "SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS d, "
            "COUNT(*) AS cnt FROM sso_users "
            f"WHERE created_at >= {since} GROUP BY d ORDER BY d"
        )
        signups_daily = {r['d']: r['cnt'] for r in cur.fetchall()}

        # Разбивка по QR-флаерам: визиты и регистрации каждого флаера/кампании.
        # Источник в группе qr_flyer, ярлык включает кампанию (см. attribution.ts).
        cur.execute(
            "SELECT source_label, COUNT(*) AS cnt "
            "FROM site_visits "
            f"WHERE created_at >= {since} AND source_type = 'qr_flyer' "
            "GROUP BY source_label ORDER BY cnt DESC LIMIT 50"
        )
        qr_visits = {r['source_label']: r['cnt'] for r in cur.fetchall()}

        cur.execute(
            "SELECT signup_source_label AS sl, COUNT(*) AS cnt "
            "FROM sso_users "
            f"WHERE created_at >= {since} AND signup_source_type = 'qr_flyer' "
            "GROUP BY sl ORDER BY cnt DESC LIMIT 50"
        )
        qr_signups = {r['sl']: r['cnt'] for r in cur.fetchall()}

        qr_flyers = [
            {'label': label, 'visits': visits, 'signups': qr_signups.get(label, 0)}
            for label, visits in sorted(qr_visits.items(), key=lambda x: -x[1])
        ]
        # Флаеры, давшие регистрации, но без визитов в периоде — тоже показываем.
        for label, cnt in qr_signups.items():
            if label not in qr_visits:
                qr_flyers.append({'label': label, 'visits': 0, 'signups': cnt})

        # Топ страниц/постов по посещаемости: уникальные визитёры + всего просмотров
        top_pages = []
        try:
            cur.execute(
                "SELECT path, MAX(page_title) AS title, "
                "COUNT(DISTINCT visitor_id) AS uniq, COUNT(*) AS total "
                "FROM page_views "
                f"WHERE created_at >= {since} "
                "GROUP BY path ORDER BY uniq DESC, total DESC LIMIT 50"
            )
            top_pages = [
                {'path': r['path'], 'title': r['title'] or r['path'],
                 'unique': int(r['uniq']), 'total': int(r['total'])}
                for r in cur.fetchall()
            ]
        except Exception:
            top_pages = []

    # Собираем общий ряд по дням (объединение ключей)
    all_days = sorted(set(visits_daily) | set(signups_daily))
    daily = [
        {'date': d, 'visits': visits_daily.get(d, 0), 'signups': signups_daily.get(d, 0)}
        for d in all_days
    ]

    return json_response(200, {
        'period_days': days,
        'totals': {
            'visits': visits_total,
            'signups': signups_total,
            'sources': len(visits_by_source),
        },
        'visits_by_source': visits_by_source,
        'signups_by_source': signups_by_source,
        'qr_flyers': qr_flyers,
        'top_pages': top_pages,
        'daily': daily,
    })