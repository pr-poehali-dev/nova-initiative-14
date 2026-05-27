"""
Конечно-элементный решатель балочных рам (2D и 3D). Линейная статика.

Балочные элементы Тимошенко с параметром сдвига Φ = 12·E·I / (G·A_s·L²).
При Φ → 0 сходится к классической Эйлер-Бернулли; при ненулевом — учитывает
дополнительные перемещения от Q. Поддерживаются шарниры на концах (фермы,
балки Гербера), нагрузки: узловые, распределённые равномерные/трапеция,
точечные внутрипролётные.

Степени свободы:
  2D: 3 DOF на узел — [ux, uy, rz]
  3D: 6 DOF на узел — [ux, uy, uz, rx, ry, rz]

Декомпозиция:
  - models.py     — dataclasses Material/Section/Node/Element/BC/Load + DOF
  - geometry.py   — длина элемента, матрицы трансформации T
  - stiffness.py  — beam_local_k_2d/3d с шарнирами и сдвигом
  - loads.py      — fixed-end forces (uniform/point, 2D/3D, с шарнирами)
  - postprocess.py — частное решение прогиба fixed-fixed для интерполяции
"""
from __future__ import annotations

import math

import numpy as np
from scipy.sparse import lil_matrix
from scipy.sparse.linalg import spsolve

