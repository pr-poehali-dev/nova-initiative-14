"""
HTTP-клиент CAE-солвера + парсеры ответа.

Все функции — pure helpers без побочных эффектов кроме одного сетевого
вызова в call_solver. Используются evaluator.py для сравнения солвера
с аналитикой.
"""
import json
import urllib.error
import urllib.request

from constants import SOLVER_URL


def call_solver(model: dict, timeout: int = 25) -> dict:
    """
    POST /?action=demo — вызов production-солвера через demo-эндпоинт
    (без авторизации). Возвращает JSON ответа или {"status":"error",...}.
    """
    body = json.dumps(model).encode("utf-8")
    req = urllib.request.Request(
        f"{SOLVER_URL}?action=demo",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return {
            "status": "error",
            "errors": [f"HTTP {e.code}: {e.read().decode('utf-8', errors='ignore')}"],
        }
    except Exception as e:
        return {"status": "error", "errors": [f"{type(e).__name__}: {e}"]}


def rel_error(actual: float, expected: float) -> float:
    """Относительная погрешность |actual−expected| / max(|expected|, eps)."""
    if expected == 0:
        return abs(actual)
    return abs(actual - expected) / abs(expected)


def find_max_abs_moment(response: dict) -> float:
    """Максимум |Mz| по всем элементам (для балок 2D)."""
    m = 0.0
    for el in response.get("elements", []):
        mz_max = el.get("max_values", {}).get("abs_Mz_max", 0)
        if mz_max > m:
            m = mz_max
    return m


def find_max_abs_axial(response: dict) -> float:
    """Максимум |N| по всем элементам (для ферм)."""
    n = 0.0
    for el in response.get("elements", []):
        n_max = el.get("max_values", {}).get("abs_N_max", 0)
        if n_max > n:
            n = n_max
    return n


def find_reaction(response: dict, node_id: str, key: str) -> float:
    """Реакция в указанном узле по компоненте (fx / fy / mz)."""
    for r in response.get("reactions", []):
        if r.get("node_id") == node_id:
            return r.get(key, 0.0)
    return 0.0


def sum_reactions(response: dict, key: str) -> float:
    """Сумма компонент реакций по всем узлам (для проверки глобального равновесия)."""
    return sum(r.get(key, 0.0) for r in response.get("reactions", []))


def sample_diagram(el: dict, kind: str) -> dict:
    """3 точки эпюры (x=0, середина, x=L) — для отладочного дампа."""
    diagrams = el.get("diagrams", {})
    xs = diagrams.get("x", [])
    vals = diagrams.get(kind, [])
    if not xs or not vals or len(xs) != len(vals):
        return {}
    mid_idx = len(xs) // 2
    return {
        "x0": round(vals[0], 2),
        "x_mid": round(vals[mid_idx], 2),
        "x_end": round(vals[-1], 2),
    }
