"""
Оценка одного теста: вызывает солвер, сравнивает все ожидаемые метрики
с фактическими и возвращает структурированный результат.

Каждая метрика идёт отдельной строкой `checks[]` с полями expected /
actual / error_pct / pass — это позволяет фронту рисовать таблицу
с подсветкой строк, не разбирая текст.

raw_dump — дополнительные данные для отладки (узловые реакции,
пиковые усилия по элементам, точки эпюр). Не используются для вердикта,
но критичны для разбора FAIL.
"""
from typing import Any

from constants import TOLERANCE
from solver_client import (
    call_solver,
    find_max_abs_axial,
    find_max_abs_moment,
    find_reaction,
    rel_error,
    sample_diagram,
    sum_reactions,
)


def _check(metric: str, actual_val: float, expected_val: float, scale: float = 1.0, decimals: int = 2) -> dict:
    """
    Готовая строка отчёта по одной метрике.
    scale — множитель для отображения (например, 1000 чтобы перевести м→мм).
    """
    err = rel_error(actual_val, expected_val)
    return {
        "metric": metric,
        "expected": round(expected_val * scale, decimals + 2 if scale != 1 else decimals),
        "actual": round(actual_val * scale, decimals + 2 if scale != 1 else decimals),
        "error_pct": round(err * 100, 2),
        "pass": err <= TOLERANCE,
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

    # Прогиб δ_max (м, отображаем в мм) — солвер сам считает в summary.
    if "max_displacement_m" in expected:
        v = response["summary"]["max_displacement"]
        actual["max_displacement_m"] = v
        checks.append(_check("Прогиб δ_max, мм", v, expected["max_displacement_m"], scale=1000, decimals=2))

    # Максимальный |Mz| по всем элементам.
    if "max_moment_nm" in expected:
        v = find_max_abs_moment(response)
        actual["max_moment_nm"] = v
        checks.append(_check("Момент M_max, Н·м", v, expected["max_moment_nm"]))

    # Максимальное |N| по всем элементам (для ферм).
    if "max_axial_n" in expected:
        v = find_max_abs_axial(response)
        actual["max_axial_n"] = v
        checks.append(_check("Осевая сила N_max, Н", v, expected["max_axial_n"]))

    # Реакция R_y на левой опоре n1 (стандартная для балок).
    if "reaction_fy_n" in expected:
        v = find_reaction(response, "n1", "fy")
        actual["reaction_fy_n"] = v
        checks.append(_check("Реакция R_y (n1), Н", v, expected["reaction_fy_n"]))

    # Момент в заделке Mz (для консолей).
    if "reaction_mz_nm" in expected:
        v = find_reaction(response, "n1", "mz")
        actual["reaction_mz_nm"] = v
        checks.append(_check("Момент в заделке Mz (n1), Н·м", v, expected["reaction_mz_nm"]))

    # Реакции порталной рамы (две опоры) + сумма Σ R_x для проверки равновесия.
    if "reaction_n1_fy_n" in expected:
        v = find_reaction(response, "n1", "fy")
        actual["reaction_n1_fy_n"] = v
        checks.append(_check("Реакция R_y(A), Н", v, expected["reaction_n1_fy_n"]))

    if "reaction_n4_fy_n" in expected:
        v = find_reaction(response, "n4", "fy")
        actual["reaction_n4_fy_n"] = v
        checks.append(_check("Реакция R_y(B), Н", v, expected["reaction_n4_fy_n"]))

    if "reaction_sum_fx_n" in expected:
        v = sum_reactions(response, "fx")
        actual["reaction_sum_fx_n"] = v
        checks.append(_check("Σ R_x (равновесие), Н", v, expected["reaction_sum_fx_n"]))

    all_pass = all(c["pass"] for c in checks)

    # Сырой дамп для отладки FAIL: узловые реакции и пиковые усилия по элементам.
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
                "mz_diagram_samples": sample_diagram(el, "Mz"),
                "qy_diagram_samples": sample_diagram(el, "Qy"),
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
