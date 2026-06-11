"""
Business: CAE Solver — конечно-элементный расчёт балочных рам (2D/3D).
Args: event.queryStringParameters.action; httpMethod POST/OPTIONS;
      body — JSON SolverPayload (см. solver.py).
Returns: JSON SolverResponse с перемещениями, реакциями, эпюрами N/Q/M, σ Мизес.
"""
import base64
import hashlib
import hmac
import json
import os
import time
from datetime import datetime

import psycopg2

from solver import solve as run_solver


JWT_SECRET = os.environ['SSO_JWT_SECRET']

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Authorization, Authorization',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json; charset=utf-8',
}

MAX_ELEMENTS_DEFAULT = 5000
MAX_PAYLOAD_BYTES = 2 * 1024 * 1024  # 2 МБ

# Серверный лимит демо-расчётов на один IP (защита от обхода через инкогнито).
DEMO_SOLVE_LIMIT = 2


def _client_ip(event: dict) -> str:
    """IP клиента из requestContext.identity.sourceIp."""
    ctx = event.get('requestContext') or {}
    identity = ctx.get('identity') or {}
    return (identity.get('sourceIp') or '')[:64]


def _demo_check_and_count(ip: str) -> tuple[bool, int]:
    """Проверяет и увеличивает счётчик демо-расчётов по IP за последние сутки.
    Возвращает (allowed, used). allowed=False — лимит исчерпан.
    Инкремент атомарный: считаем расчёт ещё до запуска решателя.
    Счётчик сбрасывается, если с первого расчёта прошло больше суток —
    так демо обновляется ежедневно, а тесты не упираются в исторический счёт."""
    if not ip:
        return True, 0
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO cae_demo_usage (ip, solve_count, first_at) "
                "VALUES (%s, 1, now()) "
                "ON CONFLICT (ip) DO UPDATE SET "
                "  solve_count = CASE "
                "    WHEN cae_demo_usage.first_at < now() - interval '1 day' THEN 1 "
                "    ELSE cae_demo_usage.solve_count + 1 END, "
                "  first_at = CASE "
                "    WHEN cae_demo_usage.first_at < now() - interval '1 day' THEN now() "
                "    ELSE cae_demo_usage.first_at END, "
                "  updated_at = now() "
                "RETURNING solve_count",
                (ip,),
            )
            used = cur.fetchone()[0]
        conn.commit()
        conn.close()
        if used > DEMO_SOLVE_LIMIT:
            return False, used - 1
        return True, used
    except Exception as e:
        print(f'[cae-solver] demo limit error: {e!r}')
        # При сбое БД не блокируем пользователя — лучше пропустить, чем сломать демо.
        return True, 0


def _json_response(status: int, body: dict) -> dict:
    return {'statusCode': status, 'headers': CORS, 'body': json.dumps(body, ensure_ascii=False)}


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


def _validate_payload(payload: dict) -> tuple[bool, str | None]:
    if not isinstance(payload, dict):
        return False, 'Payload должен быть объектом'
    meta = payload.get('meta') or {}
    dim = meta.get('dim', '3d')
    if dim not in ('2d', '3d'):
        return False, f'meta.dim должен быть "2d" или "3d", получено "{dim}"'
    if not payload.get('materials'):
        return False, 'Не задано ни одного материала'
    if not payload.get('sections'):
        return False, 'Не задано ни одного сечения'
    if not payload.get('nodes') or len(payload['nodes']) < 2:
        return False, 'Нужно минимум 2 узла'
    if not payload.get('elements'):
        return False, 'Нужно минимум 1 элемент'
    if len(payload['elements']) > MAX_ELEMENTS_DEFAULT:
        return False, f'Превышен лимит элементов ({MAX_ELEMENTS_DEFAULT})'
    if not payload.get('boundary_conditions'):
        return False, 'Не заданы граничные условия — конструкция будет иметь жёсткое тело'
    return True, None


