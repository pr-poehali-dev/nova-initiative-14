"""
Business: верификация CAE-солвера на эталонных задачах сопромата.
Прогоняет 13 классических задач (10 плоских + 3 пространственных) через тот же
солвер, что обслуживает реальных пользователей, и сверяет численные ответы с
аналитическими формулами (Феодосьев, Тимошенко).
Args: event с httpMethod GET/OPTIONS; опционально ?test=N — прогнать один тест.
Returns: JSON-отчёт с вердиктом PASS/FAIL по каждой метрике каждой задачи.

Декомпозиция:
  - constants.py     — STEEL, I20, TOLERANCE=5%, SOLVER_URL, алиасы G/I_y/I_t
  - test_models.py   — build-функции (10 2D + 3 3D) + all_tests()
  - solver_client.py — HTTP-вызов солвера, парсеры ответа (Mz, N, Qz, My, T,
                       реакции 3D, узловые перемещения/повороты)
  - evaluator.py     — evaluate_test(): сравнение с допуском, отладочный дамп

3D-эталоны (10–12): кручение консоли (φ=TL/GJ), изгиб в плоскости xz
(δ_z=PL³/3EI_y, My), косой двухосный изгиб (проверка независимости плоскостей).

Допуск 5% — стандартная инженерная точность МКЭ для линейной статики
на стержневых элементах Эйлера-Бернулли (фактическая обычно <1%).
"""
import json

from constants import SOLVER_URL, TOLERANCE
from evaluator import evaluate_test
from test_models import all_tests


def handler(event: dict, context) -> dict:
    """
    GET /             — прогоняет все 13 эталонных задач, отчёт PASS/FAIL.
    GET /?test=N      — прогоняет только N-й тест (для отладки, когда полный
                        ответ обрезается прокси).
    OPTIONS           — CORS preflight.
    """
    method = event.get("httpMethod", "GET")

    if method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Max-Age": "86400",
            },
            "body": "",
        }

    tests = all_tests()

    # ?test=N — прогнать только один тест.
    qs = event.get("queryStringParameters") or {}
    only = qs.get("test")
    if only is not None:
        try:
            idx = int(only)
            tests = [tests[idx]]
        except (ValueError, IndexError):
            pass

    results = [evaluate_test(t) for t in tests]
    n_pass = sum(1 for r in results if r["status"] == "PASS")
    n_total = len(results)

    report = {
        "verdict": "PASS" if n_pass == n_total else "FAIL",
        "passed": n_pass,
        "total": n_total,
        "tolerance_pct": TOLERANCE * 100,
        "solver_url": SOLVER_URL,
        "results": results,
    }

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
        },
        "isBase64Encoded": False,
        "body": json.dumps(report, ensure_ascii=False, indent=2),
    }