"""
Dataclass-структуры и DOF-константы для FEM-решателя балочных рам.

Степени свободы (DOF):
  2D-рама (frame_2d): 3 DOF на узел — [ux, uy, rz]
  3D-рама (frame_3d): 6 DOF на узел — [ux, uy, uz, rx, ry, rz]

SolveResult — итоговая структура расчёта, отдаётся в solve(payload).
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Material:
    """Линейно-упругий изотропный материал. E, G — Па; rho — кг/м³."""
    id: str
    E: float
    G: float
    nu: float = 0.3
    rho: float = 7850
    sigma_yield: float = 245e6
    sigma_ultimate: float = 380e6
    name: str = ''


@dataclass
class Section:
    """
    Геометрические характеристики сечения. A — м², I_y/I_z — м⁴,
    shear_area_y/z — эффективные площади сдвига для модели Тимошенко
    (None → классическая Эйлер-Бернулли без сдвига).
    """
    id: str
    A: float
    I_y: float = 0.0
    I_z: float = 0.0
    I_t: float = 0.0
    W_y: float = 0.0
    W_z: float = 0.0
    shear_area_y: float | None = None
    shear_area_z: float | None = None
    h: float = 0.0
    name: str = ''
    type: str = ''
    geometry: dict | None = None


@dataclass
class Node:
    """Узел сетки. coords = (x, y, z); для 2D — z=0."""
    id: str
    coords: tuple[float, float, float]


@dataclass
class Element:
    """
    Балочный элемент между двумя узлами.
    ref_vector — внешний вектор для определения локальной плоскости xy в 3D.
    releases_a/b — освобождения момента на концах (шарниры) для ферм, тяг,
    балок Гербера; {'rz': True} означает шарнир по моменту Mz.
    """
    id: str
    node_a: str
    node_b: str
    material_id: str
    section_id: str
    ref_vector: tuple[float, float, float] = (0.0, 0.0, 1.0)
    releases_a: dict = field(default_factory=dict)
    releases_b: dict = field(default_factory=dict)


@dataclass
class BoundaryCondition:
    """
    Граничные условия в узле.
    constrained — множество имён закреплённых DOF: ux, uy, uz, rx, ry, rz.
    prescribed — заданные значения (для смещения опор).
    """
    node_id: str
    constrained: set[str] = field(default_factory=set)
    prescribed: dict = field(default_factory=dict)


@dataclass
class Load:
    """
    Внешняя нагрузка:
      - nodal_force            — сила/момент на узле в глобальных осях
      - in_span_point          — точечная сила/момент в локальных осях
                                 элемента в точке position_ratio∈[0,1]
      - distributed_uniform    — равномерная нагрузка по локальной оси
      - distributed_trapezoidal — трапециевидная: load_start … load_end
    """
    kind: str
    node_id: str | None = None
    element_id: str | None = None
    force: tuple[float, float, float] = (0.0, 0.0, 0.0)
    moment: tuple[float, float, float] = (0.0, 0.0, 0.0)
    position_ratio: float = 0.5
    load_start: tuple[float, float, float] = (0.0, 0.0, 0.0)
    load_end: tuple[float, float, float] = (0.0, 0.0, 0.0)


@dataclass
class SolveResult:
    """Итоговая структура расчёта."""
    summary: dict
    nodal_displacements: list
    reactions: list
    element_results: list
    warnings: list


# === DOF конфигурация ===

DOF_NAMES_3D = ['ux', 'uy', 'uz', 'rx', 'ry', 'rz']
DOF_NAMES_2D = ['ux', 'uy', 'rz']

DOF_INDEX_3D = {n: i for i, n in enumerate(DOF_NAMES_3D)}
DOF_INDEX_2D = {n: i for i, n in enumerate(DOF_NAMES_2D)}
