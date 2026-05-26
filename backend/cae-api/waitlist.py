"""
Запись в список раннего доступа CAE.
  - email обязателен и валидируется по EMAIL_RE
  - повторная запись обновляет full_name / role_self / purpose (без перезаписи на пустые)
  - связывает с user_id если пользователь авторизован
  - сохраняет IP и User-Agent для аналитики источников
"""
from auth import json_response
from utils import EMAIL_RE


def action_waitlist(conn, body: dict, user: dict | None, ua: str, ip: str) -> dict:
    """POST /?action=waitlist — добавляет/обновляет запись в waitlist."""
    email = (body.get('email') or '').strip().lower()
    full_name = (body.get('full_name') or '').strip()[:200]
    role_self = (body.get('role_self') or '').strip()[:64]
    purpose = (body.get('purpose') or '').strip()[:1000]
    referral = (body.get('referral_source') or '').strip()[:64]

    if not EMAIL_RE.match(email):
        return json_response(400, {'error': 'invalid_email', 'message': 'Укажите корректный email.'})

    user_id = int(user['sub']) if user and user.get('sub') else None

    with conn.cursor() as cur:
        cur.execute("SELECT id FROM cae_waitlist WHERE LOWER(email) = %s", (email,))
        row = cur.fetchone()
        if row:
            # обновляем поля если уже есть; пустые значения сохраняют старое
            cur.execute(
                "UPDATE cae_waitlist SET full_name = COALESCE(NULLIF(%s,''), full_name), "
                "role_self = COALESCE(NULLIF(%s,''), role_self), "
                "purpose = COALESCE(NULLIF(%s,''), purpose), "
                "user_id = COALESCE(user_id, %s) "
                "WHERE id = %s",
                (full_name, role_self, purpose, user_id, row[0]),
            )
            conn.commit()
            return json_response(200, {
                'ok': True,
                'already_in': True,
                'message': 'Вы уже в списке раннего доступа.',
            })

        cur.execute(
            "INSERT INTO cae_waitlist (email, full_name, user_id, role_self, purpose, referral_source, ip, user_agent) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (email, full_name or None, user_id, role_self or None, purpose or None, referral or None, ip, ua),
        )
        wid = cur.fetchone()[0]
    conn.commit()
    return json_response(201, {
        'ok': True,
        'id': wid,
        'message': 'Спасибо! Мы пригласим вас одними из первых.',
    })
