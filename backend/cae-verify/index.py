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


def build_cantilever_tip_moment(L: float = 2.0, M0: float = 15000.0) -> dict:
    """
    Тест 6: КОНСОЛЬ С СОСРЕДОТОЧЕННЫМ МОМЕНТОМ НА КОНЦЕ.

    Схема:
        |═══════════════⤴ M₀
        |   L = 2 м

    Точное решение (Феодосьев):
        M(x) = M₀ = const   — эпюра постоянная по всей длине
        Q(x) = 0
        δ_tip = M₀·L² / (2·E·I)
        θ_tip = M₀·L / (E·I)
        R_y   = 0
        R_M   = -M₀     (восстанавливающий момент в заделке)

    Цель — поймать ошибки в обработке внешнего момента (mz),
    которая никак не задействуется в тестах 1-5.
    """
    return {
        "name": "Консоль + сосредоточенный момент на конце",
        "scheme": "Cantilever + tip moment",
        "expected": {
            "max_displacement_m": M0 * L**2 / (2 * E * I),
            "max_moment_nm": M0,
            "reaction_fy_n": 0.0,
            "reaction_mz_nm": -M0,
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
                {"id": "ld1", "type": "nodal_force", "node_id": "n2",
                 "force": [0, 0, 0], "moment": [0, 0, M0]},
            ],
        },
    }


def build_simply_supported_center_moment(L: float = 4.0, M0: float = 20000.0) -> dict:
    """
    Тест 7: ШАРНИРНАЯ БАЛКА + СОСРЕДОТОЧЕННЫЙ МОМЕНТ В ЦЕНТРЕ.

    Схема:
                       ⤴ M₀
        △==============●===============△
        |              L/2             |

    Точное решение (Тимошенко):
        Σ M вокруг n1: M₀ + R_B·L = 0  →  R_B = -M₀/L
        Σ Fy:          R_A + R_B = 0    →  R_A = +M₀/L
        M(x < L/2) = R_A·x = M₀·x/L      (растёт от 0 до M₀/2)
        M(x > L/2) = R_A·x - M₀ = M₀·(x/L - 1) (от -M₀/2 до 0)
        |M_max|  = M₀/2  (по обеим сторонам от центра — скачок M₀)

    На самом деле, в узле приложения M₀ эпюра претерпевает скачок размером M₀,
    значит на двух элементах:
        - левый: М по концам = 0 и -M₀/2 (по модулю M₀/2 — это пик слева)
        - правый: М по концам = M₀/2 и 0  (M₀/2 — это пик справа)
        max|M| по всей раме = M₀/2 = 10000 Н·м

    Цель — поймать ошибки в эпюре М когда есть узловой момент И узловые
    реакции одновременно.
    """
    return {
        "name": "Шарнирная балка + момент в центре",
        "scheme": "Simply supported + central moment",
        "expected": {
            "max_moment_nm": M0 / 2,
            "reaction_fy_n": M0 / L,  # +M₀/L (см. вывод выше)
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
                 "force": [0, 0, 0], "moment": [0, 0, M0]},
            ],
        },
    }


