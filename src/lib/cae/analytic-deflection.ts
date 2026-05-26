/**
 * Аналитические формулы прогибов для простых расчётных схем.
 * Используется для сравнения с КЭМ-результатом и валидации решателя.
 *
 * Поддерживаются:
 *  - консоль с P на конце           f = PL³/(3EI)
 *  - консоль с равномерной q        f = qL⁴/(8EI)
 *  - балка на 2 опорах, q           f = 5qL⁴/(384EI)
 *  - балка на 2 опорах, P по центру f = PL³/(48EI)
 *  - балка на 2 опорах, P в точке a f = Pa(3L²-4a²)/(48EI) при a≤L/2
 */
import type { FrameModel } from "@/lib/cae-model";

export interface AnalyticResult {
  /** LaTeX-like строка для отображения */
  formula: string;
  /** Название расчётной схемы */
  scheme: string;
  /** Прогиб, м */
  f_analytic: number;
}

export function computeAnalytic(model: FrameModel): AnalyticResult | null {
  const { nodes, elements, boundary_conditions: bcs, loads, sections, materials } = model;

  // Работаем только с одним элементом (балка целиком)
  if (elements.length !== 1) return null;
  const el = elements[0];

  const sec = sections.find((s) => s.id === el.section_id);
  const mat = materials.find((m) => m.id === el.material_id);
  if (!sec || !mat) return null;

  const EI = mat.E * sec.I_z;
  if (EI <= 0) return null;

  const nA = nodes.find((n) => n.id === el.node_start);
  const nB = nodes.find((n) => n.id === el.node_end);
  if (!nA || !nB) return null;

  const dx = nB.coords[0] - nA.coords[0];
  const dy = nB.coords[1] - nA.coords[1];
  const L = Math.sqrt(dx * dx + dy * dy);
  if (L < 1e-9) return null;

  const bcA = bcs.find((b) => b.node_id === el.node_start);
  const bcB = bcs.find((b) => b.node_id === el.node_end);

  const isFixed = (bc: typeof bcA) =>
    bc?.constrained_dofs.includes("ux") &&
    bc?.constrained_dofs.includes("uy") &&
    bc?.constrained_dofs.includes("rz");

  const isPinned = (bc: typeof bcA) =>
    bc?.constrained_dofs.includes("uy") &&
    !bc?.constrained_dofs.includes("rz");

  const fixedA = isFixed(bcA);
  const fixedB = isFixed(bcB);
  const pinnedA = isPinned(bcA);
  const pinnedB = isPinned(bcB);

  // ====== КОНСОЛЬ ======
  if ((fixedA && !bcB) || (fixedB && !bcA)) {
    const freeNode = fixedA ? el.node_end : el.node_start;

    const nodalLoad = loads.find(
      (l) => l.type === "nodal_force" && l.node_id === freeNode,
    );
    const P = nodalLoad ? Math.abs(nodalLoad.force?.[1] ?? 0) : 0;

    const distLoad = loads.find(
      (l) => l.type === "distributed_uniform" && l.element_id === el.id,
    );
    const q = distLoad ? Math.abs(distLoad.load_local_per_length?.[1] ?? 0) : 0;

    if (P > 0 && q === 0) {
      return {
        scheme: "Консоль, P на конце",
        formula: "f = PL³ / (3EI)",
        f_analytic: (P * L * L * L) / (3 * EI),
      };
    }
    if (q > 0 && P === 0) {
      return {
        scheme: "Консоль, равномерная q",
        formula: "f = qL⁴ / (8EI)",
        f_analytic: (q * L ** 4) / (8 * EI),
      };
    }
    return null;
  }

  // ====== ШАРНИРНО-ОПЁРТАЯ БАЛКА ======
  if ((pinnedA || fixedA) && (pinnedB || fixedB)) {
    const distLoad = loads.find(
      (l) => l.type === "distributed_uniform" && l.element_id === el.id,
    );
    const q = distLoad ? Math.abs(distLoad.load_local_per_length?.[1] ?? 0) : 0;

    if (q > 0 && loads.filter((l) => l.type !== "distributed_uniform").length === 0) {
      return {
        scheme: "Балка на двух опорах, равномерная q",
        formula: "f = 5qL⁴ / (384EI)",
        f_analytic: (5 * q * L ** 4) / (384 * EI),
      };
    }

    const nodalLoads = loads.filter((l) => l.type === "nodal_force");
    if (nodalLoads.length === 1 && q === 0) {
      const ld = nodalLoads[0];
      const P = Math.abs(ld.force?.[1] ?? 0);
      const loadNode = nodes.find((n) => n.id === ld.node_id);
      if (loadNode && P > 0) {
        const dxL = loadNode.coords[0] - nA.coords[0];
        const dyL = loadNode.coords[1] - nA.coords[1];
        const a = Math.sqrt(dxL * dxL + dyL * dyL);
        const b = L - a;
        if (a > 1e-9 && b > 1e-9) {
          const centerTol = Math.abs(a - b) / L;
          if (centerTol < 0.02) {
            return {
              scheme: "Балка на двух опорах, P по центру",
              formula: "f = PL³ / (48EI)",
              f_analytic: (P * L ** 3) / (48 * EI),
            };
          }
          return {
            scheme: "Балка на двух опорах, P в точке a",
            formula: "f_max = Pa(3L²−4a²) / (48EI)  при a≤L/2",
            f_analytic:
              a <= L / 2
                ? (P * a * (3 * L * L - 4 * a * a)) / (48 * EI)
                : (P * b * (3 * L * L - 4 * b * b)) / (48 * EI),
          };
        }
      }
    }

    const inSpan = loads.filter((l) => l.type === "in_span_point" && l.element_id === el.id);
    if (inSpan.length === 1 && q === 0 && nodalLoads.length === 0) {
      const ld = inSpan[0];
      const P = Math.abs(ld.force?.[1] ?? 0);
      const pos = ld.position_ratio ?? 0.5;
      const a = pos * L;
      const b = L - a;
      if (P > 0 && a > 1e-9 && b > 1e-9) {
        const centerTol = Math.abs(a - b) / L;
        if (centerTol < 0.02) {
          return {
            scheme: "Балка на двух опорах, P по центру",
            formula: "f = PL³ / (48EI)",
            f_analytic: (P * L ** 3) / (48 * EI),
          };
        }
        return {
          scheme: "Балка на двух опорах, P в точке a",
          formula: "f_max = Pa(3L²−4a²) / (48EI)  при a≤L/2",
          f_analytic:
            a <= L / 2
              ? (P * a * (3 * L * L - 4 * a * a)) / (48 * EI)
              : (P * b * (3 * L * L - 4 * b * b)) / (48 * EI),
        };
      }
    }
  }

  return null;
}
