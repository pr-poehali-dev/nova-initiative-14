"""
Постпроцессинг: интерполяция прогиба внутри элемента.

Прогиб элемента считается как сумма ДВУХ частей:
  1. Базовая эрмитова интерполяция узловых перемещений (uy_a, rz_a, uy_b, rz_b).
     Это решение однородного уравнения изгиба EI·v'''' = 0.
  2. Частное решение v_p(x) — прогиб балки с ЗАДЕЛАННЫМИ концами
     (v(0)=v(L)=0, v'(0)=v'(L)=0) от внутрипролётной нагрузки.

Сложение оправдано тем, что эрмитова часть автоматически удовлетворяет
узловым условиям, а частное — обращается в ноль на концах и не нарушает их.

Формулы fixed-fixed по Roark / Тимошенко.
"""
from __future__ import annotations

from models import Load


def fixed_fixed_deflection_at(x: float, L_el: float, EI: float,
                              loads_on_element: list[Load],
                              dim: str) -> tuple[float, float]:
    """
    (vy, vz) — прогиб в точке x балки длины L_el от ВСЕХ внутрипролётных
    нагрузок этого элемента, при условии заделки на обоих концах.

    loads_on_element — уже отфильтрованный список Load с element_id текущего элемента.
    dim — '2d' или '3d' (в 2D компонента vz всегда 0).

    Знаки vy, vz согласованы с осями локальной СК (вниз отрицательно при
    положительных q, P, направленных вверх).
    """
    if EI <= 1e-12 or L_el <= 1e-12:
        return 0.0, 0.0

    vy_acc = 0.0
    vz_acc = 0.0

    for ld in loads_on_element:
        if ld.kind == 'in_span_point':
            # Точечная сила P в положении a от начала, b = L − a.
            # Формула fixed-fixed beam, точечная сила:
            #   x ≤ a: v = P·b²·x²·(3a·L − (3a+b)·x) / (6·EI·L³)
            #   x ≥ a: v = P·a²·(L−x)²·(3b·L − (3b+a)·(L−x)) / (6·EI·L³)
            a = ld.position_ratio * L_el
            b = L_el - a
            Py = ld.force[1]
            Pz = ld.force[2] if dim == '3d' else 0.0
            if x <= a:
                f_unit = b * b * x * x * (3 * a * L_el - (3 * a + b) * x) \
                         / (6 * L_el ** 3)
            else:
                Lmx = L_el - x
                f_unit = a * a * Lmx * Lmx * (3 * b * L_el - (3 * b + a) * Lmx) \
                         / (6 * L_el ** 3)
            vy_acc += Py * f_unit / EI
            vz_acc += Pz * f_unit / EI

        elif ld.kind == 'distributed_uniform':
            # Равномерная q по всей длине (заделка-заделка):
            #   v(x) = q·x²·(L−x)² / (24·EI)
            qy = ld.load_start[1]
            qz = ld.load_start[2] if dim == '3d' else 0.0
            f_unit = x * x * (L_el - x) ** 2 / 24.0
            vy_acc += qy * f_unit / EI
            vz_acc += qz * f_unit / EI

    return vy_acc, vz_acc