def build_two_point_loads(L: float = 6.0, P: float = 10000.0, a: float = 2.0) -> dict:
    """
    Тест 8: ШАРНИРНАЯ БАЛКА С ДВУМЯ СИММЕТРИЧНЫМИ СИЛАМИ (4-точечный изгиб).

    Схема:
                ⬇ P              ⬇ P
        △======●================●=======△
        |  a   |     L-2a       |  a   |
        |             L = 6 м             |

    Это «классический четырёхточечный изгиб» — стандарт ASTM для испытания
    материалов. Между точками приложения сил эпюра M = const = P·a,
    эпюра Q = 0 — чистый изгиб без сдвига. Очень удобная задача.

    Точное решение:
        R_A = R_B = P
        M_max = P·a  на участке между силами (постоянный)
        δ_center = P·a·(3·L² - 4·a²) / (24·E·I)   — прогиб посредине
    """
    L_mid = L - 2 * a  # средний участок, на котором M = const
    return {
        "name": "Балка с двумя силами (4-точечный изгиб)",
        "scheme": "Simply supported + two symmetric point loads",
        "expected": {
            "max_displacement_m": P * a * (3 * L**2 - 4 * a**2) / (24 * E * I),
            "max_moment_nm": P * a,
            "reaction_fy_n": P,
        },
        "model": {
            "meta": {"dim": "2d"},
            "materials": [STEEL],
            "sections": [I20],
            "nodes": [
                {"id": "n1", "coords": [0, 0, 0]},
                {"id": "n2", "coords": [a, 0, 0]},
                {"id": "n3", "coords": [a + L_mid, 0, 0]},
                {"id": "n4", "coords": [L, 0, 0]},
            ],
            "elements": [
                {"id": "e1", "node_start": "n1", "node_end": "n2",
                 "material_id": "steel", "section_id": "i20"},
                {"id": "e2", "node_start": "n2", "node_end": "n3",
                 "material_id": "steel", "section_id": "i20"},
                {"id": "e3", "node_start": "n3", "node_end": "n4",
                 "material_id": "steel", "section_id": "i20"},
            ],
            "boundary_conditions": [
                {"id": "bc1", "node_id": "n1", "type": "pinned",
                 "constrained_dofs": ["ux", "uy"]},
                {"id": "bc2", "node_id": "n4", "type": "roller_y",
                 "constrained_dofs": ["uy"]},
            ],
            "loads": [
                {"id": "ld1", "type": "nodal_force", "node_id": "n2",
                 "force": [0, -P, 0], "moment": [0, 0, 0]},
                {"id": "ld2", "type": "nodal_force", "node_id": "n3",
                 "force": [0, -P, 0], "moment": [0, 0, 0]},
            ],
        },
    }


def build_two_span_continuous(L: float = 4.0, q: float = 5000.0) -> dict:
    """
    Тест 9: ДВУХПРОЛЁТНАЯ НЕРАЗРЕЗНАЯ БАЛКА С UDL.

    Схема:
        ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇  q (Н/м)
        △═══════════════△═══════════════△
        |     L = 4 м     |    L = 4 м    |

    Сверхстатическая система (1 раз неопределимая). Точное решение через
    три-моментное уравнение Клапейрона:
        M_B (на средней опоре) = -q·L² / 8 = -10000  Н·м
        R_A = R_C = 3·q·L / 8
        R_B     = 5·q·L / 4
        M_max  в пролёте = 9·q·L² / 128 ≈ 5625 Н·м
        Глобальный |M|_max = q·L²/8 = 10000 (на средней опоре).
        δ_max в пролёте ≈ q·L⁴ / (185·E·I)

    Цель — проверить, корректно ли солвер собирает глобальную матрицу
    жёсткости при кинематической связи через общий узел (для одной балки
    это тривиально, но для неразрезной даёт нетривиальную реакцию R_B).
    """
    return {
        "name": "Двухпролётная неразрезная балка",
        "scheme": "Two-span continuous beam + UDL",
        "expected": {
            "max_moment_nm": q * L**2 / 8,   # |M| на средней опоре
            "reaction_fy_n": 3 * q * L / 8,  # R_A на крайней опоре
        },
        "model": {
            "meta": {"dim": "2d"},
            "materials": [STEEL],
            "sections": [I20],
            "nodes": [
                {"id": "n1", "coords": [0, 0, 0]},
                {"id": "n2", "coords": [L, 0, 0]},
                {"id": "n3", "coords": [2 * L, 0, 0]},
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
                {"id": "bc2", "node_id": "n2", "type": "roller_y",
                 "constrained_dofs": ["uy"]},
                {"id": "bc3", "node_id": "n3", "type": "roller_y",
                 "constrained_dofs": ["uy"]},
            ],
            "loads": [
                {"id": "ld1", "type": "distributed_uniform", "element_id": "e1",
                 "load_local_per_length": [0, -q, 0]},
                {"id": "ld2", "type": "distributed_uniform", "element_id": "e2",
                 "load_local_per_length": [0, -q, 0]},
            ],
            "analysis_options": {"diagram_subdivisions": 30},
        },
    }


