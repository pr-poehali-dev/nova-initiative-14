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


def find_max_abs_shear(response: dict) -> float:
    """
    Максимум |Qy| по всем элементам (для балок 2D).
    Солвер не публикует abs_Qy_max в max_values, поэтому считаем из массива.
    """
    q = 0.0
    for el in response.get("elements", []):
        qy_arr = el.get("diagrams", {}).get("Qy", [])
        for v in qy_arr:
            if abs(v) > q:
                q = abs(v)
    return q


def shear_at(response: dict, element_id: str, where: str) -> float:
    """
    Поперечная сила Qy в характерной точке элемента.
    where = 'start' | 'mid' | 'end'. Возвращает значение СО ЗНАКОМ —
    критично для проверки соотношения dM/dx = Q (см. фикс знака Qya).
    """
    for el in response.get("elements", []):
        if el.get("element_id") != element_id:
            continue
        qy_arr = el.get("diagrams", {}).get("Qy", [])
        if not qy_arr:
            return 0.0
        if where == "start":
            return float(qy_arr[0])
        if where == "end":
            return float(qy_arr[-1])
        if where == "mid":
            return float(qy_arr[len(qy_arr) // 2])
    return 0.0


def find_reaction(response: dict, node_id: str, key: str) -> float:
    """
    Реакция в указанном узле по компоненте.
    Для 2D: fx / fy / mz. Для 3D дополнительно: fz / mx / my.
    """
    for r in response.get("reactions", []):
        if r.get("node_id") == node_id:
            return r.get(key, 0.0)
    return 0.0


# === 3D-хелперы ===

def find_max_abs_diagram(response: dict, kind: str) -> float:
    """
    Максимум |value| эпюры заданного вида по всем элементам.
    kind ∈ {N, Qy, Qz, T, My, Mz, sigma_vm}. Универсальная замена для
    усилий, которых нет в max_values (Qz, T, и для единообразия My).
    """
    m = 0.0
    for el in response.get("elements", []):
        for v in el.get("diagrams", {}).get(kind, []):
            if abs(v) > m:
                m = abs(v)
    return m


def diagram_at(response: dict, element_id: str, kind: str, where: str) -> float:
    """
    Значение эпюры произвольного вида в характерной точке элемента СО ЗНАКОМ.
    kind — ключ в diagrams (N, Qy, Qz, T, My, Mz). where = start | mid | end.
    """
    for el in response.get("elements", []):
        if el.get("element_id") != element_id:
            continue
        arr = el.get("diagrams", {}).get(kind, [])
        if not arr:
            return 0.0
        if where == "start":
            return float(arr[0])
        if where == "end":
            return float(arr[-1])
        if where == "mid":
            return float(arr[len(arr) // 2])
    return 0.0


def nodal_dof(response: dict, node_id: str, dof: str) -> float:
    """
    Узловое перемещение/поворот по DOF (ux, uy, uz, rx, ry, rz).
    Нужно для проверки угла закручивания (rx) и прогиба uz в 3D.
    """
    for n in response.get("nodal_displacements", []):
        if n.get("node_id") == node_id:
            return float(n.get(dof, 0.0))
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