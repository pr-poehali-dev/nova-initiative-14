"""
Конечно-элементный решатель балочных рам (2D и 3D).
Линейная статика. Использует балочные элементы с учётом сдвиговых деформаций
(параметр Φ = 12·E·I / (G·A_s·L²)), что даёт обобщение классической Euler-Bernoulli
балки. При Φ → 0 решение сходится к Bernoulli, при ненулевом сдвиге — учитывает
дополнительные перемещения от поперечной силы (метод Тимошенко).

Степени свободы (DOF):
    2D-рама (frame_2d): 3 DOF на узел — [u_x, u_y, θ_z]
    3D-рама (frame_3d): 6 DOF на узел — [u_x, u_y, u_z, θ_x, θ_y, θ_z]

Локальная система координат элемента:
    Ось x — вдоль оси элемента (от узла A к узлу B)
    Оси y, z — главные оси сечения (для 3D — задаются ref_vector)

Используется scipy.sparse для разреженной K, scipy.sparse.linalg.spsolve для решения.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

import numpy as np
from scipy.sparse import lil_matrix, csr_matrix
from scipy.sparse.linalg import spsolve


# ============ Структуры данных ============

@dataclass
class Material:
    id: str
    E: float           # модуль упругости, Па
    G: float           # модуль сдвига, Па
    nu: float = 0.3    # коэффициент Пуассона
    rho: float = 7850  # плотность, кг/м³
    sigma_yield: float = 245e6  # предел текучести, Па
    sigma_ultimate: float = 380e6  # предел прочности, Па
    name: str = ''     # человекочитаемое имя (для фронта)


@dataclass
class Section:
    id: str
    A: float           # площадь, м²
    I_y: float = 0.0   # момент инерции вокруг y, м⁴
    I_z: float = 0.0   # момент инерции вокруг z, м⁴
    I_t: float = 0.0   # момент инерции при кручении (Saint-Venant), м⁴
    W_y: float = 0.0   # момент сопротивления, м³
    W_z: float = 0.0   # момент сопротивления, м³
    shear_area_y: float | None = None  # эффективная площадь сдвига по y, м²
    shear_area_z: float | None = None  # эффективная площадь сдвига по z, м²
    h: float = 0.0     # высота сечения, м (для расчёта напряжений)
    name: str = ''     # человекочитаемое имя (для фронта)
    type: str = ''     # тип сечения (для UI: i_beam, channel, custom...)
    geometry: dict | None = None  # геометрические размеры (для UI)


@dataclass
class Node:
    id: str
    coords: tuple[float, float, float]  # (x, y, z) — для 2D z=0


@dataclass
class Element:
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
    """Тип КГУ: fixed, pinned, roller, sliding, custom.
    constrained_dofs — список DOF по именам: ux, uy, uz, rx, ry, rz."""
    node_id: str
    constrained: set[str] = field(default_factory=set)
    prescribed: dict = field(default_factory=dict)  # {dof_name: value}


@dataclass
class Load:
    """Нагрузки:
    - nodal_force: сила на узле в глобальных осях
    - in_span_point: точечная сила/момент в локальных осях элемента в точке position_ratio
    - distributed_uniform: равномерная нагрузка по локальной оси
    - distributed_trapezoidal: трапециевидная (start, end интенсивности)
    """
    kind: str
    node_id: str | None = None
    element_id: str | None = None
    force: tuple[float, float, float] = (0.0, 0.0, 0.0)
    moment: tuple[float, float, float] = (0.0, 0.0, 0.0)
    position_ratio: float = 0.5
    load_start: tuple[float, float, float] = (0.0, 0.0, 0.0)
    load_end: tuple[float, float, float] = (0.0, 0.0, 0.0)


# ============ Конфигурация DOF ============

DOF_NAMES_3D = ['ux', 'uy', 'uz', 'rx', 'ry', 'rz']
DOF_NAMES_2D = ['ux', 'uy', 'rz']

DOF_INDEX_3D = {n: i for i, n in enumerate(DOF_NAMES_3D)}
DOF_INDEX_2D = {n: i for i, n in enumerate(DOF_NAMES_2D)}


# ============ Геометрия и трансформация ============

def element_length_and_direction(node_a: Node, node_b: Node) -> tuple[float, np.ndarray]:
    a = np.array(node_a.coords, dtype=float)
    b = np.array(node_b.coords, dtype=float)
    vec = b - a
    L = float(np.linalg.norm(vec))
    if L < 1e-12:
        raise ValueError(f'Элемент имеет нулевую длину: узлы {node_a.id}—{node_b.id}')
    return L, vec / L


def build_transformation_3d(direction: np.ndarray, ref_vector: tuple) -> np.ndarray:
    """Матрица направляющих косинусов 3×3 для 3D-элемента.
    direction — единичный вектор оси x локальной СК элемента.
    ref_vector — внешний вектор для определения плоскости xy локальной СК
    (главная ось y будет в плоскости (x_local, ref)).
    Возвращает 3×3 матрицу (строки — локальные оси x, y, z в глобальных компонентах).
    """
    x_local = direction / np.linalg.norm(direction)
    ref = np.array(ref_vector, dtype=float)
    # если ref параллелен оси элемента — выбираем альтернативный
    if abs(np.dot(x_local, ref / (np.linalg.norm(ref) + 1e-30))) > 0.999:
        ref = np.array([1.0, 0.0, 0.0]) if abs(x_local[0]) < 0.9 else np.array([0.0, 1.0, 0.0])
    z_local = np.cross(x_local, ref)
    z_local = z_local / np.linalg.norm(z_local)
    y_local = np.cross(z_local, x_local)
    y_local = y_local / np.linalg.norm(y_local)
    return np.vstack([x_local, y_local, z_local])


def build_full_transformation(R3: np.ndarray, dim: str) -> np.ndarray:
    """Полная матрица трансформации T: u_local = T · u_global.
    Для 3D (12 DOF) — блочно-диагональная 12×12 из четырёх R3.
    Для 2D (6 DOF) — 6×6 из двух 3×3 блоков (косинус-синус для перемещений,
    1.0 для поворота z).
    """
    if dim == '3d':
        T = np.zeros((12, 12))
        for i in range(4):
            T[3*i:3*i+3, 3*i:3*i+3] = R3
        return T
    # 2D: задача в плоскости XY. x_local = (c, s, 0), y_local = (-s, c, 0)
    # (поворот x_local на +90° против часовой по правилу правой руки для θ_z).
    # direction берём из R3[0] (первая строка — это x_local в глобальных координатах).
    c, s = float(R3[0, 0]), float(R3[0, 1])
    R2 = np.array([
        [c,  s, 0],
        [-s, c, 0],
        [0,  0, 1],
    ])
    T = np.zeros((6, 6))
    T[0:3, 0:3] = R2
    T[3:6, 3:6] = R2
    return T


# ============ Элементные матрицы ============

def beam_local_k_3d(E: float, G: float, A: float, L: float,
                    I_y: float, I_z: float, I_t: float,
                    A_sy: float | None, A_sz: float | None) -> np.ndarray:
    """Элементная матрица жёсткости 12×12 для 3D балки с учётом сдвига.
    DOF порядок на узле: ux, uy, uz, rx, ry, rz.
    Узлы a и b: [a0..a5, b0..b5] — итого 12.
    Параметр сдвига:
        Φ_y = 12·E·I_z / (G·A_sy·L²)  — для изгиба в плоскости xy (вокруг z)
        Φ_z = 12·E·I_y / (G·A_sz·L²)  — для изгиба в плоскости xz (вокруг y)
    При A_sy = None или ∞ — Φ_y = 0 (классическая Euler-Bernoulli).
    """
    k = np.zeros((12, 12))

    # Осевая жёсткость (ux)
    EA_L = E * A / L
    k[0, 0] += EA_L
    k[6, 6] += EA_L
    k[0, 6] -= EA_L
    k[6, 0] -= EA_L

    # Кручение (rx)
    GJ_L = G * I_t / L if I_t > 0 else 0.0
    k[3, 3] += GJ_L
    k[9, 9] += GJ_L
    k[3, 9] -= GJ_L
    k[9, 3] -= GJ_L

    # Изгиб в плоскости xy (uy и rz) — момент вокруг z
    phi_y = 12.0 * E * I_z / (G * A_sy * L**2) if (A_sy and A_sy > 0) else 0.0
    EIz = E * I_z
    L2, L3 = L * L, L * L * L
    denom_y = 1.0 + phi_y
    # стандартная Timoshenko-матрица для плоского изгиба:
    a = 12 * EIz / (L3 * denom_y)
    b = 6 * EIz / (L2 * denom_y)
    c = (4 + phi_y) * EIz / (L * denom_y)
    d = (2 - phi_y) * EIz / (L * denom_y)
    # uy_a=1, rz_a=2, uy_b=7, rz_b=8 (индексы в 12-DOF векторе)
    idx_y = [1, 5, 7, 11]
    Kb_y = np.array([
        [ a,  b, -a,  b],
        [ b,  c, -b,  d],
        [-a, -b,  a, -b],
        [ b,  d, -b,  c],
    ])
    for i in range(4):
        for j in range(4):
            k[idx_y[i], idx_y[j]] += Kb_y[i, j]

    # Изгиб в плоскости xz (uz и ry) — момент вокруг y, знаки немного отличаются
    phi_z = 12.0 * E * I_y / (G * A_sz * L**2) if (A_sz and A_sz > 0) else 0.0
    EIy = E * I_y
    denom_z = 1.0 + phi_z
    a2 = 12 * EIy / (L3 * denom_z)
    b2 = 6 * EIy / (L2 * denom_z)
    c2 = (4 + phi_z) * EIy / (L * denom_z)
    d2 = (2 - phi_z) * EIy / (L * denom_z)
    # uz_a=2, ry_a=4, uz_b=8, ry_b=10
    idx_z = [2, 4, 8, 10]
    # Знаки: для плоскости xz при положительном uz_a момент ry будет противоположного знака
    # по сравнению с плоскостью xy. Используем стандартную форму с учётом правила правой руки.
    Kb_z = np.array([
        [ a2, -b2, -a2, -b2],
        [-b2,  c2,  b2,  d2],
        [-a2,  b2,  a2,  b2],
        [-b2,  d2,  b2,  c2],
    ])
    for i in range(4):
        for j in range(4):
            k[idx_z[i], idx_z[j]] += Kb_z[i, j]

    return k


def beam_local_k_2d(E: float, A: float, G: float, L: float,
                    I_z: float, A_sy: float | None) -> np.ndarray:
    """Элементная матрица 6×6 для 2D-рамы (в плоскости XY).
    DOF на узле: ux, uy, rz. Узлы a и b: [ux_a, uy_a, rz_a, ux_b, uy_b, rz_b].
    """
    k = np.zeros((6, 6))
    EA_L = E * A / L
    k[0, 0] += EA_L
    k[3, 3] += EA_L
    k[0, 3] -= EA_L
    k[3, 0] -= EA_L

    phi = 12.0 * E * I_z / (G * A_sy * L**2) if (A_sy and A_sy > 0) else 0.0
    EI = E * I_z
    L2, L3 = L * L, L * L * L
    denom = 1.0 + phi
    a = 12 * EI / (L3 * denom)
    b = 6 * EI / (L2 * denom)
    c = (4 + phi) * EI / (L * denom)
    d = (2 - phi) * EI / (L * denom)
    # uy_a=1, rz_a=2, uy_b=4, rz_b=5
    Kb = np.array([
        [ a,  b, -a,  b],
        [ b,  c, -b,  d],
        [-a, -b,  a, -b],
        [ b,  d, -b,  c],
    ])
    idx = [1, 2, 4, 5]
    for i in range(4):
        for j in range(4):
            k[idx[i], idx[j]] += Kb[i, j]
    return k


# ============ Эквивалентные узловые нагрузки от внутрипролётных ============

def fixed_end_forces_3d_uniform(qy: float, qz: float, L: float) -> np.ndarray:
    """Реакции защемлённой балки от равномерной нагрузки qy/qz по локальным y/z.
    Возвращает 12-вектор узловых нагрузок (со знаком как f_eq, переносится в правую часть со знаком +).
    """
    f = np.zeros(12)
    # qy: по локальной y → силы по y и моменты вокруг z
    Vy = qy * L / 2.0
    Mz = qy * L * L / 12.0
    f[1] += Vy
    f[5] += Mz
    f[7] += Vy
    f[11] += -Mz
    # qz: по локальной z → силы по z и моменты вокруг y (с обратным знаком как в Kb_z)
    Vz = qz * L / 2.0
    My = qz * L * L / 12.0
    f[2] += Vz
    f[4] += -My
    f[8] += Vz
    f[10] += My
    return f


def fixed_end_forces_2d_uniform(qy: float, L: float) -> np.ndarray:
    """Реакции защемлённой 2D-балки от равномерной qy (локальная y)."""
    f = np.zeros(6)
    Vy = qy * L / 2.0
    Mz = qy * L * L / 12.0
    f[1] += Vy
    f[2] += Mz
    f[4] += Vy
    f[5] += -Mz
    return f


def fixed_end_forces_3d_point(Py: float, Pz: float, Px: float, a: float, L: float) -> np.ndarray:
    """Реакции защемлённой 3D балки от точечной силы в локальных осях
    в точке на расстоянии a от узла A (0 ≤ a ≤ L)."""
    f = np.zeros(12)
    b = L - a
    # Px — осевая: разносится по правилу рычага
    f[0] += Px * b / L
    f[6] += Px * a / L
    # Py — изгиб в xy (момент вокруг z)
    if L > 0:
        f[1] += Py * b**2 * (L + 2*a) / L**3
        f[5] += Py * a * b**2 / L**2
        f[7] += Py * a**2 * (L + 2*b) / L**3
        f[11] += -Py * a**2 * b / L**2
    # Pz — изгиб в xz (момент вокруг y, обратный знак)
    if L > 0:
        f[2] += Pz * b**2 * (L + 2*a) / L**3
        f[4] += -Pz * a * b**2 / L**2
        f[8] += Pz * a**2 * (L + 2*b) / L**3
        f[10] += Pz * a**2 * b / L**2
    return f


def fixed_end_forces_2d_point(Py: float, Px: float, a: float, L: float) -> np.ndarray:
    f = np.zeros(6)
    b = L - a
    f[0] += Px * b / L
    f[3] += Px * a / L
    if L > 0:
        f[1] += Py * b**2 * (L + 2*a) / L**3
        f[2] += Py * a * b**2 / L**2
        f[4] += Py * a**2 * (L + 2*b) / L**3
        f[5] += -Py * a**2 * b / L**2
    return f


# ============ Основной решатель ============

@dataclass
class SolveResult:
    summary: dict
    nodal_displacements: list
    reactions: list
    element_results: list
    warnings: list


class FrameSolver:
    """Решатель балочных рам (2D / 3D). Линейная статика."""

    def __init__(self, payload: dict):
        self.payload = payload
        self.dim = payload.get('meta', {}).get('dim', '3d')  # '2d' | '3d'
        if self.dim not in ('2d', '3d'):
            raise ValueError(f'Неизвестная размерность: {self.dim}')
        self.dof_per_node = 6 if self.dim == '3d' else 3
        self._parse()

    def _parse(self):
        # фильтруем неизвестные поля, чтобы фронт мог передавать доп. метаданные
        mat_fields = {'id', 'E', 'G', 'nu', 'rho', 'sigma_yield', 'sigma_ultimate', 'name'}
        self.materials = {
            m['id']: Material(**{k: v for k, v in m.items() if k in mat_fields})
            for m in self.payload.get('materials', [])
        }
        self.sections = {}
        for s in self.payload.get('sections', []):
            self.sections[s['id']] = Section(
                id=s['id'],
                A=float(s['A']),
                I_y=float(s.get('I_y', 0.0)),
                I_z=float(s.get('I_z', 0.0)),
                I_t=float(s.get('I_t', 0.0)),
                W_y=float(s.get('W_y', 0.0)),
                W_z=float(s.get('W_z', 0.0)),
                shear_area_y=float(s['shear_area_y']) if s.get('shear_area_y') else None,
                shear_area_z=float(s['shear_area_z']) if s.get('shear_area_z') else None,
                h=float(s.get('h', 0.0)),
            )

        self.nodes = {}
        for n in self.payload.get('nodes', []):
            c = n['coords']
            if len(c) == 2:
                c = [c[0], c[1], 0.0]
            self.nodes[n['id']] = Node(id=n['id'], coords=tuple(c))

        self.elements = []
        for e in self.payload.get('elements', []):
            self.elements.append(Element(
                id=e['id'],
                node_a=e['node_start'],
                node_b=e['node_end'],
                material_id=e['material_id'],
                section_id=e['section_id'],
                ref_vector=tuple(e.get('ref_vector', (0, 0, 1))),
            ))

        self.bcs = []
        for bc in self.payload.get('boundary_conditions', []):
            self.bcs.append(BoundaryCondition(
                node_id=bc['node_id'],
                constrained=set(bc.get('constrained_dofs', [])),
            ))

        self.loads = []
        for L in self.payload.get('loads', []):
            self.loads.append(Load(
                kind=L['type'],
                node_id=L.get('node_id'),
                element_id=L.get('element_id'),
                force=tuple(L.get('force', (0, 0, 0))),
                moment=tuple(L.get('moment', (0, 0, 0))),
                position_ratio=float(L.get('position_ratio', 0.5)),
                load_start=tuple(L.get('load_start_local', L.get('load_local_per_length', (0, 0, 0)))),
                load_end=tuple(L.get('load_end_local', L.get('load_local_per_length', (0, 0, 0)))),
            ))

        # индексация DOF
        self.node_ids = list(self.nodes.keys())
        self.node_dof_offset = {nid: i * self.dof_per_node for i, nid in enumerate(self.node_ids)}
        self.n_dofs = len(self.node_ids) * self.dof_per_node

    def _dof_global_index(self, node_id: str, dof_name: str) -> int:
        if self.dim == '3d':
            local = DOF_INDEX_3D[dof_name]
        else:
            local = DOF_INDEX_2D[dof_name]
        return self.node_dof_offset[node_id] + local

    def _element_dof_indices(self, el: Element) -> list[int]:
        """Глобальные индексы DOF для элемента: сначала все DOF узла A, потом узла B."""
        off_a = self.node_dof_offset[el.node_a]
        off_b = self.node_dof_offset[el.node_b]
        n = self.dof_per_node
        return list(range(off_a, off_a + n)) + list(range(off_b, off_b + n))

    def _build_element_stiffness(self, el: Element):
        mat = self.materials[el.material_id]
        sec = self.sections[el.section_id]
        node_a, node_b = self.nodes[el.node_a], self.nodes[el.node_b]
        L, direction = element_length_and_direction(node_a, node_b)
        R3 = build_transformation_3d(direction, el.ref_vector)
        T = build_full_transformation(R3, self.dim)

        if self.dim == '3d':
            k_local = beam_local_k_3d(
                mat.E, mat.G, sec.A, L,
                sec.I_y, sec.I_z, sec.I_t,
                sec.shear_area_y, sec.shear_area_z,
            )
        else:
            k_local = beam_local_k_2d(
                mat.E, sec.A, mat.G, L, sec.I_z, sec.shear_area_y,
            )

        # Глобальная матрица: K_g = T^T · k_local · T
        k_global = T.T @ k_local @ T
        return k_local, k_global, T, L

    def solve(self) -> SolveResult:
        n = self.n_dofs
        K = lil_matrix((n, n))
        F = np.zeros(n)

        # Кэш для постпроцессинга
        el_cache = {}

        # ===== Сборка K и f_eq от внутрипролётных нагрузок =====
        for el in self.elements:
            k_local, k_global, T, L = self._build_element_stiffness(el)
            el_cache[el.id] = {'k_local': k_local, 'T': T, 'L': L}

            dofs = self._element_dof_indices(el)
            for i in range(len(dofs)):
                for j in range(len(dofs)):
                    K[dofs[i], dofs[j]] += k_global[i, j]

            # Эквивалентные узловые силы от внутрипролётных нагрузок
            f_eq_local = np.zeros(self.dof_per_node * 2)
            for ld in self.loads:
                if ld.element_id != el.id:
                    continue
                if ld.kind == 'distributed_uniform':
                    if self.dim == '3d':
                        f_eq_local += fixed_end_forces_3d_uniform(ld.load_start[1], ld.load_start[2], L)
                    else:
                        f_eq_local += fixed_end_forces_2d_uniform(ld.load_start[1], L)
                elif ld.kind == 'distributed_trapezoidal':
                    # упрощённо: усредняем как равномерную (точная формула — в M5 при необходимости)
                    qy_avg = (ld.load_start[1] + ld.load_end[1]) / 2
                    qz_avg = (ld.load_start[2] + ld.load_end[2]) / 2
                    if self.dim == '3d':
                        f_eq_local += fixed_end_forces_3d_uniform(qy_avg, qz_avg, L)
                    else:
                        f_eq_local += fixed_end_forces_2d_uniform(qy_avg, L)
                elif ld.kind == 'in_span_point':
                    a = ld.position_ratio * L
                    if self.dim == '3d':
                        f_eq_local += fixed_end_forces_3d_point(
                            ld.force[1], ld.force[2], ld.force[0], a, L,
                        )
                    else:
                        f_eq_local += fixed_end_forces_2d_point(ld.force[1], ld.force[0], a, L)
            if np.any(f_eq_local):
                f_eq_global = T.T @ f_eq_local
                for i, gi in enumerate(dofs):
                    F[gi] += f_eq_global[i]
                el_cache[el.id]['f_eq_local'] = f_eq_local
            else:
                el_cache[el.id]['f_eq_local'] = np.zeros(self.dof_per_node * 2)

        # ===== Узловые нагрузки =====
        for ld in self.loads:
            if ld.kind != 'nodal_force' or not ld.node_id:
                continue
            if self.dim == '3d':
                for axis, val in zip(['ux', 'uy', 'uz'], ld.force):
                    F[self._dof_global_index(ld.node_id, axis)] += val
                for axis, val in zip(['rx', 'ry', 'rz'], ld.moment):
                    F[self._dof_global_index(ld.node_id, axis)] += val
            else:
                F[self._dof_global_index(ld.node_id, 'ux')] += ld.force[0]
                F[self._dof_global_index(ld.node_id, 'uy')] += ld.force[1]
                F[self._dof_global_index(ld.node_id, 'rz')] += ld.moment[2]

        # ===== Применение КГУ методом исключения =====
        constrained_indices = set()
        for bc in self.bcs:
            for dof in bc.constrained:
                if self.dim == '2d' and dof not in DOF_INDEX_2D:
                    continue
                constrained_indices.add(self._dof_global_index(bc.node_id, dof))

        all_indices = set(range(n))
        free_indices = sorted(all_indices - constrained_indices)
        if not free_indices:
            raise ValueError('Все DOF закреплены — нечего решать')

        K_csr = K.tocsr()
        K_ff = K_csr[free_indices, :][:, free_indices]
        F_f = F[free_indices]

        # ===== Решение =====
        try:
            u_f = spsolve(K_ff, F_f)
        except Exception as e:
            raise RuntimeError(f'Решение не сошлось: {e}')

        u = np.zeros(n)
        u[free_indices] = u_f

        # ===== Реакции в опорах =====
        full_F = K_csr @ u
        reactions_vec = full_F - F  # внешние реакции

        # ===== Постпроцессинг =====
        nodal_displacements = []
        max_disp = 0.0
        for nid in self.node_ids:
            off = self.node_dof_offset[nid]
            entry = {'node_id': nid}
            if self.dim == '3d':
                entry.update({
                    'ux': float(u[off]), 'uy': float(u[off+1]), 'uz': float(u[off+2]),
                    'rx': float(u[off+3]), 'ry': float(u[off+4]), 'rz': float(u[off+5]),
                })
                disp = math.sqrt(u[off]**2 + u[off+1]**2 + u[off+2]**2)
            else:
                entry.update({
                    'ux': float(u[off]), 'uy': float(u[off+1]), 'rz': float(u[off+2]),
                })
                disp = math.sqrt(u[off]**2 + u[off+1]**2)
            entry['displacement_magnitude'] = float(disp)
            max_disp = max(max_disp, disp)
            nodal_displacements.append(entry)

        reactions = []
        for bc in self.bcs:
            off = self.node_dof_offset[bc.node_id]
            entry = {'node_id': bc.node_id}
            if self.dim == '3d':
                entry.update({
                    'fx': float(reactions_vec[off]),
                    'fy': float(reactions_vec[off+1]),
                    'fz': float(reactions_vec[off+2]),
                    'mx': float(reactions_vec[off+3]),
                    'my': float(reactions_vec[off+4]),
                    'mz': float(reactions_vec[off+5]),
                })
            else:
                entry.update({
                    'fx': float(reactions_vec[off]),
                    'fy': float(reactions_vec[off+1]),
                    'mz': float(reactions_vec[off+2]),
                })
            reactions.append(entry)

        # ===== Внутренние усилия по элементам =====
        element_results = []
        max_sigma_vm = 0.0
        # Реальный максимальный прогиб (с учётом точек ВНУТРИ элемента, не только узлов)
        max_disp_internal = max_disp
        n_sub = int(self.payload.get('analysis_options', {}).get('diagram_subdivisions', 20))
        for el in self.elements:
            cache = el_cache[el.id]
            dofs = self._element_dof_indices(el)
            u_el_global = u[dofs]
            u_el_local = cache['T'] @ u_el_global
            # Концевые усилия элемента: f_end = k_local · u_local − f_eq_local
            f_end = cache['k_local'] @ u_el_local - cache['f_eq_local']
            L = cache['L']
            sec = self.sections[el.section_id]
            mat = self.materials[el.material_id]

            # === Узловые перемещения элемента в локальной СК для интерполяции ===
            # Локальные DOF: для 2D — [ux_a, uy_a, rz_a, ux_b, uy_b, rz_b]
            # для 3D — [ux_a, uy_a, uz_a, rx_a, ry_a, rz_a, ux_b, uy_b, uz_b, rx_b, ry_b, rz_b]
            if self.dim == '2d':
                ux_a, uy_a, rz_a = u_el_local[0], u_el_local[1], u_el_local[2]
                ux_b, uy_b, rz_b = u_el_local[3], u_el_local[4], u_el_local[5]
                uz_a = uz_b = ry_a = ry_b = 0.0
            else:
                ux_a, uy_a, uz_a = u_el_local[0], u_el_local[1], u_el_local[2]
                ry_a, rz_a = u_el_local[4], u_el_local[5]
                ux_b, uy_b, uz_b = u_el_local[6], u_el_local[7], u_el_local[8]
                ry_b, rz_b = u_el_local[10], u_el_local[11]

            # Эпюры в N точках (линейная интерполяция концевых усилий + интеграл нагрузки)
            xs = np.linspace(0.0, L, n_sub + 1)
            N_arr, Qy_arr, Qz_arr, My_arr, Mz_arr, T_arr = [], [], [], [], [], []
            # Прогибы в локальной СК (в плоскости xy и xz для 3D)
            uy_arr_local: list[float] = []
            uz_arr_local: list[float] = []
            ux_arr_local: list[float] = []
            for x in xs:
                # Усилия в сечении x от концевых сил узла A:
                # N(x) = -N_a (растяжение/сжатие)
                if self.dim == '3d':
                    Na = -f_end[0]
                    Qya = -f_end[1]
                    Qza = -f_end[2]
                    Tx = -f_end[3]
                    Mya_at_x = -f_end[4] + f_end[2] * x   # M_y(x) = M_y_a + Qz_a*x
                    Mza_at_x = -f_end[5] - f_end[1] * x   # M_z(x) = M_z_a - Qy_a*x (правило знаков)
                    # Уч. распределённой нагрузки
                    for ld in self.loads:
                        if ld.element_id != el.id:
                            continue
                        if ld.kind == 'distributed_uniform':
                            qy, qz = ld.load_start[1], ld.load_start[2]
                            Qya -= qy * x
                            Qza -= qz * x
                            Mza_at_x -= qy * x * x / 2
                            Mya_at_x += qz * x * x / 2
                        elif ld.kind == 'in_span_point':
                            a = ld.position_ratio * L
                            if x > a:
                                Qya -= ld.force[1]
                                Qza -= ld.force[2]
                                Mza_at_x -= ld.force[1] * (x - a)
                                Mya_at_x += ld.force[2] * (x - a)
                                Na -= ld.force[0]
                    N_arr.append(float(Na))
                    Qy_arr.append(float(Qya))
                    Qz_arr.append(float(Qza))
                    T_arr.append(float(Tx))
                    My_arr.append(float(Mya_at_x))
                    Mz_arr.append(float(Mza_at_x))
                else:
                    Na = -f_end[0]
                    Qya = -f_end[1]
                    Mza_at_x = -f_end[2] - f_end[1] * x
                    for ld in self.loads:
                        if ld.element_id != el.id:
                            continue
                        if ld.kind == 'distributed_uniform':
                            qy = ld.load_start[1]
                            Qya -= qy * x
                            Mza_at_x -= qy * x * x / 2
                        elif ld.kind == 'in_span_point':
                            a = ld.position_ratio * L
                            if x > a:
                                Qya -= ld.force[1]
                                Mza_at_x -= ld.force[1] * (x - a)
                                Na -= ld.force[0]
                    N_arr.append(float(Na))
                    Qy_arr.append(float(Qya))
                    T_arr.append(0.0)
                    Qz_arr.append(0.0)
                    My_arr.append(0.0)
                    Mz_arr.append(float(Mza_at_x))

            # === Прогиб v(x) и u(x) методом функций формы Эрмита + поправка от внутрипролётных ===
            # Базовая часть: интерполяция узловых перемещений в локальной СК.
            # ux(ξ) = (1-ξ)·ux_a + ξ·ux_b
            # vy(ξ) = N1·uy_a + N2·rz_a + N3·uy_b + N4·rz_b
            # vz(ξ) = N1·uz_a + N2·(-ry_a) + N3·uz_b + N4·(-ry_b) — знак ry противоположный для xz-плоскости
            # Поправка от внутрипролётной нагрузки: дополнительный прогиб
            # v_p(x) от моментной диаграммы M(x) можно получить дважды интегрируя M/EI
            # с гранусловиями v(0) = v(L) = 0 (т.к. узловые перемещения уже учтены через N).
            EIz = mat.E * sec.I_z if sec.I_z > 0 else 0.0
            EIy = mat.E * sec.I_y if sec.I_y > 0 else 0.0
            # M_extra(x) — момент от внутрипролётных нагрузок при условии,
            # что узлы заделаны. Получаем из Mz_arr и My_arr ВЫЧИТАЯ линейный момент
            # от концевых усилий узла A: Mz_lin(x) = Mz_a + Qy_a·(L−x) — но проще:
            # рассмотрим, что Mz_total = Mz_узловое + Mz_от_внутрипролётных.
            # Берём интеграл от ПОЛНОГО M(x), а потом вычитаем линейную часть так,
            # чтобы v_p(0) = v_p(L) = 0.
            def double_integrate_with_zero_bcs(M_arr: list, xs_arr, EI: float) -> list:
                """Возвращает v(x) из v''(x) = -M/EI с v(0)=v(L)=0 (после вычитания линейного тренда)."""
                if EI <= 1e-12 or len(xs_arr) < 2:
                    return [0.0] * len(xs_arr)
                n = len(xs_arr)
                # Первое интегрирование: θ(x) = θ(0) + ∫(-M/EI)dx
                # Возьмём θ(0) = 0, а потом подкорректируем через граничное условие v(L)=0.
                theta = [0.0] * n
                for i in range(1, n):
                    dx = xs_arr[i] - xs_arr[i-1]
                    avg = -(M_arr[i] + M_arr[i-1]) / 2.0 / EI
                    theta[i] = theta[i-1] + avg * dx
                v = [0.0] * n
                for i in range(1, n):
                    dx = xs_arr[i] - xs_arr[i-1]
                    avg_theta = (theta[i] + theta[i-1]) / 2.0
                    v[i] = v[i-1] + avg_theta * dx
                # Корректировка чтобы v(0)=v(L)=0: вычитаем линейный тренд
                v_L = v[-1]
                for i in range(n):
                    t = xs_arr[i] / xs_arr[-1] if xs_arr[-1] > 0 else 0.0
                    v[i] -= t * v_L
                return v

            # Вспомогательная: линейный момент от концевых усилий узла A
            # (без учёта внутрипролётных). Используем для вычитания.
            # Mz_lin(x) = Mz_at_a − Qy_at_a · x, где Mz_at_a и Qy_at_a — концевые усилия А.
            if self.dim == '2d':
                Mz_a_end = -f_end[2]
                Qy_a_end = -f_end[1]
                Mz_lin = [Mz_a_end - Qy_a_end * x for x in xs]
                Mz_extra = [Mz_arr[i] - Mz_lin[i] for i in range(len(xs))]
                v_p = double_integrate_with_zero_bcs(Mz_extra, xs, EIz)
                # Эрмитовы функции для базовой части
                for i, x in enumerate(xs):
                    xi = x / L if L > 0 else 0.0
                    N1 = 1 - 3*xi**2 + 2*xi**3
                    N2 = L * (xi - 2*xi**2 + xi**3)
                    N3 = 3*xi**2 - 2*xi**3
                    N4 = L * (-xi**2 + xi**3)
                    v_base = N1*uy_a + N2*rz_a + N3*uy_b + N4*rz_b
                    u_base = (1 - xi) * ux_a + xi * ux_b
                    uy_arr_local.append(float(v_base + v_p[i]))
                    ux_arr_local.append(float(u_base))
                    uz_arr_local.append(0.0)
            else:
                # 3D: два изгиба + осевое
                Mz_a_end = -f_end[5]
                Qy_a_end = -f_end[1]
                Mz_lin = [Mz_a_end - Qy_a_end * x for x in xs]
                Mz_extra = [Mz_arr[i] - Mz_lin[i] for i in range(len(xs))]
                v_p_y = double_integrate_with_zero_bcs(Mz_extra, xs, EIz)

                My_a_end = -f_end[4]
                Qz_a_end = -f_end[2]
                # M_y(x) = M_y_a + Qz_a*x → линейная часть
                My_lin = [My_a_end + Qz_a_end * x for x in xs]
                My_extra = [My_arr[i] - My_lin[i] for i in range(len(xs))]
                v_p_z = double_integrate_with_zero_bcs(My_extra, xs, EIy)

                for i, x in enumerate(xs):
                    xi = x / L if L > 0 else 0.0
                    N1 = 1 - 3*xi**2 + 2*xi**3
                    N2 = L * (xi - 2*xi**2 + xi**3)
                    N3 = 3*xi**2 - 2*xi**3
                    N4 = L * (-xi**2 + xi**3)
                    v_base_y = N1*uy_a + N2*rz_a + N3*uy_b + N4*rz_b
                    v_base_z = N1*uz_a + N2*(-ry_a) + N3*uz_b + N4*(-ry_b)
                    u_base = (1 - xi) * ux_a + xi * ux_b
                    uy_arr_local.append(float(v_base_y + v_p_y[i]))
                    uz_arr_local.append(float(v_base_z + v_p_z[i]))
                    ux_arr_local.append(float(u_base))

            # Обновляем глобальный max_displacement по точкам внутри элемента
            for i in range(len(xs)):
                d = math.sqrt(ux_arr_local[i]**2 + uy_arr_local[i]**2 + uz_arr_local[i]**2)
                if d > max_disp_internal:
                    max_disp_internal = d

            # Напряжения по Мизесу в характерных точках сечения
            sigma_vm_arr = []
            for i, x in enumerate(xs):
                sigma_n = N_arr[i] / sec.A if sec.A > 0 else 0.0
                Wz = sec.W_z or (sec.I_z / max(sec.h / 2, 1e-9) if sec.I_z > 0 else 0.0)
                Wy = sec.W_y or (sec.I_y / max(sec.h / 2, 1e-9) if sec.I_y > 0 else 0.0)
                sigma_b = (abs(Mz_arr[i]) / Wz if Wz > 0 else 0.0) + \
                          (abs(My_arr[i]) / Wy if Wy > 0 else 0.0)
                sigma_total = abs(sigma_n) + sigma_b
                As_y = sec.shear_area_y or sec.A
                tau = abs(Qy_arr[i]) / As_y if As_y > 0 else 0.0
                sigma_vm = math.sqrt(sigma_total**2 + 3 * tau**2)
                sigma_vm_arr.append(float(sigma_vm))
                if sigma_vm > max_sigma_vm:
                    max_sigma_vm = sigma_vm

            sf = (mat.sigma_yield / max_sigma_vm) if max_sigma_vm > 1e-9 else float('inf')

            element_results.append({
                'element_id': el.id,
                'length': float(L),
                'diagrams': {
                    'x': [float(x) for x in xs],
                    'N': N_arr,
                    'Qy': Qy_arr,
                    'Qz': Qz_arr,
                    'T': T_arr,
                    'My': My_arr,
                    'Mz': Mz_arr,
                    'sigma_vm': sigma_vm_arr,
                    'ux_local': ux_arr_local,
                    'uy_local': uy_arr_local,
                    'uz_local': uz_arr_local,
                },
                'max_values': {
                    'abs_N_max': float(max(abs(v) for v in N_arr)),
                    'abs_Mz_max': float(max(abs(v) for v in Mz_arr)),
                    'abs_My_max': float(max(abs(v) for v in My_arr)),
                    'abs_sigma_vm_max': float(max(sigma_vm_arr)),
                    'abs_uy_max': float(max(abs(v) for v in uy_arr_local)) if uy_arr_local else 0.0,
                    'safety_factor': float(min(sf, 1e6)),
                },
            })

        warnings = []
        min_sf = min((r['max_values']['safety_factor'] for r in element_results), default=float('inf'))
        if min_sf < 1.0:
            warnings.append(f'Внимание: коэффициент запаса < 1 (min={min_sf:.2f}) — конструкция не проходит по прочности.')
        elif min_sf < 1.5:
            warnings.append(f'Низкий запас прочности (min={min_sf:.2f}). Рекомендуется усилить сечение.')

        summary = {
            'dim': self.dim,
            'n_nodes': len(self.nodes),
            'n_elements': len(self.elements),
            'n_dofs': self.n_dofs,
            'n_free_dofs': len(free_indices),
            'max_displacement': float(max_disp_internal),
            'max_sigma_vm': float(max_sigma_vm),
            'min_safety_factor': float(min_sf) if min_sf != float('inf') else None,
        }

        return SolveResult(
            summary=summary,
            nodal_displacements=nodal_displacements,
            reactions=reactions,
            element_results=element_results,
            warnings=warnings,
        )


def solve(payload: dict) -> dict:
    """Точка входа: принимает payload, возвращает dict с результатами."""
    solver = FrameSolver(payload)
    result = solver.solve()
    return {
        'status': 'ok',
        'solver_version': '0.1.0',
        'summary': result.summary,
        'nodal_displacements': result.nodal_displacements,
        'reactions': result.reactions,
        'elements': result.element_results,
        'warnings': result.warnings,
        'errors': [],
    }