def _save_run(project_id: int | None, version_id: int | None, owner_id: int,
              status: str, payload: dict, response: dict | None,
              duration_ms: int, error_text: str | None):
    """Сохраняет лог запуска в cae_solver_runs."""
    if not project_id:
        return
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO cae_solver_runs (project_id, version_id, owner_id, status, "
                "payload_jsonb, response_jsonb, duration_ms, error_text) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                (project_id, version_id, owner_id, status,
                 json.dumps(payload, ensure_ascii=False),
                 json.dumps(response, ensure_ascii=False) if response else None,
                 duration_ms, error_text),
            )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f'[cae-solver] save_run error: {e!r}')


def _award_daily_solve_points(owner_id: int):
    """Начисляет +1 балл юзеру и +1 баллу его рефереру за активный день.
    Идемпотентно через dedup_key — повторное успешное начисление за тот же день не происходит.
    Ошибки не пробрасываем, чтобы не сломать ответ решателю."""
    try:
        today = datetime.now().date().isoformat()
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        with conn.cursor() as cur:
            # Гарантируем строку очков для юзера
            cur.execute(
                "INSERT INTO user_points (user_id, total_points) VALUES (%s, 0) "
                "ON CONFLICT (user_id) DO NOTHING",
                (owner_id,),
            )
            # +1 балл самому юзеру (раз в сутки)
            try:
                cur.execute(
                    "INSERT INTO user_points_log "
                    "(user_id, points, reason, note, dedup_key) "
                    "VALUES (%s, 1, 'self_daily_solve', %s, %s)",
                    (owner_id, f'Активность {today}',
                     f'self_daily_solve:{owner_id}:{today}'),
                )
                cur.execute(
                    "UPDATE user_points SET total_points = total_points + 1, "
                    "updated_at = now() WHERE user_id = %s",
                    (owner_id,),
                )
                # Ачивка «Первый расчёт» (без очков)
                cur.execute(
                    "INSERT INTO user_achievements (user_id, achievement_code) "
                    "VALUES (%s, 'first_solve') "
                    "ON CONFLICT (user_id, achievement_code) DO NOTHING",
                    (owner_id,),
                )
            except Exception:
                conn.rollback()

            # +1 балл рефереру (если есть и раз в сутки на каждого реф-активного)
            cur.execute(
                "SELECT referred_by_user_id FROM sso_users WHERE id = %s",
                (owner_id,),
            )
            r = cur.fetchone()
            referrer_id = int(r[0]) if r and r[0] else None
            if referrer_id:
                cur.execute(
                    "INSERT INTO user_points (user_id, total_points) VALUES (%s, 0) "
                    "ON CONFLICT (user_id) DO NOTHING",
                    (referrer_id,),
                )
                try:
                    cur.execute(
                        "INSERT INTO user_points_log "
                        "(user_id, points, reason, ref_user_id, note, dedup_key) "
                        "VALUES (%s, 1, 'referral_daily_solve', %s, %s, %s)",
                        (referrer_id, owner_id, f'Реф-актив {today}',
                         f'ref_daily:{referrer_id}:{owner_id}:{today}'),
                    )
                    cur.execute(
                        "UPDATE user_points SET total_points = total_points + 1, "
                        "active_referrals_count = ("
                        "  SELECT COUNT(DISTINCT u.id) FROM sso_users u "
                        "  JOIN user_points_log l ON l.user_id = u.id "
                        "  WHERE u.referred_by_user_id = %s AND l.reason = 'self_daily_solve'"
                        "), updated_at = now() WHERE user_id = %s",
                        (referrer_id, referrer_id),
                    )
                except Exception:
                    conn.rollback()
        conn.commit()
        conn.close()
    except Exception as e:
        print(f'[cae-solver] award_daily_points error: {e!r}')


