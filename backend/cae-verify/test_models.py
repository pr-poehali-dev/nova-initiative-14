"""
Эталонные расчётные схемы сопромата для верификации CAE-солвера.

Каждая build-функция возвращает dict:
  {
    "name": ...,         # читаемое название
    "scheme": ...,       # короткий английский тег
    "expected": {...},   # аналитические ожидания
    "model": {...},      # модель в формате solver-payload
  }

Источники:
  - Феодосьев В.И., «Сопротивление материалов», гл. VI
  - Тимошенко С.П., «Strength of Materials»
"""
import math

from constants import E, G, I, I20, I_T, I_Y, I_Z, STEEL


def build_cantilever_point_load(L: float = 2.0, P: float = 10000.0) -> dict:
    """
    Тест 1: КОНСОЛЬНАЯ БАЛКА С СОСРЕДОТОЧЕННОЙ СИЛОЙ НА КОНЦЕ.
    δ_max = P·L³/(3EI), M_max = P·L, R_y = P, R_M = P·L (Феодосьев, гл. VI).
    """
    return {
        "name": "Консольная балка, сила на конце",
        "scheme": "Cantilever + tip point load",
        "expected": {
            "max_displacement_m": P * L**3 / (3 * E * I),
            "max_moment_nm": P * L,
            "reaction_fy_n": P,
            "reaction_mz_nm": P * L,
            "max_shear_n": P,  # Q = P = const по всей консоли
            "shear_signed": [
                # В заделке Q = +P (положительная по конвенции солвера),
                # на свободном конце такая же. Знак критичен для проверки
                # согласования Q = dM/dx.
                {"element_id": "e1", "where": "start", "value": P},
                {"element_id": "e1", "where": "end", "value": P},
            ],
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
                 "force": [0, -P, 0], "moment": [0, 0, 0]},
            ],
        },
    }


