"""
Верификация CAE-солвера на эталонных задачах сопромата.

Прогоняет 5 классических задач с известными аналитическими решениями
(Феодосьев "Сопротивление материалов", Тимошенко) через тот же солвер,
что обслуживает реальных пользователей, и сверяет численные ответы
с формулами. Допуск 5% — стандартная инженерная точность МКЭ
для линейной статики на крупной сетке.

Endpoint: GET /  → запускает все тесты, возвращает отчёт JSON.
"""
import json
import os
import urllib.request
import urllib.error
from typing import Any


# URL продакшн-солвера. Не хардкодим — читаем из переменной окружения,
# чтобы можно было прогнать тесты против staging.
SOLVER_URL = os.environ.get(
    "CAE_SOLVER_URL",
    "https://functions.poehali.dev/b470871c-af29-425e-90ed-8fc6c152ab1e",
)

# Допустимая относительная погрешность (5%). МКЭ на стержневых элементах
# Эйлера-Бернулли для линейной статики обычно даёт <1% на узловых
# перемещениях и моментах; запас в 5% покрывает округления.
TOLERANCE = 0.05

# ============================================================
# ОБЩИЕ МАТЕРИАЛЫ И СЕЧЕНИЯ ДЛЯ ВСЕХ ТЕСТОВ
# ============================================================
# Сталь Ст3: E = 2.1e11 Па (стандарт сопромата)
STEEL = {
    "id": "steel",
    "name": "Сталь Ст3",
    "E": 2.1e11,
    "G": 8.1e10,
    "nu": 0.3,
    "rho": 7850,
    "sigma_yield": 245e6,
}

# Двутавр I20 (ГОСТ 8239-89): I_z = 1840 см⁴ = 1.84e-5 м⁴
# Это "учебный" профиль для большинства задач сопромата.
I20 = {
    "id": "i20",
    "name": "Двутавр I20",
    "A": 26.8e-4,
    "I_z": 1840e-8,
    "I_y": 115e-8,
    "I_t": 5.4e-8,
    "W_z": 184e-6,
    "W_y": 23.1e-6,
    "h": 0.2,
    "shear_area_y": 13.4e-4,
    "shear_area_z": 18.7e-4,
}

E = STEEL["E"]
I = I20["I_z"]


# ============================================================
# ЭТАЛОННЫЕ ЗАДАЧИ
# ============================================================

def build_cantilever_point_load(L: float = 2.0, P: float = 10000.0) -> dict:
    """
    Тест 1: КОНСОЛЬНАЯ БАЛКА С СОСРЕДОТОЧЕННОЙ СИЛОЙ НА КОНЦЕ.

    Схема:
        |======================⬇ P
        |   L = 2 м

    Точное решение (Феодосьев, гл. VI):
        δ_max = P·L³ / (3·E·I)    — прогиб на свободном конце
        M_max = P·L               — момент в заделке
        R_y   = P                 — вертикальная реакция
        R_M   = P·L               — момент реакции
    """
    return {
        "name": "Консольная балка, сила на конце",
        "scheme": "Cantilever + tip point load",
        "expected": {
            "max_displacement_m": P * L**3 / (3 * E * I),
            "max_moment_nm": P * L,
            "reaction_fy_n": P,
            "reaction_mz_nm": P * L,
        },
        "model": {
            "meta": {"dim": "2d"},
            "materials": [STEEL],
            "sections": [I20],
            "nodes": [
                {"id": "n1", "coords": [0, 0, 0]},
                {"id": "n2", "coords": [L, 0, 0]},
            ],
            "elements": [
                {
                    "id": "e1",
                    "node_start": "n1",
                    "node_end": "n2",
                    "material_id": "steel",
                    "section_id": "i20",
                }
            ],
            "boundary_conditions": [
                {
                    "id": "bc1",
                    "node_id": "n1",
                    "type": "fixed",
                    "constrained_dofs": ["ux", "uy", "rz"],
                }
            ],
            "loads": [
                {
                    "id": "ld1",
                    "type": "nodal_force",
                    "node_id": "n2",
                    "force": [0, -P, 0],
                    "moment": [0, 0, 0],
                }
            ],
        },
    }


