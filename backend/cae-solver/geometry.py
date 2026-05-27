"""
Геометрия элементов: длина, направляющие векторы, матрицы трансформации
локальной СК ↔ глобальной СК.

Локальная СК элемента:
  x — вдоль оси элемента (от node_a к node_b)
  y, z — главные оси сечения (в 3D задаются ref_vector)
"""
from __future__ import annotations

import numpy as np

from models import Node


def element_length_and_direction(node_a: Node, node_b: Node) -> tuple[float, np.ndarray]:
    """Длина L и единичный вектор оси x локальной СК (от A к B)."""
    a = np.array(node_a.coords, dtype=float)
    b = np.array(node_b.coords, dtype=float)
    vec = b - a
    L = float(np.linalg.norm(vec))
    if L < 1e-12:
        raise ValueError(f'Элемент имеет нулевую длину: узлы {node_a.id}—{node_b.id}')
    return L, vec / L


def build_transformation_3d(direction: np.ndarray, ref_vector: tuple) -> np.ndarray:
    """
    Матрица направляющих косинусов 3×3 для 3D-элемента.
    Строки — локальные оси x, y, z в глобальных компонентах.
    Если ref_vector почти параллелен оси элемента — выбираем альтернативный.
    """
    x_local = direction / np.linalg.norm(direction)
    ref = np.array(ref_vector, dtype=float)
    if abs(np.dot(x_local, ref / (np.linalg.norm(ref) + 1e-30))) > 0.999:
        ref = np.array([1.0, 0.0, 0.0]) if abs(x_local[0]) < 0.9 else np.array([0.0, 1.0, 0.0])
    z_local = np.cross(x_local, ref)
    z_local = z_local / np.linalg.norm(z_local)
    y_local = np.cross(z_local, x_local)
    y_local = y_local / np.linalg.norm(y_local)
    return np.vstack([x_local, y_local, z_local])


def build_full_transformation(R3: np.ndarray, dim: str) -> np.ndarray:
    """
    Полная матрица трансформации T: u_local = T · u_global.
    Для 3D — блочно-диагональная 12×12 из 4-х R3 (по 3 компоненты на узел × 2 узла × 2 типа DOF).
    Для 2D — 6×6 с поворотом в плоскости XY: (c,s,0 / -s,c,0 / 0,0,1).
    """
    if dim == '3d':
        T = np.zeros((12, 12))
        for i in range(4):
            T[3 * i:3 * i + 3, 3 * i:3 * i + 3] = R3
        return T

    # 2D: задача в плоскости XY. direction берём из R3[0] (первая строка).
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