from geometry import (
    build_full_transformation,
    build_transformation_3d,
    element_length_and_direction,
)
from loads import (
    fixed_end_forces_2d_point,
    fixed_end_forces_2d_uniform,
    fixed_end_forces_3d_point,
    fixed_end_forces_3d_uniform,
)
from models import (
    DOF_INDEX_2D,
    DOF_INDEX_3D,
    BoundaryCondition,
    Element,
    Load,
    Material,
    Node,
    Section,
    SolveResult,
)
from postprocess import fixed_fixed_deflection_at
from stiffness import beam_local_k_2d, beam_local_k_3d


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
        """Парсит payload в датаклассы. Фильтрует неизвестные поля материала."""
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
            # Шарниры на концах: освобождение момента Mz (фермы, тяги, балки Гербера).
            releases_a = {}
            releases_b = {}
            if e.get('hinge_start'):
                releases_a['rz'] = True
            if e.get('hinge_end'):
                releases_b['rz'] = True
            self.elements.append(Element(
                id=e['id'],
                node_a=e['node_start'],
                node_b=e['node_end'],
                material_id=e['material_id'],
                section_id=e['section_id'],
                ref_vector=tuple(e.get('ref_vector', (0, 0, 1))),
                releases_a=releases_a,
                releases_b=releases_b,
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

        # Индексация DOF: каждому узлу присваивается оффсет в глобальном векторе.
        self.node_ids = list(self.nodes.keys())
        self.node_dof_offset = {nid: i * self.dof_per_node for i, nid in enumerate(self.node_ids)}
        self.n_dofs = len(self.node_ids) * self.dof_per_node

    def _dof_global_index(self, node_id: str, dof_name: str) -> int:
        local = DOF_INDEX_3D[dof_name] if self.dim == '3d' else DOF_INDEX_2D[dof_name]
        return self.node_dof_offset[node_id] + local

    def _element_dof_indices(self, el: Element) -> list[int]:
        """Глобальные индексы DOF элемента: все DOF узла A, потом все DOF узла B."""
        off_a = self.node_dof_offset[el.node_a]
        off_b = self.node_dof_offset[el.node_b]
        n = self.dof_per_node
        return list(range(off_a, off_a + n)) + list(range(off_b, off_b + n))

    def _build_element_stiffness(self, el: Element):
        """K_local, K_global = T^T · K_local · T, T-матрица, длина."""
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
            hinge_a = bool(el.releases_a.get('rz'))
            hinge_b = bool(el.releases_b.get('rz'))
            k_local = beam_local_k_2d(
                mat.E, sec.A, mat.G, L, sec.I_z, sec.shear_area_y,
                hinge_a=hinge_a, hinge_b=hinge_b,
            )

        k_global = T.T @ k_local @ T
        return k_local, k_global, T, L

    def solve(self) -> SolveResult:
        n = self.n_dofs
        K = lil_matrix((n, n))
        F = np.zeros(n)
        el_cache = {}

        # ===== Сборка K и f_eq от внутрипролётных нагрузок =====
        for el in self.elements:
            k_local, k_global, T, L = self._build_element_stiffness(el)
            el_cache[el.id] = {'k_local': k_local, 'T': T, 'L': L}

            dofs = self._element_dof_indices(el)
            for i in range(len(dofs)):
                for j in range(len(dofs)):
                    K[dofs[i], dofs[j]] += k_global[i, j]

            # Эквивалентные узловые силы от внутрипролётных нагрузок.
            # Для 2D учитываем шарниры — перераспределение моментов.
            hinge_a = bool(el.releases_a.get('rz'))
            hinge_b = bool(el.releases_b.get('rz'))
            f_eq_local = np.zeros(self.dof_per_node * 2)
            for ld in self.loads:
                if ld.element_id != el.id:
                    continue
                if ld.kind == 'distributed_uniform':
                    if self.dim == '3d':
                        f_eq_local += fixed_end_forces_3d_uniform(ld.load_start[1], ld.load_start[2], L)
                    else:
                        f_eq_local += fixed_end_forces_2d_uniform(
                            ld.load_start[1], L, hinge_a=hinge_a, hinge_b=hinge_b,
                        )
                elif ld.kind == 'distributed_trapezoidal':
                    qy_avg = (ld.load_start[1] + ld.load_end[1]) / 2
                    qz_avg = (ld.load_start[2] + ld.load_end[2]) / 2
                    if self.dim == '3d':
                        f_eq_local += fixed_end_forces_3d_uniform(qy_avg, qz_avg, L)
                    else:
                        f_eq_local += fixed_end_forces_2d_uniform(
                            qy_avg, L, hinge_a=hinge_a, hinge_b=hinge_b,
                        )
                elif ld.kind == 'in_span_point':
                    a = ld.position_ratio * L
                    if self.dim == '3d':
                        f_eq_local += fixed_end_forces_3d_point(
                            ld.force[1], ld.force[2], ld.force[0], a, L,
                        )
                    else:
                        f_eq_local += fixed_end_forces_2d_point(
                            ld.force[1], ld.force[0], a, L,
                            hinge_a=hinge_a, hinge_b=hinge_b,
                        )
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

        # ===== Автоподавление «висячих» DOF (шарнирные узлы фермы) =====
        # Если по строке/столбцу матрицы стоят нули (rz узла, к которому
        # сходятся только шарнирные стержни и нет приложенного момента),
        # spsolve вернёт сингулярную систему. Эти DOF не влияют на решение —
        # принудительно обнуляем (математически: u_dof = 0).
        diag = K_ff.diagonal()
        nonzero_diag = diag[np.abs(diag) > 1e-30]
        diag_scale = float(np.median(np.abs(nonzero_diag))) if nonzero_diag.size > 0 else 1.0
        zero_dof_mask = np.abs(diag) < diag_scale * 1e-12
        suppressed_count = int(zero_dof_mask.sum())
        if suppressed_count > 0:
            K_ff = K_ff.tolil()
            for idx in np.where(zero_dof_mask)[0]:
                K_ff.rows[idx] = [int(idx)]
                K_ff.data[idx] = [1.0]
                F_f[idx] = 0.0
            K_ff = K_ff.tocsr()

        # ===== Решение СЛАУ =====
        try:
            u_f = spsolve(K_ff, F_f)
        except Exception as e:
            raise RuntimeError(
                f'Не удалось решить СЛАУ: возможно, конструкция геометрически '
                f'изменяема или у узлов фермы не хватает связей. Подробности: {e}'
            )
        if not np.all(np.isfinite(u_f)):
            raise RuntimeError(
                'Решение содержит бесконечные перемещения. Скорее всего конструкция '
                'геометрически изменяема (мгновенно изменяемая система) — добавьте '
                'связи или уберите лишние шарниры.'
            )

        u = np.zeros(n)
        u[free_indices] = u_f

        # ===== Реакции в опорах =====
        full_F = K_csr @ u
        reactions_vec = full_F - F  # внешние реакции

        # ===== Постпроцессинг: узловые перемещения =====
        nodal_displacements = []
        max_disp = 0.0
        for nid in self.node_ids:
            off = self.node_dof_offset[nid]
            entry = {'node_id': nid}
            if self.dim == '3d':
                entry.update({
                    'ux': float(u[off]), 'uy': float(u[off + 1]), 'uz': float(u[off + 2]),
                    'rx': float(u[off + 3]), 'ry': float(u[off + 4]), 'rz': float(u[off + 5]),
                })
                disp = math.sqrt(u[off] ** 2 + u[off + 1] ** 2 + u[off + 2] ** 2)
            else:
                entry.update({
                    'ux': float(u[off]), 'uy': float(u[off + 1]), 'rz': float(u[off + 2]),
                })
                disp = math.sqrt(u[off] ** 2 + u[off + 1] ** 2)
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
                    'fy': float(reactions_vec[off + 1]),
                    'fz': float(reactions_vec[off + 2]),
                    'mx': float(reactions_vec[off + 3]),
                    'my': float(reactions_vec[off + 4]),
                    'mz': float(reactions_vec[off + 5]),
                })
            else:
                entry.update({
                    'fx': float(reactions_vec[off]),
                    'fy': float(reactions_vec[off + 1]),
                    'mz': float(reactions_vec[off + 2]),
                })
            reactions.append(entry)

        # ===== Внутренние усилия + прогибы по элементам =====
        element_results = []
        max_sigma_vm = 0.0
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

            # Локальные узловые перемещения для эрмитовой интерполяции.
            if self.dim == '2d':
                ux_a, uy_a, rz_a = u_el_local[0], u_el_local[1], u_el_local[2]
                ux_b, uy_b, rz_b = u_el_local[3], u_el_local[4], u_el_local[5]
                uz_a = uz_b = ry_a = ry_b = 0.0
            else:
                ux_a, uy_a, uz_a = u_el_local[0], u_el_local[1], u_el_local[2]
                ry_a, rz_a = u_el_local[4], u_el_local[5]
                ux_b, uy_b, uz_b = u_el_local[6], u_el_local[7], u_el_local[8]
                ry_b, rz_b = u_el_local[10], u_el_local[11]

            # Эпюры в N точках. Добавляем точки до/после in_span_point,
            # чтобы скачок Q и излом M были ровно в точке силы.
            xs_base = list(np.linspace(0.0, L, n_sub + 1))
            eps = L * 1e-6
            for ld in self.loads:
                if ld.element_id == el.id and ld.kind == 'in_span_point':
                    a_pt = ld.position_ratio * L
                    if eps < a_pt < L - eps:
                        xs_base.append(a_pt - eps)
                        xs_base.append(a_pt)
                        xs_base.append(a_pt + eps)
            xs = np.array(sorted(set(round(v, 10) for v in xs_base)))

            N_arr, Qy_arr, Qz_arr, My_arr, Mz_arr, T_arr = [], [], [], [], [], []
            uy_arr_local: list[float] = []
            uz_arr_local: list[float] = []
            ux_arr_local: list[float] = []

            for x in xs:
                # Усилия в сечении x:
                #   N(x) = -N_a (растяжение/сжатие)
                #   M_z(x) = M_z_a − Qy_a·x (правило знаков)
                if self.dim == '3d':
                    Na = -f_end[0]
                    Qya = -f_end[1]
                    Qza = -f_end[2]
                    Tx = -f_end[3]
                    Mya_at_x = -f_end[4] + f_end[2] * x   # M_y(x) = M_y_a + Qz_a·x
                    Mza_at_x = -f_end[5] + f_end[1] * x   # M_z(x) = M_z_a + Qy_a·x
                    # Нагрузки внутри элемента: знаки согласованы со знаками
                    # начальных усилий (+ Qy_a·x → нагрузки тоже добавляются).
                    for ld in self.loads:
                        if ld.element_id != el.id:
                            continue
                        if ld.kind == 'distributed_uniform':
                            qy, qz = ld.load_start[1], ld.load_start[2]
                            Qya += qy * x
                            Qza += qz * x
                            Mza_at_x += qy * x * x / 2
                            Mya_at_x -= qz * x * x / 2
                        elif ld.kind == 'in_span_point':
                            a = ld.position_ratio * L
                            if x > a:
                                Qya += ld.force[1]
                                Qza += ld.force[2]
                                Mza_at_x += ld.force[1] * (x - a)
                                Mya_at_x -= ld.force[2] * (x - a)
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
                    Mza_at_x = -f_end[2] + f_end[1] * x
                    for ld in self.loads:
                        if ld.element_id != el.id:
                            continue
                        if ld.kind == 'distributed_uniform':
                            qy = ld.load_start[1]
                            Qya += qy * x
                            Mza_at_x += qy * x * x / 2
                        elif ld.kind == 'in_span_point':
                            a = ld.position_ratio * L
                            if x > a:
                                Qya += ld.force[1]
                                Mza_at_x += ld.force[1] * (x - a)
                                Na -= ld.force[0]
                    N_arr.append(float(Na))
                    Qy_arr.append(float(Qya))
                    T_arr.append(0.0)
                    Qz_arr.append(0.0)
                    My_arr.append(0.0)
                    Mz_arr.append(float(Mza_at_x))

            # === Прогиб v(x) = эрмитова интерполяция + частное решение fixed-fixed ===
            EIz = mat.E * sec.I_z if sec.I_z > 0 else 0.0
            EIy = mat.E * sec.I_y if sec.I_y > 0 else 0.0
            loads_on_el = [ld for ld in self.loads if ld.element_id == el.id]

            if self.dim == '2d':
                v_p = [fixed_fixed_deflection_at(x, L, EIz, loads_on_el, '2d')[0] for x in xs]
                for i, x in enumerate(xs):
                    xi = x / L if L > 0 else 0.0
                    N1 = 1 - 3 * xi ** 2 + 2 * xi ** 3
                    N2 = L * (xi - 2 * xi ** 2 + xi ** 3)
                    N3 = 3 * xi ** 2 - 2 * xi ** 3
                    N4 = L * (-xi ** 2 + xi ** 3)
                    v_base = N1 * uy_a + N2 * rz_a + N3 * uy_b + N4 * rz_b
                    u_base = (1 - xi) * ux_a + xi * ux_b
                    uy_arr_local.append(float(v_base + v_p[i]))
                    ux_arr_local.append(float(u_base))
                    uz_arr_local.append(0.0)
            else:
                v_p_y = [fixed_fixed_deflection_at(x, L, EIz, loads_on_el, '3d')[0] for x in xs]
                v_p_z = [fixed_fixed_deflection_at(x, L, EIy, loads_on_el, '3d')[1] for x in xs]
                for i, x in enumerate(xs):
                    xi = x / L if L > 0 else 0.0
                    N1 = 1 - 3 * xi ** 2 + 2 * xi ** 3
                    N2 = L * (xi - 2 * xi ** 2 + xi ** 3)
                    N3 = 3 * xi ** 2 - 2 * xi ** 3
                    N4 = L * (-xi ** 2 + xi ** 3)
                    v_base_y = N1 * uy_a + N2 * rz_a + N3 * uy_b + N4 * rz_b
                    v_base_z = N1 * uz_a + N2 * (-ry_a) + N3 * uz_b + N4 * (-ry_b)
                    u_base = (1 - xi) * ux_a + xi * ux_b
                    uy_arr_local.append(float(v_base_y + v_p_y[i]))
                    uz_arr_local.append(float(v_base_z + v_p_z[i]))
                    ux_arr_local.append(float(u_base))

            # Глобальный max_displacement по точкам внутри элемента.
            for i in range(len(xs)):
                d = math.sqrt(ux_arr_local[i] ** 2 + uy_arr_local[i] ** 2 + uz_arr_local[i] ** 2)
                if d > max_disp_internal:
                    max_disp_internal = d

            # Напряжения по Мизесу.
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
                sigma_vm = math.sqrt(sigma_total ** 2 + 3 * tau ** 2)
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