def build_simply_supported_center_load(L: float = 4.0, P: float = 20000.0) -> dict:
    """
    Тест 2: ШАРНИРНАЯ БАЛКА С СИЛОЙ В СЕРЕДИНЕ.

    Схема:
                       ⬇ P
        △==============●===============△
        |              L/2             |
        |              L = 4 м         |

    Точное решение (Тимошенко, Strength of Materials):
        δ_center = P·L³ / (48·E·I)
        M_max    = P·L / 4              — момент под силой
        R_A = R_B = P/2                 — симметричные реакции
    """
    return {
        "name": "Шарнирная балка, сила по центру",
        "scheme": "Simply supported + central point load",
        "expected": {
            "max_displacement_m": P * L**3 / (48 * E * I),
            "max_moment_nm": P * L / 4,
            "reaction_fy_n": P / 2,
        },
        "model": {
            "meta": {"dim": "2d"},
            "materials": [STEEL],
            "sections": [I20],
            "nodes": [
                {"id": "n1", "coords": [0, 0, 0]},
                {"id": "n2", "coords": [L / 2, 0, 0]},
                {"id": "n3", "coords": [L, 0, 0]},
            ],
            "elements": [
                {"id": "e1", "node_start": "n1", "node_end": "n2",
                 "material_id": "steel", "section_id": "i20"},
                {"id": "e2", "node_start": "n2", "node_end": "n3",
                 "material_id": "steel", "section_id": "i20"},
            ],
            "boundary_conditions": [
                {"id": "bc1", "node_id": "n1", "type": "pinned",
                 "constrained_dofs": ["ux", "uy"]},
                {"id": "bc2", "node_id": "n3", "type": "roller_y",
                 "constrained_dofs": ["uy"]},
            ],
            "loads": [
                {"id": "ld1", "type": "nodal_force", "node_id": "n2",
                 "force": [0, -P, 0], "moment": [0, 0, 0]},
            ],
        },
    }


def build_simply_supported_udl(L: float = 4.0, q: float = 5000.0) -> dict:
    """
    Тест 3: ШАРНИРНАЯ БАЛКА С РАВНОМЕРНОЙ НАГРУЗКОЙ.

    Схема:
        ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇  q (Н/м)
        △═══════════════△
        |     L = 4 м    |

    Точное решение:
        δ_center = 5·q·L⁴ / (384·E·I)
        M_max    = q·L² / 8           — посередине
        R_A = R_B = q·L / 2
    """
    return {
        "name": "Шарнирная балка, равномерная нагрузка",
        "scheme": "Simply supported + UDL",
        "expected": {
            "max_displacement_m": 5 * q * L**4 / (384 * E * I),
            "max_moment_nm": q * L**2 / 8,
            "reaction_fy_n": q * L / 2,
        },
        "model": {
            "meta": {"dim": "2d"},
            "materials": [STEEL],
            "sections": [I20],
            "nodes": [
                {"id": "n1", "coords": [0, 0, 0]},
                {"id": "n2", "coords": [L, 0, 0]},
            ],
            "elements": [
                {"id": "e1", "node_start": "n1", "node_end": "n2",
                 "material_id": "steel", "section_id": "i20"},
            ],
            "boundary_conditions": [
                {"id": "bc1", "node_id": "n1", "type": "pinned",
                 "constrained_dofs": ["ux", "uy"]},
                {"id": "bc2", "node_id": "n2", "type": "roller_y",
                 "constrained_dofs": ["uy"]},
            ],
            "loads": [
                {"id": "ld1", "type": "distributed_uniform", "element_id": "e1",
                 "load_local_per_length": [0, -q, 0]},
            ],
            "analysis_options": {"diagram_subdivisions": 20},
        },
    }


