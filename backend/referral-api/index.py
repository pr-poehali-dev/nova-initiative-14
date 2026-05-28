"""
Business: Реферальная программа и очки. Профиль пользователя по очкам/ачивкам,
          бронирование реф-кода, начисление баллов за дневной расчёт, лидерборд.
Args: event с httpMethod (GET/POST/OPTIONS), queryStringParameters.action,
      headers['X-Authorization'] = Bearer JWT.
Returns: JSON с профилем, рейтингом или статусом начисления.
"""
import base64
import hashlib
import hmac
import json
import os
import secrets
import string
import time
from datetime import datetime, timezone

import psycopg2
import psycopg2.extras


JWT_SECRET = os.environ['SSO_JWT_SECRET']

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Authorization, Authorization',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json; charset=utf-8',
}

# Награды
POINTS_SIGNUP = 10            # +10 баллов за регистрацию (реферал и пригласивший)
POINTS_DAILY_SOLVE = 1        # +1 балл в день за активный расчёт самому юзеру
POINTS_REFERRAL_DAILY = 1     # +1 балл рефереру в день, когда его реф сделал расчёт

# Пороги ачивок «N активных рефералов» (тех, кто сделал хотя бы 1 расчёт).
# Внимание: 'first_invite' сюда НЕ входит — она выдаётся в sso-auth/actions.py
# по факту регистрации первого реферала, без требования активности.
INVITER_TIERS = [
    (5,  'inviter_5'),
    (15, 'inviter_15'),
    (50, 'inviter_50'),
]


def _json_response(status: int, body: dict) -> dict:
    return {'statusCode': status, 'headers': CORS, 'body': json.dumps(body, ensure_ascii=False, default=str)}


def _b64url_decode(s: str) -> bytes:
    pad = '=' * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)


def _verify_jwt(token: str) -> dict | None:
    try:
        h_b, p_b, s_b = token.split('.')
        signing_input = f'{h_b}.{p_b}'.encode()
        expected = hmac.new(JWT_SECRET.encode(), signing_input, hashlib.sha256).digest()
        actual = _b64url_decode(s_b)
        if not hmac.compare_digest(expected, actual):
            return None
        payload = json.loads(_b64url_decode(p_b))
        if payload.get('exp', 0) < int(time.time()):
            return None
        return payload
    except Exception:
        return None


def _auth_user(event: dict) -> dict | None:
    headers = event.get('headers') or {}
    auth = headers.get('X-Authorization') or headers.get('Authorization') or ''
    if not auth.startswith('Bearer '):
        return None
    return _verify_jwt(auth[7:].strip())


def _generate_ref_code(cur) -> str:
    """Генерирует уникальный 8-символьный реф-код (A-Z + 0-9, без 0/O/I/1)."""
    alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    for _ in range(15):
        code = ''.join(secrets.choice(alphabet) for _ in range(8))
        cur.execute(
            "SELECT 1 FROM sso_users WHERE referral_code = %s",
            (code,),
        )
        if not cur.fetchone():
            return code
    # Fallback с большей длиной
    return ''.join(secrets.choice(alphabet) for _ in range(12))


