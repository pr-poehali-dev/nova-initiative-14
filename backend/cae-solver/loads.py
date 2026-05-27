"""
Эквивалентные узловые нагрузки от внутрипролётных нагрузок
(equivalent fixed-end forces, FEF).

Распределённая или точечная нагрузка ВНУТРИ элемента переносится
в концевые узловые силы и моменты, эквивалентные защемлённой балке.
Для 2D с шарнирами на концах — перераспределение моментов по таблицам
сопромата.

Знак: возвращаемый вектор f_eq добавляется в правую часть СЛАУ со знаком +.
"""
from __future__ import annotations

import numpy as np


def fixed_end_forces_3d_uniform(qy: float, qz: float, L: float) -> np.ndarray:
    """
    Равномерная распределённая нагрузка q_y / q_z (Н/м) по локальным осям
    защемлённой 3D балки. Возвращает 12-вектор (DOF: ux,uy,uz,rx,ry,rz × 2).
    """
    f = np.zeros(12)
    # qy → силы по y и моменты Mz
    Vy = qy * L / 2.0
    Mz = qy * L * L / 12.0
    f[1] += Vy
    f[5] += Mz
    f[7] += Vy
    f[11] += -Mz
    # qz → силы по z и моменты My (знаки противоположны Mz по правилу правой руки).
    Vz = qz * L / 2.0
    My = qz * L * L / 12.0
    f[2] += Vz
    f[4] += -My
    f[8] += Vz
    f[10] += My
    return f


def fixed_end_forces_2d_uniform(qy: float, L: float,
                                 hinge_a: bool = False, hinge_b: bool = False) -> np.ndarray:
    """
    Равномерная qy на 2D-балке с учётом шарниров на концах.
      - hinge_a & hinge_b → простая балка: Va = Vb = qL/2
      - hinge_a → 3qL/8 в A, 5qL/8 в B, момент qL²/8 в B
      - hinge_b → зеркально
      - без шарниров → qL/2 + qL²/12 (классика)
    """
    f = np.zeros(6)
    if hinge_a and hinge_b:
        Vy = qy * L / 2.0
        f[1] += Vy
        f[4] += Vy
        return f
    if hinge_a and not hinge_b:
        # Va = 3qL/8, Vb = 5qL/8, Mb = qL²/8 (с учётом знака — момент в B)
        f[1] += 3.0 * qy * L / 8.0
        f[4] += 5.0 * qy * L / 8.0
        f[5] += -qy * L * L / 8.0
        return f
    if hinge_b and not hinge_a:
        f[1] += 5.0 * qy * L / 8.0
        f[2] += qy * L * L / 8.0
        f[4] += 3.0 * qy * L / 8.0
        return f
    # Обе стороны защемлены — классическая схема fixed-fixed.
    Vy = qy * L / 2.0
    Mz = qy * L * L / 12.0
    f[1] += Vy
    f[2] += Mz
    f[4] += Vy
    f[5] += -Mz
    return f


def fixed_end_forces_3d_point(Py: float, Pz: float, Px: float,
                               a: float, L: float) -> np.ndarray:
    """
    Точечная сила в локальных осях элемента в позиции a от узла A (0 ≤ a ≤ L).
    Возвращает 12-вектор узловых эквивалентов для защемлённой 3D балки.
    """
    f = np.zeros(12)
    b = L - a
    # Px (осевая) — по правилу рычага.
    f[0] += Px * b / L
    f[6] += Px * a / L
    if Py != 0:
        # Стандартные формулы fixed-fixed для поперечной силы.
        f[1] += Py * b ** 2 * (L + 2 * a) / L ** 3
        f[5] += Py * a * b ** 2 / L ** 2
        f[7] += Py * a ** 2 * (L + 2 * b) / L ** 3
        f[11] += -Py * a ** 2 * b / L ** 2
    if Pz != 0:
        f[2] += Pz * b ** 2 * (L + 2 * a) / L ** 3
        f[4] += -Pz * a * b ** 2 / L ** 2
        f[8] += Pz * a ** 2 * (L + 2 * b) / L ** 3
        f[10] += Pz * a ** 2 * b / L ** 2
    return f


def fixed_end_forces_2d_point(Py: float, Px: float, a: float, L: float,
                               hinge_a: bool = False, hinge_b: bool = False) -> np.ndarray:
    """
    Точечная Py (поперечная) и Px (осевая) на 2D балке в точке a от узла A.
    Учёт шарниров — перераспределение моментов по таблицам сопромата.
    """
    f = np.zeros(6)
    if L <= 0:
        return f
    b = L - a
    # Осевая разносится по правилу рычага независимо от шарниров.
    f[0] += Px * b / L
    f[3] += Px * a / L
    if hinge_a and hinge_b:
        # Простая балка: Ra = Py·b/L, Rb = Py·a/L
        f[1] += Py * b / L
        f[4] += Py * a / L
        return f
    if hinge_a and not hinge_b:
        # Шарнир в A, защемление в B.
        Mb = -Py * a * b * (L + a) / (2.0 * L * L)
        Ra = (Py * b - Mb) / L
        Rb = Py - Ra
        f[1] += Ra
        f[4] += Rb
        f[5] += Mb
        return f
    if hinge_b and not hinge_a:
        # Защемление в A, шарнир в B.
        Ma = Py * a * b * (L + b) / (2.0 * L * L)
        Rb = (Py * a - Ma) / L
        Ra = Py - Rb
        f[1] += Ra
        f[2] += Ma
        f[4] += Rb
        return f
    # Полное защемление с обеих сторон.
    f[1] += Py * b ** 2 * (L + 2 * a) / L ** 3
    f[2] += Py * a * b ** 2 / L ** 2
    f[4] += Py * a ** 2 * (L + 2 * b) / L ** 3
    f[5] += -Py * a ** 2 * b / L ** 2
    return f
