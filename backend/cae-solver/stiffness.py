"""
Элементные матрицы жёсткости в локальной СК.

Используется балка Тимошенко с параметром сдвига Φ = 12·E·I / (G·A_s·L²),
обобщающая Эйлер-Бернулли. При Φ → 0 сходится к классической балке;
при ненулевом сдвиге даёт дополнительные перемещения от Q (актуально
для коротких балок).

Шарниры (releases) в 2D реализованы через ОТДЕЛЬНЫЕ подматрицы для
случаев «шарнир-защемление» / «защемление-шарнир» / «шарнир-шарнир»
(вместо статической конденсации) — это даёт точные коэффициенты по
таблицам сопромата.
"""
from __future__ import annotations

import numpy as np


def beam_local_k_3d(E: float, G: float, A: float, L: float,
                    I_y: float, I_z: float, I_t: float,
                    A_sy: float | None, A_sz: float | None) -> np.ndarray:
    """
    Матрица жёсткости 12×12 для 3D балки с учётом сдвига.
    DOF на узле: ux, uy, uz, rx, ry, rz.
    Полный вектор: [a0..a5, b0..b5].

    Параметры сдвига:
      Φ_y = 12·E·I_z / (G·A_sy·L²)  — изгиб в плоскости xy (момент Mz)
      Φ_z = 12·E·I_y / (G·A_sz·L²)  — изгиб в плоскости xz (момент My)
    A_s* = None или 0 → Φ = 0 (классическая Эйлер-Бернулли).
    """
    k = np.zeros((12, 12))

    # Осевая жёсткость (ux)
    EA_L = E * A / L
    k[0, 0] += EA_L
    k[6, 6] += EA_L
    k[0, 6] -= EA_L
    k[6, 0] -= EA_L

    # Кручение (rx). I_t = 0 → жёсткость на кручение отсутствует.
    GJ_L = G * I_t / L if I_t > 0 else 0.0
    k[3, 3] += GJ_L
    k[9, 9] += GJ_L
    k[3, 9] -= GJ_L
    k[9, 3] -= GJ_L

    L2, L3 = L * L, L * L * L

    # Изгиб в плоскости xy (uy, rz) → момент Mz
    phi_y = 12.0 * E * I_z / (G * A_sy * L2) if (A_sy and A_sy > 0) else 0.0
    EIz = E * I_z
    denom_y = 1.0 + phi_y
    a = 12 * EIz / (L3 * denom_y)
    b = 6 * EIz / (L2 * denom_y)
    c = (4 + phi_y) * EIz / (L * denom_y)
    d = (2 - phi_y) * EIz / (L * denom_y)
    # uy_a=1, rz_a=5, uy_b=7, rz_b=11
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

    # Изгиб в плоскости xz (uz, ry) → момент My. Знаки внеосевых элементов
    # инвертированы по правилу правой руки (ry противоположен rz для xz).
    phi_z = 12.0 * E * I_y / (G * A_sz * L2) if (A_sz and A_sz > 0) else 0.0
    EIy = E * I_y
    denom_z = 1.0 + phi_z
    a2 = 12 * EIy / (L3 * denom_z)
    b2 = 6 * EIy / (L2 * denom_z)
    c2 = (4 + phi_z) * EIy / (L * denom_z)
    d2 = (2 - phi_z) * EIy / (L * denom_z)
    # uz_a=2, ry_a=4, uz_b=8, ry_b=10
    idx_z = [2, 4, 8, 10]
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
                    I_z: float, A_sy: float | None,
                    hinge_a: bool = False, hinge_b: bool = False) -> np.ndarray:
    """
    Матрица жёсткости 6×6 для 2D-рамы в плоскости XY.
    DOF: [ux_a, uy_a, rz_a, ux_b, uy_b, rz_b].

    Шарниры (hinge_a/hinge_b) освобождают момент Mz на конце стержня:
      - оба → ферменный стержень (только осевая жёсткость)
      - один → балка «шарнир-защемление» с коэффициентами 3EI/(L³·denom4)
        (точные коэффициенты по таблицам сопромата)
      - ни одного → стандартная балка Тимошенко
    """
    k = np.zeros((6, 6))

    # Осевая жёсткость (всегда)
    EA_L = E * A / L
    k[0, 0] += EA_L
    k[3, 3] += EA_L
    k[0, 3] -= EA_L
    k[3, 0] -= EA_L

    phi = 12.0 * E * I_z / (G * A_sy * L * L) if (A_sy and A_sy > 0) else 0.0
    EI = E * I_z

    # Оба шарнира → ферменный стержень (изгибная жёсткость = 0).
    if hinge_a and hinge_b:
        return k

    L2, L3 = L * L, L * L * L
    denom = 1.0 + phi

    if hinge_a and not hinge_b:
        # Шарнир в A, защемление в B. Жёсткость 3EI/L³ для пары (uy, rz_b).
        # Учёт сдвига через denom4 (упрощение для коротких балок).
        denom4 = 1.0 + phi / 4.0
        a3 = 3 * EI / (L3 * denom4)
        b3 = 3 * EI / (L2 * denom4)
        c3 = 3 * EI / (L * denom4)
        # uy_a=1, uy_b=4, rz_b=5
        Kb = np.array([
            [ a3, -a3,  b3],
            [-a3,  a3, -b3],
            [ b3, -b3,  c3],
        ])
        idx = [1, 4, 5]
        for i in range(3):
            for j in range(3):
                k[idx[i], idx[j]] += Kb[i, j]
        return k

    if hinge_b and not hinge_a:
        # Защемление в A, шарнир в B.
        denom4 = 1.0 + phi / 4.0
        a3 = 3 * EI / (L3 * denom4)
        b3 = 3 * EI / (L2 * denom4)
        c3 = 3 * EI / (L * denom4)
        # uy_a=1, rz_a=2, uy_b=4
        Kb = np.array([
            [ a3,  b3, -a3],
            [ b3,  c3, -b3],
            [-a3, -b3,  a3],
        ])
        idx = [1, 2, 4]
        for i in range(3):
            for j in range(3):
                k[idx[i], idx[j]] += Kb[i, j]
        return k

    # Жёсткие узлы с обеих сторон — стандартная балка Тимошенко 4×4.
    a = 12 * EI / (L3 * denom)
    b = 6 * EI / (L2 * denom)
    c = (4 + phi) * EI / (L * denom)
    d = (2 - phi) * EI / (L * denom)
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