def _ensure_ref_code(conn, user_id: int) -> str:
    """Возвращает существующий реф-код юзера или создаёт новый. Идемпотентно."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT referral_code FROM sso_users WHERE id = %s",
            (user_id,),
        )
        row = cur.fetchone()
        if not row:
            return ''
        if row[0]:
            return row[0]
        code = _generate_ref_code(cur)
        cur.execute(
            "UPDATE sso_users SET referral_code = %s WHERE id = %s",
            (code, user_id),
        )
        conn.commit()
        return code


def _ensure_points_row(conn, user_id: int):
    """Создаёт строку в user_points если её нет. Идемпотентно."""
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO user_points (user_id, total_points) VALUES (%s, 0) "
            "ON CONFLICT (user_id) DO NOTHING",
            (user_id,),
        )
    conn.commit()


def _add_points(conn, user_id: int, points: int, reason: str,
                ref_user_id: int | None = None, ticket_id: int | None = None,
                note: str | None = None, dedup_key: str | None = None) -> bool:
    """Начисляет баллы. Возвращает True если действительно начислили,
    False если дедуп ключ уже использован."""
    if points == 0:
        return False
    _ensure_points_row(conn, user_id)
    with conn.cursor() as cur:
        try:
            cur.execute(
                "INSERT INTO user_points_log "
                "(user_id, points, reason, ref_user_id, ticket_id, note, dedup_key) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (user_id, points, reason, ref_user_id, ticket_id, note, dedup_key),
            )
        except psycopg2.IntegrityError:
            conn.rollback()
            return False
        cur.execute(
            "UPDATE user_points SET total_points = total_points + %s, updated_at = now() "
            "WHERE user_id = %s",
            (points, user_id),
        )
    conn.commit()
    return True


def _check_inviter_achievements(conn, user_id: int, active_count: int):
    """Выдаёт ачивки 'first_invite', 'inviter_5', '15', '50' при пересечении порогов."""
    with conn.cursor() as cur:
        for threshold, code in INVITER_TIERS:
            if active_count >= threshold:
                cur.execute(
                    "INSERT INTO user_achievements (user_id, achievement_code) "
                    "VALUES (%s, %s) ON CONFLICT (user_id, achievement_code) DO NOTHING",
                    (user_id, code),
                )
    conn.commit()


def _award_achievement(conn, user_id: int, code: str):
    """Выдаёт ачивку идемпотентно. Если выдана впервые — начисляет очки из её типа."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM user_achievements WHERE user_id = %s AND achievement_code = %s",
            (user_id, code),
        )
        if cur.fetchone():
            return
        cur.execute(
            "INSERT INTO user_achievements (user_id, achievement_code) VALUES (%s, %s) "
            "ON CONFLICT (user_id, achievement_code) DO NOTHING",
            (user_id, code),
        )
        cur.execute(
            "SELECT points FROM achievement_types WHERE code = %s",
            (code,),
        )
        row = cur.fetchone()
        points = int(row[0]) if row else 0
    conn.commit()
    if points > 0:
        _add_points(conn, user_id, points, f'achievement:{code}', note=f'Ачивка {code}',
                    dedup_key=f'ach:{user_id}:{code}')


# ============ ACTIONS ============

def action_get_profile(conn, user: dict) -> dict:
    """Возвращает реф-профиль текущего юзера: код, очки, ачивки, рейтинги, ссылку."""
    user_id = int(user['sub'])
    ref_code = _ensure_ref_code(conn, user_id)
    _ensure_points_row(conn, user_id)

    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT total_points, referrals_count, active_referrals_count "
            "FROM user_points WHERE user_id = %s",
            (user_id,),
        )
        points_row = cur.fetchone() or {'total_points': 0, 'referrals_count': 0, 'active_referrals_count': 0}

        # Кол-во прямых рефералов
        cur.execute(
            "SELECT COUNT(*) AS c FROM sso_users WHERE referred_by_user_id = %s",
            (user_id,),
        )
        ref_count = int(cur.fetchone()['c'])

        # Активные рефералы — те, у кого был начислен self_daily_solve хотя бы 1 раз
        cur.execute(
            "SELECT COUNT(DISTINCT u.id) AS c FROM sso_users u "
            "JOIN user_points_log l ON l.user_id = u.id "
            "WHERE u.referred_by_user_id = %s AND l.reason = 'self_daily_solve'",
            (user_id,),
        )
        active_count = int(cur.fetchone()['c'])

        # Место в общем рейтинге по очкам
        cur.execute(
            "SELECT COUNT(*) + 1 AS rank FROM user_points "
            "WHERE total_points > (SELECT total_points FROM user_points WHERE user_id = %s)",
            (user_id,),
        )
        rank = int(cur.fetchone()['rank'])

        # Ачивки юзера
        cur.execute(
            "SELECT t.code, t.title, t.description, t.icon, t.points, "
            "       a.awarded_at, t.sort_order "
            "FROM achievement_types t "
            "LEFT JOIN user_achievements a ON a.achievement_code = t.code AND a.user_id = %s "
            "ORDER BY t.sort_order",
            (user_id,),
        )
        ach_rows = cur.fetchall()
        achievements = [
            {
                'code': r['code'],
                'title': r['title'],
                'description': r['description'],
                'icon': r['icon'],
                'points': r['points'],
                'awarded': r['awarded_at'] is not None,
                'awarded_at': r['awarded_at'].isoformat() if r['awarded_at'] else None,
            }
            for r in ach_rows
        ]

    # Обновим агрегат referrals_count/active
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE user_points SET referrals_count = %s, active_referrals_count = %s, "
            "updated_at = now() WHERE user_id = %s",
            (ref_count, active_count, user_id),
        )
    conn.commit()
    _check_inviter_achievements(conn, user_id, active_count)

    return _json_response(200, {
        'referral_code': ref_code,
        'total_points': int(points_row['total_points']),
        'referrals_count': ref_count,
        'active_referrals_count': active_count,
        'rank': rank,
        'achievements': achievements,
    })