def handler(event: dict, context) -> dict:
    method = event.get('httpMethod', 'POST')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = (params.get('action') or 'solve').strip()
    if method != 'POST':
        return _json_response(405, {'error': 'method_not_allowed'})

    # Парсим body
    body_raw = event.get('body') or '{}'
    if event.get('isBase64Encoded'):
        try:
            body_raw = base64.b64decode(body_raw).decode('utf-8')
        except Exception:
            return _json_response(400, {'error': 'invalid_base64'})
    if len(body_raw) > MAX_PAYLOAD_BYTES:
        return _json_response(413, {'error': 'payload_too_large',
                                    'message': f'Размер payload > {MAX_PAYLOAD_BYTES // 1024} КБ'})

    try:
        payload = json.loads(body_raw)
    except Exception:
        return _json_response(400, {'error': 'invalid_json'})

    if action == 'validate':
        ok, msg = _validate_payload(payload)
        return _json_response(200 if ok else 400,
                              {'valid': ok, 'message': msg or 'OK'})

    if action == 'demo':
        # Демо-режим без регистрации.
        # Лимит расчётов жёстко контролируется на СЕРВЕРЕ по IP — чтобы его
        # нельзя было обойти через инкогнито или очистку localStorage.
        # Узлов сколько угодно — нам важно дать почувствовать продукт целиком.
        # Для авторизованных идёт action=solve (без лимита в альфа-тесте).
        ok, msg = _validate_payload(payload)
        if not ok:
            return _json_response(400, {'error': 'validation_failed', 'message': msg})
        ip = _client_ip(event)
        allowed, used = _demo_check_and_count(ip)
        if not allowed:
            return _json_response(429, {
                'error': 'demo_limit_reached',
                'message': (
                    f'Лимит демо-режима исчерпан: {DEMO_SOLVE_LIMIT} расчётов '
                    f'без регистрации. Создайте бесплатный аккаунт, чтобы '
                    f'считать без ограничений.'
                ),
                'limit': DEMO_SOLVE_LIMIT,
                'used': used,
            })
        try:
            t0 = time.time()
            response = run_solver(payload)
            response['duration_ms'] = int((time.time() - t0) * 1000)
            response['demo'] = True
            response['demo_used'] = used
            response['demo_limit'] = DEMO_SOLVE_LIMIT
            return _json_response(200, response)
        except Exception as e:
            import traceback
            print(f'[cae-solver demo] error: {e!r}\n{traceback.format_exc()}')
            return _json_response(500, {'error': 'solver_failed', 'message': str(e)[:300]})

    # Авторизованный режим
    user = _auth_user(event)
    if not user:
        return _json_response(401, {'error': 'unauthorized',
                                    'message': 'Требуется вход. Используйте action=demo для пробного расчёта.'})

    owner_id = int(user['sub'])
    project_id = payload.get('meta', {}).get('project_id')
    version_id = payload.get('meta', {}).get('version_id')

    ok, msg = _validate_payload(payload)
    if not ok:
        _save_run(project_id, version_id, owner_id, 'error', payload, None, 0, msg)
        return _json_response(400, {'error': 'validation_failed', 'message': msg})

    # Запуск решателя
    t0 = time.time()
    try:
        response = run_solver(payload)
        duration_ms = int((time.time() - t0) * 1000)
        response['duration_ms'] = duration_ms
        _save_run(project_id, version_id, owner_id, 'ok', payload, response, duration_ms, None)
        # Начисляем баллы за активный день (юзеру и его рефереру). Не мешает ответу.
        _award_daily_solve_points(owner_id)
        return _json_response(200, response)
    except Exception as e:
        duration_ms = int((time.time() - t0) * 1000)
        import traceback
        tb = traceback.format_exc()
        print(f'[cae-solver] error: {e!r}\n{tb}')
        _save_run(project_id, version_id, owner_id, 'error', payload, None, duration_ms, f'{type(e).__name__}: {e}')
        return _json_response(500, {
            'error': 'solver_failed',
            'message': f'{type(e).__name__}: {e}'[:300],
        })