def build_simply_supported_center_load(L: float = 4.0, P: float = 20000.0) -> dict:
    """
    Тест 2: ШАРНИРНАЯ БАЛКА + СИЛА В СЕРЕДИНЕ.
    δ_center = P·L³/(48EI), M_max = P·L/4, R_A = R_B = P/2 (Тимошенко).
    """
    return {
        "name": "Шарнирная балка, сила по центру",
        "scheme": "Simply supported + central point load",
        "expected": {
            "max_displacement_m": P * L**3 / (48 * E * I),
            "max_moment_nm": P * L / 4,
            "reaction_fy_n": P / 2,
            "max_shear_n": P / 2,  # |Q| = P/2 на обоих полупролётах
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
    Тест 3: ШАРНИРНАЯ БАЛКА + РАВНОМЕРНАЯ q.
    δ_center = 5qL⁴/(384EI), M_max = qL²/8, R_A = R_B = qL/2.
    """
    return {
        "name": "Шарнирная балка, равномерная нагрузка",
        "scheme": "Simply supported + UDL",
        "expected": {
            "max_displacement_m": 5 * q * L**4 / (384 * E * I),
            "max_moment_nm": q * L**2 / 8,
            "reaction_fy_n": q * L / 2,
            "max_shear_n": q * L / 2,  # пиковая |Q| на концах = qL/2
            "shear_signed": [
                # Регрессия на баг знака Qya: должна быть линейная эпюра
                # +qL/2 → 0 → −qL/2, а не уезжать на постоянную составляющую.
                {"element_id": "e1", "where": "start", "value": q * L / 2},
                {"element_id": "e1", "where": "mid", "value": 0.0},
                {"element_id": "e1", "where": "end", "value": -q * L / 2},
            ],
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
    Тест 4: КОНСОЛЬНАЯ БАЛКА + РАВНОМЕРНАЯ q.
    δ_tip = qL⁴/(8EI), M_max = qL²/2 (в заделке), R_y = qL, R_M = qL²/2.
    """
    return {
        "name": "Консольная балка, равномерная нагрузка",
        "scheme": "Cantilever + UDL",
        "expected": {
            "max_displacement_m": q * L**4 / (8 * E * I),
            "max_moment_nm": q * L**2 / 2,
            "reaction_fy_n": q * L,
            "reaction_mz_nm": q * L**2 / 2,
            "max_shear_n": q * L,  # пиковая |Q| в заделке
            "shear_signed": [
                # В заделке Q = +qL, на свободном конце Q = 0.
                {"element_id": "e1", "where": "start", "value": q * L},
                {"element_id": "e1", "where": "end", "value": 0.0},
            ],
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
    Тест 5: ШАРНИРНО ОПЁРТАЯ П-РАМА + ГОРИЗОНТАЛЬНАЯ СИЛА.

    Реакции — чистая статика (не зависят от EI):
      ΣM_A: P·H − R_By·L = 0   →   R_By = +P·H/L (вниз в B)
      ⇒ R_Ay = -P·H/L           (вверх в A)
      ΣFx: R_Ax + R_Bx + P = 0
    """
    return {
        "name": "Портальная рама, горизонтальная сила",
        "scheme": "Pinned portal frame + lateral force",
        "expected": {
            "reaction_n1_fy_n": -P * H / L,
            "reaction_n4_fy_n":  P * H / L,
            "reaction_sum_fx_n": -P,
        },
        "model": {
            "meta": {"dim": "2d"},
            "materials": [STEEL],
            "sections": [I20],
            "nodes": [
                {"id": "n1", "coords": [0, 0, 0]},      # опора A
                {"id": "n2", "coords": [0, H, 0]},      # угол слева
                {"id": "n3", "coords": [L, H, 0]},      # угол справа
                {"id": "n4", "coords": [L, 0, 0]},      # опора B
            ],
            "elements": [
                {"id": "col_left", "node_start": "n1", "node_end": "n2",
                 "material_id": "steel", "section_id": "i20"},
                {"id": "beam", "node_start": "n2", "node_end": "n3",
                 "material_id": "steel", "section_id": "i20"},
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
                {"id": "ld1", "type": "nodal_force", "node_id": "n2",
                 "force": [P, 0, 0], "moment": [0, 0, 0]},
            ],
        },
    }


def build_cantilever_tip_moment(L: float = 2.0, M0: float = 15000.0) -> dict:
    """
    Тест 6: КОНСОЛЬ + СОСРЕДОТОЧЕННЫЙ МОМЕНТ НА КОНЦЕ.
    M(x) = M₀ = const, Q(x) = 0, δ_tip = M₀L²/(2EI), R_M = -M₀.
    Цель — поймать ошибки обработки внешнего момента mz.
    """
    return {
        "name": "Консоль + сосредоточенный момент на конце",
        "scheme": "Cantilever + tip moment",
        "expected": {
            "max_displacement_m": M0 * L**2 / (2 * E * I),
            "max_moment_nm": M0,
            "reaction_fy_n": 0.0,
            "reaction_mz_nm": -M0,
            "max_shear_n": 0.0,  # чистый изгиб моментом: Q ≡ 0
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
    Тест 7: ШАРНИРНАЯ БАЛКА + МОМЕНТ В ЦЕНТРЕ.

    В узле приложения M₀ — скачок эпюры на M₀. По обе стороны |M|=M₀/2.
      R_A = +M₀/L,  R_B = -M₀/L (статика).
      max|M| = M₀/2.
    Цель — узловой момент И узловые реакции одновременно.
    """
    return {
        "name": "Шарнирная балка + момент в центре",
        "scheme": "Simply supported + central moment",
        "expected": {
            "max_moment_nm": M0 / 2,
            "reaction_fy_n": M0 / L,
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
    Тест 8: ЧЕТЫРЁХТОЧЕЧНЫЙ ИЗГИБ (стандарт ASTM).
    Две симметричные силы P на расстоянии `a` от опор.
      R_A = R_B = P, M_max = P·a (постоянный на среднем участке),
      δ_center = P·a·(3L²−4a²)/(24EI).
    Между точками приложения сил Q=0 — чистый изгиб.
    """
    L_mid = L - 2 * a
    return {
        "name": "Балка с двумя силами (4-точечный изгиб)",
        "scheme": "Simply supported + two symmetric point loads",
        "expected": {
            "max_displacement_m": P * a * (3 * L**2 - 4 * a**2) / (24 * E * I),
            "max_moment_nm": P * a,
            "reaction_fy_n": P,
            "max_shear_n": P,  # |Q| = P на крайних участках, 0 на среднем
            "shear_signed": [
                # Чистый изгиб посередине: Q = 0 на всём элементе e2.
                {"element_id": "e2", "where": "start", "value": 0.0},
                {"element_id": "e2", "where": "mid", "value": 0.0},
                {"element_id": "e2", "where": "end", "value": 0.0},
            ],
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
    Тест 9: ДВУХПРОЛЁТНАЯ НЕРАЗРЕЗНАЯ БАЛКА + UDL.
    Сверхстатическая, 1 раз неопределимая. Уравнение трёх моментов:
      M_B = -qL²/8 (на средней опоре), R_A = 3qL/8, R_B = 5qL/4.
    Цель — кинематическая связь через общий узел в неразрезной балке.
    """
    return {
        "name": "Двухпролётная неразрезная балка",
        "scheme": "Two-span continuous beam + UDL",
        "expected": {
            "max_moment_nm": q * L**2 / 8,   # |M| на средней опоре
            "reaction_fy_n": 3 * q * L / 8,  # R_A на крайней опоре
            "max_shear_n": 5 * q * L / 8,    # пиковая |Q| у средней опоры
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
    Тест 10: РАВНОБЕДРЕННАЯ ТРЕУГОЛЬНАЯ ФЕРМА + ВЕРТИКАЛЬНАЯ СИЛА В ВЕРШИНЕ.

    Все стержни — шарнирные (hinge_start=true, hinge_end=true).
    Метод вырезания узлов:
      N₂ = N₃ = P/√3 ≈ 5774 Н (сжатие в наклонных)
      N₁ = P/(2√3) ≈ 2887 Н (растяжение в нижнем поясе)
      R_A = R_B = P/2

    Цель — осевые усилия N (в балочных тестах ≈ 0) и поведение шарниров.
    """
    H = L * math.sqrt(3) / 2  # высота равностороннего треугольника
    N_diagonal = P / math.sqrt(3)
    # N_bottom = P / (2 * math.sqrt(3))   # справочно; не проверяется
    return {
        "name": "Треугольная ферма + вертикальная сила в вершине",
        "scheme": "Equilateral triangular truss + tip vertical load",
        "expected": {
            "max_axial_n": N_diagonal,  # пиковая |N| в диагоналях
            "reaction_fy_n": P / 2,
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
# 3D-ЭТАЛОНЫ (пространственный расчёт: кручение, изгиб в xz, косой изгиб)
# ============================================================

def build_cantilever_torsion(L: float = 2.0, T: float = 1000.0) -> dict:
    """
    Тест 10 (3D): КОНСОЛЬ + КРУТЯЩИЙ МОМЕНТ НА КОНЦЕ.
    Свободное кручение стержня (Сен-Венан): φ = T·L/(G·I_t).
    Эпюра T постоянна и равна T; реактивный момент в заделке |mx| = T.
    Проверяет работу жёсткости на кручение GJ/L.
    """
    phi = T * L / (G * I_T)
    return {
        "name": "3D консоль, кручение на конце",
        "scheme": "3D Cantilever + tip torque (Mx)",
        "expected": {
            "rotation_x_rad": phi,                 # угол закручивания свободного конца
            "max_torque_nm": T,                    # |T| = const = T
            "reaction_mx_abs_nm": T,               # момент в заделке по модулю
        },
        "model": {
            "meta": {"dim": "3d"},
            "materials": [STEEL],
            "sections": [I20],
            "nodes": [
                {"id": "n1", "coords": [0, 0, 0]},
                {"id": "n2", "coords": [L, 0, 0]},
            ],
            "elements": [
                # ref_vector=[0,1,0] фиксирует локальные оси сечения по глобальным
                # Y/Z (предсказуемая ориентация для горизонтального стержня).
                {"id": "e1", "node_start": "n1", "node_end": "n2",
                 "material_id": "steel", "section_id": "i20",
                 "ref_vector": [0, 1, 0]},
            ],
            "boundary_conditions": [
                {"id": "bc1", "node_id": "n1", "type": "fixed",
                 "constrained_dofs": ["ux", "uy", "uz", "rx", "ry", "rz"]},
            ],
            "loads": [
                # Крутящий момент вокруг продольной оси стержня X.
                {"id": "ld1", "type": "nodal_force", "node_id": "n2",
                 "force": [0, 0, 0], "moment": [T, 0, 0]},
            ],
        },
        "node_probe": "n2",
    }


def build_cantilever_bending_xz(L: float = 2.0, P: float = 10000.0) -> dict:
    """
    Тест 11 (3D): КОНСОЛЬ + СИЛА ПО ОСИ Z (изгиб в плоскости xz).
    Полный аналог 2D-консоли, но в другой плоскости: управляется I_y.
    δ_z = P·L³/(3·E·I_y), |My|_max = P·L, реакции |fz| = P, |my| = P·L.
    Изгиб в xz даёт усилия My и Qz — проверяем «вторую плоскость».
    """
    delta_z = P * L**3 / (3 * E * I_Y)
    return {
        "name": "3D консоль, сила по Z (изгиб в xz)",
        "scheme": "3D Cantilever + tip Pz (bending in xz)",
        "expected": {
            "displacement_uz_abs_m": delta_z,      # прогиб конца по Z
            "max_my_nm": P * L,                    # макс. изгибающий момент My
            "max_qz_n": P,                         # поперечная сила Qz = P
            "reaction_fz_abs_n": P,                # реакция по Z в заделке
            "reaction_my_abs_nm": P * L,           # реактивный момент My в заделке
        },
        "model": {
            "meta": {"dim": "3d"},
            "materials": [STEEL],
            "sections": [I20],
            "nodes": [
                {"id": "n1", "coords": [0, 0, 0]},
                {"id": "n2", "coords": [L, 0, 0]},
            ],
            "elements": [
                {"id": "e1", "node_start": "n1", "node_end": "n2",
                 "material_id": "steel", "section_id": "i20",
                 "ref_vector": [0, 1, 0]},
            ],
            "boundary_conditions": [
                {"id": "bc1", "node_id": "n1", "type": "fixed",
                 "constrained_dofs": ["ux", "uy", "uz", "rx", "ry", "rz"]},
            ],
            "loads": [
                {"id": "ld1", "type": "nodal_force", "node_id": "n2",
                 "force": [0, 0, -P], "moment": [0, 0, 0]},
            ],
        },
        "node_probe": "n2",
    }


def build_cantilever_skew_bending(L: float = 2.0, Py: float = 8000.0, Pz: float = 6000.0) -> dict:
    """
    Тест 12 (3D): КОСОЙ (ДВУХОСНЫЙ) ИЗГИБ КОНСОЛИ.
    Сила одновременно по Y и Z — изгиб в обеих плоскостях независимо.
    По принципу суперпозиции:
      δ_y = Py·L³/(3·E·I_z),  δ_z = Pz·L³/(3·E·I_y),
      |Mz|_max = Py·L,        |My|_max = Pz·L.
    Главная цель — убедиться, что плоскости НЕ «протекают» друг в друга
    (ошибка связности матрицы жёсткости дала бы расхождение).
    """
    delta_y = Py * L**3 / (3 * E * I_Z)
    delta_z = Pz * L**3 / (3 * E * I_Y)
    return {
        "name": "3D консоль, косой изгиб (Py+Pz)",
        "scheme": "3D Cantilever + biaxial bending",
        "expected": {
            "displacement_uy_abs_m": delta_y,
            "displacement_uz_abs_m": delta_z,
            "max_mz_nm": Py * L,
            "max_my_nm": Pz * L,
        },
        "model": {
            "meta": {"dim": "3d"},
            "materials": [STEEL],
            "sections": [I20],
            "nodes": [
                {"id": "n1", "coords": [0, 0, 0]},
                {"id": "n2", "coords": [L, 0, 0]},
            ],
            "elements": [
                {"id": "e1", "node_start": "n1", "node_end": "n2",
                 "material_id": "steel", "section_id": "i20",
                 "ref_vector": [0, 1, 0]},
            ],
            "boundary_conditions": [
                {"id": "bc1", "node_id": "n1", "type": "fixed",
                 "constrained_dofs": ["ux", "uy", "uz", "rx", "ry", "rz"]},
            ],
            "loads": [
                {"id": "ld1", "type": "nodal_force", "node_id": "n2",
                 "force": [0, -Py, -Pz], "moment": [0, 0, 0]},
            ],
        },
        "node_probe": "n2",
    }


def all_tests() -> list[dict]:
    """Полный набор верификационных тестов в порядке возрастания сложности."""
    return [
        build_cantilever_point_load(),           # 0
        build_simply_supported_center_load(),    # 1
        build_simply_supported_udl(),            # 2
        build_cantilever_udl(),                  # 3
        build_portal_frame(),                    # 4
        build_cantilever_tip_moment(),           # 5
        build_simply_supported_center_moment(),  # 6
        build_two_point_loads(),                 # 7
        build_two_span_continuous(),             # 8
        build_truss_triangle(),                  # 9
        # — 3D-эталоны —
        build_cantilever_torsion(),              # 10
        build_cantilever_bending_xz(),           # 11
        build_cantilever_skew_bending(),         # 12
    ]