def build_cantilever_udl(L: float = 2.0, q: float = 5000.0) -> dict:
    """
    Тест 4: КОНСОЛЬНАЯ БАЛКА С РАВНОМЕРНОЙ НАГРУЗКОЙ.

    Схема:
        ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇  q (Н/м)
        |═══════════════
        |   L = 2 м

    Точное решение:
        δ_tip = q·L⁴ / (8·E·I)
        M_max = q·L² / 2          — в заделке
        R_y   = q·L
        R_M   = q·L² / 2
    """
    return {
        "name": "Консольная балка, равномерная нагрузка",
        "scheme": "Cantilever + UDL",
        "expected": {
            "max_displacement_m": q * L**4 / (8 * E * I),
            "max_moment_nm": q * L**2 / 2,
            "reaction_fy_n": q * L,
            "reaction_mz_nm": q * L**2 / 2,
        },
        "model": {
            "meta": {"dim": "2d"},
            "materials": [STEEL],
            "sections": [I20],
            "nodes": [
                {"id": "n1", "coords": [0, 0, 0]},
                {"id": "n2", "coords": [L, 0, 0]},
            ],
            "elements": [
                {"id": "e1", "node_start": "n1", "node_end": "n2",
                 "material_id": "steel", "section_id": "i20"},
            ],
            "boundary_conditions": [
                {"id": "bc1", "node_id": "n1", "type": "fixed",
                 "constrained_dofs": ["ux", "uy", "rz"]},
            ],
            "loads": [
                {"id": "ld1", "type": "distributed_uniform", "element_id": "e1",
                 "load_local_per_length": [0, -q, 0]},
            ],
            "analysis_options": {"diagram_subdivisions": 20},
        },
    }


def build_portal_frame(H: float = 3.0, L: float = 4.0, P: float = 5000.0) -> dict:
    """
    Тест 5: П-ОБРАЗНАЯ ПОРТАЛЬНАЯ РАМА С ГОРИЗОНТАЛЬНОЙ СИЛОЙ.

    Схема (две стойки + ригель, обе опоры — шарниры):

        P →●━━━━━━━━━━━━●
            ║            ║
            ║            ║  H = 3 м
            ║            ║
            △            △
            |── L = 4 м ─|

    Проверяем СТАТИКУ — сумма моментов и сил:
        Σ Fx: R_Ax + R_Bx + P = 0  → R_Ax + R_Bx = -P
        Σ Fy: R_Ay + R_By = 0
        Σ M_A: P·H - R_By·L = 0    → R_By = P·H/L
        ⇒ R_Ay = -P·H/L            (вверх в A, вниз в B)
        ⇒ R_By =  P·H/L

    Для шарнирно опёртой рамы реакции — это чистая статика, не зависит от EI.
    Это самый надёжный тест: проверяет правильность глобального уравнения
    равновесия и матрицы жёсткости одновременно.
    """
    return {
        "name": "Портальная рама, горизонтальная сила",
        "scheme": "Pinned portal frame + lateral force",
        "expected": {
            "reaction_n1_fy_n": -P * H / L,   # вертикальная в опоре A (вверх → отрицательная Fy реакция)
            "reaction_n4_fy_n":  P * H / L,   # вертикальная в опоре B (вниз)
            "reaction_sum_fx_n": -P,          # сумма горизонтальных реакций = -P
        },
        "model": {
            "meta": {"dim": "2d"},
            "materials": [STEEL],
            "sections": [I20],
            "nodes": [
                {"id": "n1", "coords": [0, 0, 0]},      # опора A (низ-лево)
                {"id": "n2", "coords": [0, H, 0]},      # угол слева
                {"id": "n3", "coords": [L, H, 0]},      # угол справа
                {"id": "n4", "coords": [L, 0, 0]},      # опора B (низ-право)
            ],
            "elements": [
                # стойка левая
                {"id": "col_left", "node_start": "n1", "node_end": "n2",
                 "material_id": "steel", "section_id": "i20"},
                # ригель
                {"id": "beam", "node_start": "n2", "node_end": "n3",
                 "material_id": "steel", "section_id": "i20"},
                # стойка правая
                {"id": "col_right", "node_start": "n3", "node_end": "n4",
                 "material_id": "steel", "section_id": "i20"},
            ],
            "boundary_conditions": [
                {"id": "bc1", "node_id": "n1", "type": "pinned",
                 "constrained_dofs": ["ux", "uy"]},
                {"id": "bc2", "node_id": "n4", "type": "pinned",
                 "constrained_dofs": ["ux", "uy"]},
            ],
            "loads": [
                # Горизонтальная сила P → приложена к узлу n2 (верх левой стойки)
                {"id": "ld1", "type": "nodal_force", "node_id": "n2",
                 "force": [P, 0, 0], "moment": [0, 0, 0]},
            ],
        },
    }