def build_truss_triangle(L: float = 3.0, P: float = 10000.0) -> dict:
    """
    Тест 10: ТРЕУГОЛЬНАЯ ФЕРМА С ВЕРТИКАЛЬНОЙ СИЛОЙ В ВЕРШИНЕ.

    Схема (равнобедренный треугольник, высота H = L·√3/2 ≈ 2.6 м):

                       ⬇ P
                       ●  n3
                      / \
                  e2 /   \ e3
                    /     \
                   /       \
              n1 ●─────────● n2
                 △   e1    △
                 |── L = 3 ─|

    Все стержни — шарнирные (hinge_start=true, hinge_end=true) → ферма.
    Углы: e2 и e3 наклонены под 60° к горизонту.

    Точное решение (метод вырезания узлов):
        В узле n3: ΣFy = 0  →  -P + N₂·sin(60°) + N₃·sin(60°) = 0
                   ΣFx = 0  →  -N₂·cos(60°) + N₃·cos(60°) = 0  →  N₂ = N₃
                   ⇒  N₂ = N₃ = P / (2·sin 60°) = P / √3 ≈ 5773.5 Н (сжатие)
        В узле n1: ΣFy = 0  →  R_A + N₂·sin(60°)·(-1) = 0  →  R_A = P/2
                   (горизонтальная компонента N₂ балансируется тягой e1)
        В нижнем поясе: N₁ = N₂·cos(60°) = P·cos(60°)/(2·sin(60°)) = P/(2·tan 60°)
                       = P/(2·√3) ≈ 2886.8 Н (растяжение)

    Цель — проверить осевые усилия N (которые в балочных тестах около нуля)
    и поведение шарнирных соединений (hinge_start/hinge_end).
    """
    import math
    H = L * math.sqrt(3) / 2  # высота равностороннего треугольника
    N_diagonal = P / math.sqrt(3)       # модуль осевой силы в наклонных стержнях
    N_bottom = P / (2 * math.sqrt(3))   # осевая сила в нижнем поясе
    return {
        "name": "Треугольная ферма + вертикальная сила в вершине",
        "scheme": "Equilateral triangular truss + tip vertical load",
        "expected": {
            # Максимум осевой силы по всем 3 стержням — это диагональ.
            "max_axial_n": N_diagonal,
            "reaction_fy_n": P / 2,  # реакция в опоре n1
        },
        "model": {
            "meta": {"dim": "2d"},
            "materials": [STEEL],
            "sections": [I20],
            "nodes": [
                {"id": "n1", "coords": [0, 0, 0]},
                {"id": "n2", "coords": [L, 0, 0]},
                {"id": "n3", "coords": [L / 2, H, 0]},
            ],
            "elements": [
                {"id": "e1", "node_start": "n1", "node_end": "n2",
                 "material_id": "steel", "section_id": "i20",
                 "hinge_start": True, "hinge_end": True},
                {"id": "e2", "node_start": "n1", "node_end": "n3",
                 "material_id": "steel", "section_id": "i20",
                 "hinge_start": True, "hinge_end": True},
                {"id": "e3", "node_start": "n2", "node_end": "n3",
                 "material_id": "steel", "section_id": "i20",
                 "hinge_start": True, "hinge_end": True},
            ],
            "boundary_conditions": [
                {"id": "bc1", "node_id": "n1", "type": "pinned",
                 "constrained_dofs": ["ux", "uy"]},
                {"id": "bc2", "node_id": "n2", "type": "roller_y",
                 "constrained_dofs": ["uy"]},
            ],
            "loads": [
                {"id": "ld1", "type": "nodal_force", "node_id": "n3",
                 "force": [0, -P, 0], "moment": [0, 0, 0]},
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


def find_max_abs_axial(response: dict) -> float:
    """Максимум |N| по всем элементам (для ферм)."""
    n = 0.0
    for el in response.get("elements", []):
        n_max = el.get("max_values", {}).get("abs_N_max", 0)
        if n_max > n:
            n = n_max
    return n


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

    # max_axial — максимальное |N| по всем элементам (для ферм)
    if "max_axial_n" in expected:
        actual_val = find_max_abs_axial(response)
        actual["max_axial_n"] = actual_val
        err = rel_error(actual_val, expected["max_axial_n"])
        checks.append({
            "metric": "Осевая сила N_max, Н",
            "expected": round(expected["max_axial_n"], 2),
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
                "qy_diagram_samples": _sample_diagram(el, "Qy"),
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
        build_cantilever_point_load(),           # 0
        build_simply_supported_center_load(),    # 1
        build_simply_supported_udl(),            # 2
        build_cantilever_udl(),                  # 3
        build_portal_frame(),                    # 4
        build_cantilever_tip_moment(),           # 5: новый — момент на конце
        build_simply_supported_center_moment(),  # 6: новый — момент в центре
        build_two_point_loads(),                 # 7: новый — 4-точечный изгиб
        build_two_span_continuous(),             # 8: новый — неразрезная балка
        build_truss_triangle(),                  # 9: новый — треугольная ферма
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