def action_award_daily_solve(conn, user: dict) -> dict:
    """Начисляет дневной балл юзеру и его рефереру (один раз в сутки UTC).
    Идемпотентно через dedup_key='daily_solve:{user_id}:{date}'."""
    user_id = int(user['sub'])
    today = datetime.now(timezone.utc).date().isoformat()

    awarded_self = _add_points(
        conn, user_id, POINTS_DAILY_SOLVE, 'self_daily_solve',
        note=f'Расчёт {today}', dedup_key=f'self_daily_solve:{user_id}:{today}',
    )

    awarded_referrer = False
    # Реферер получает 1 балл за активность каждого приглашённого ежедневно
    with conn.cursor() as cur:
        cur.execute(
            "SELECT referred_by_user_id FROM sso_users WHERE id = %s",
            (user_id,),
        )
        row = cur.fetchone()
        referrer_id = int(row[0]) if row and row[0] else None

    if referrer_id:
        awarded_referrer = _add_points(
            conn, referrer_id, POINTS_REFERRAL_DAILY, 'referral_daily_solve',
            ref_user_id=user_id, note=f'Реф-актив {today}',
            dedup_key=f'ref_daily:{referrer_id}:{user_id}:{today}',
        )

    # При первом расчёте — ачивка first_solve
    if awarded_self:
        _award_achievement(conn, user_id, 'first_solve')

    return _json_response(200, {
        'ok': True,
        'awarded_self': awarded_self,
        'awarded_referrer': awarded_referrer,
        'referrer_id': referrer_id,
    })


def action_leaderboard(conn) -> dict:
    """Топ-50 по очкам. Публичный (имена частично замаскированы)."""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT u.id, u.full_name, u.email, p.total_points, p.active_referrals_count "
            "FROM user_points p "
            "JOIN sso_users u ON u.id = p.user_id "
            "WHERE p.total_points > 0 "
            "ORDER BY p.total_points DESC, p.active_referrals_count DESC "
            "LIMIT 50"
        )
        rows = cur.fetchall()

    def mask(name: str | None, email: str) -> str:
        if name and name.strip():
            parts = name.strip().split()
            return parts[0] + ('. ' + parts[1][:1] + '.' if len(parts) > 1 else '')
        local = email.split('@')[0]
        if len(local) <= 3:
            return local + '***'
        return local[:3] + '***'

    leaders = [
        {
            'rank': i + 1,
            'name': mask(r['full_name'], r['email']),
            'points': int(r['total_points']),
            'active_referrals': int(r['active_referrals_count']),
        }
        for i, r in enumerate(rows)
    ]
    return _json_response(200, {'leaders': leaders})


def handler(event: dict, context) -> dict:
    """Маршрутизатор referral-api по ?action= и httpMethod."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = (params.get('action') or '').strip()
    if not action:
        return _json_response(400, {
            'error': 'missing_action',
            'message': 'Укажите ?action=get-profile|award-daily-solve|leaderboard',
        })

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        # Публичные
        if action == 'leaderboard' and method == 'GET':
            return action_leaderboard(conn)

        # Авторизованные
        user = _auth_user(event)
        if not user:
            return _json_response(401, {'error': 'unauthorized', 'message': 'Требуется вход.'})

        if action == 'get-profile' and method == 'GET':
            return action_get_profile(conn, user)
        if action == 'award-daily-solve' and method == 'POST':
            return action_award_daily_solve(conn, user)

        return _json_response(404, {'error': 'unknown_action'})
    except Exception as e:
        import traceback
        print(f'[referral-api] error: {e!r}\n{traceback.format_exc()}')
        return _json_response(500, {'error': 'internal_error', 'message': f'{type(e).__name__}: {e}'[:300]})
    finally:
        conn.close()