# ============================================================
# ЗАПУСК СОЛВЕРА И СРАВНЕНИЕ
# ============================================================

def call_solver(model: dict, timeout: int = 25) -> dict:
    """Вызов production-солвера через demo-action (без авторизации)."""
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
    """Относительная погрешность |actual - expected| / max(|expected|, eps)."""
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


def find_reaction(response: dict, node_id: str, key: str) -> float:
    """Реакция в узле по компоненте (fx/fy/mz)."""
    for r in response.get("reactions", []):
        if r.get("node_id") == node_id:
            return r.get(key, 0.0)
    return 0.0


def sum_reactions(response: dict, key: str) -> float:
    """Сумма компонент реакций по всем узлам (для проверки равновесия)."""
    return sum(r.get(key, 0.0) for r in response.get("reactions", []))


def _sample_diagram(el: dict, kind: str) -> dict:
    """Возвращает 3 точки эпюры: x=0, середина, x=L — для отладки."""
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


def evaluate_test(test: dict) -> dict:
    """Запускает один тест и возвращает разбор по каждому ожиданию."""
    response = call_solver(test["model"])

    if response.get("status") != "ok":
        return {
            "name": test["name"],
            "scheme": test["scheme"],
            "status": "ERROR",
            "error": "; ".join(response.get("errors", ["unknown"])),
            "checks": [],
            "expected": test["expected"],
            "actual": {},
        }

    expected = test["expected"]
    actual: dict[str, Any] = {}
    checks: list[dict] = []

    # max_displacement (м) — берём из summary, который солвер сам считает
    if "max_displacement_m" in expected:
        actual_val = response["summary"]["max_displacement"]
        actual["max_displacement_m"] = actual_val
        err = rel_error(actual_val, expected["max_displacement_m"])
        checks.append({
            "metric": "Прогиб δ_max, мм",
            "expected": round(expected["max_displacement_m"] * 1000, 4),
            "actual": round(actual_val * 1000, 4),
            "error_pct": round(err * 100, 2),
            "pass": err <= TOLERANCE,
        })

    # max_moment — максимальный |Mz| по всем элементам
    if "max_moment_nm" in expected:
        actual_val = find_max_abs_moment(response)
        actual["max_moment_nm"] = actual_val
        err = rel_error(actual_val, expected["max_moment_nm"])
        checks.append({
            "metric": "Момент M_max, Н·м",
            "expected": round(expected["max_moment_nm"], 2),
            "actual": round(actual_val, 2),
            "error_pct": round(err * 100, 2),
            "pass": err <= TOLERANCE,
        })

    # reaction_fy_n (для балок — на левой опоре n1)
    if "reaction_fy_n" in expected:
        actual_val = find_reaction(response, "n1", "fy")
        actual["reaction_fy_n"] = actual_val
        err = rel_error(actual_val, expected["reaction_fy_n"])
        checks.append({
            "metric": "Реакция R_y (n1), Н",
            "expected": round(expected["reaction_fy_n"], 2),
            "actual": round(actual_val, 2),
            "error_pct": round(err * 100, 2),
            "pass": err <= TOLERANCE,
        })

    # reaction_mz_nm — момент в заделке (для консолей)
    if "reaction_mz_nm" in expected:
        actual_val = find_reaction(response, "n1", "mz")
        actual["reaction_mz_nm"] = actual_val
        err = rel_error(actual_val, expected["reaction_mz_nm"])
        checks.append({
            "metric": "Момент в заделке Mz (n1), Н·м",
            "expected": round(expected["reaction_mz_nm"], 2),
            "actual": round(actual_val, 2),
            "error_pct": round(err * 100, 2),
            "pass": err <= TOLERANCE,
        })

    # Специфика портальной рамы
    if "reaction_n1_fy_n" in expected:
        actual_val = find_reaction(response, "n1", "fy")
        actual["reaction_n1_fy_n"] = actual_val
        err = rel_error(actual_val, expected["reaction_n1_fy_n"])
        checks.append({
            "metric": "Реакция R_y(A), Н",
            "expected": round(expected["reaction_n1_fy_n"], 2),
            "actual": round(actual_val, 2),
            "error_pct": round(err * 100, 2),
            "pass": err <= TOLERANCE,
        })

    if "reaction_n4_fy_n" in expected:
        actual_val = find_reaction(response, "n4", "fy")
        actual["reaction_n4_fy_n"] = actual_val
        err = rel_error(actual_val, expected["reaction_n4_fy_n"])
        checks.append({
            "metric": "Реакция R_y(B), Н",
            "expected": round(expected["reaction_n4_fy_n"], 2),
            "actual": round(actual_val, 2),
            "error_pct": round(err * 100, 2),
            "pass": err <= TOLERANCE,
        })

    if "reaction_sum_fx_n" in expected:
        actual_val = sum_reactions(response, "fx")
        actual["reaction_sum_fx_n"] = actual_val
        err = rel_error(actual_val, expected["reaction_sum_fx_n"])
        checks.append({
            "metric": "Σ R_x (равновесие), Н",
            "expected": round(expected["reaction_sum_fx_n"], 2),
            "actual": round(actual_val, 2),
            "error_pct": round(err * 100, 2),
            "pass": err <= TOLERANCE,
        })

    all_pass = all(c["pass"] for c in checks)

    # Сырой дамп для отладки — узловые перемещения, реакции,
    # пиковые усилия по элементам. Чтобы видеть, врёт ли солвер
    # или мы интерпретируем неправильно.
    raw_dump = {
        "reactions": [
            {
                "node_id": r.get("node_id"),
                "fx_n": round(r.get("fx", 0), 2),
                "fy_n": round(r.get("fy", 0), 2),
                "mz_nm": round(r.get("mz", 0), 2),
            }
            for r in response.get("reactions", [])
        ],
        "elements_max": [
            {
                "id": el.get("element_id"),
                "length_m": round(el.get("length", 0), 3),
                "abs_N_max_n": round(el.get("max_values", {}).get("abs_N_max", 0), 2),
                "abs_Mz_max_nm": round(el.get("max_values", {}).get("abs_Mz_max", 0), 2),
                # Несколько точек эпюры Mz для отладки: x=0, середина, x=L
                "mz_diagram_samples": _sample_diagram(el, "Mz"),
            }
            for el in response.get("elements", [])
        ],
    }

    return {
        "name": test["name"],
        "scheme": test["scheme"],
        "status": "PASS" if all_pass else "FAIL",
        "checks": checks,
        "duration_ms": response.get("duration_ms"),
        "solver_version": response.get("solver_version"),
        "raw": raw_dump,
    }


def handler(event: dict, context) -> dict:
    """
    Запуск верификационного набора CAE-солвера.

    GET /  → прогоняет 5 эталонных задач сопромата и возвращает
             детальный отчёт: ожидаемое vs фактическое, погрешность,
             вердикт PASS/FAIL по каждой метрике и общий итог.

    Поддерживает только GET и OPTIONS. Параметров нет.
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

    tests = [
        build_cantilever_point_load(),
        build_simply_supported_center_load(),
        build_simply_supported_udl(),
        build_cantilever_udl(),
        build_portal_frame(),
    ]

    # Поддержка ?test=N — прогнать только один тест (полезно для отладки,
    # когда полный отчёт обрезается прокси).
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