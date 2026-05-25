import type { DiagramKind } from "@/components/cae/FrameCanvas";
import type { SolverResponse, FrameModel } from "@/lib/cae-model";

const formatNumber = (v: number, digits = 4) => {
  if (!isFinite(v)) return "—";
  if (Math.abs(v) >= 1000) return v.toExponential(2);
  if (Math.abs(v) < 0.001 && v !== 0) return v.toExponential(2);
  return v.toFixed(digits);
};

// ===== Аналитическая проверка для простых расчётных схем =====
interface AnalyticResult {
  formula: string;       // LaTeX-like строка для отображения
  scheme: string;        // Название схемы
  f_analytic: number;   // Прогиб, м
}

function computeAnalytic(model: FrameModel): AnalyticResult | null {
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

  // ====== КОНСОЛЬ: один конец защемлён, другой свободен ======
  if ((fixedA && !bcB) || (fixedB && !bcA)) {
    const freeNode = fixedA ? el.node_end : el.node_start;

    // Сосредоточенная сила на свободном конце
    const nodalLoad = loads.find(
      (l) => l.type === "nodal_force" && l.node_id === freeNode,
    );
    const P = nodalLoad ? Math.abs(nodalLoad.force?.[1] ?? 0) : 0;

    // Равномерная нагрузка
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
    // Равномерная нагрузка по всему пролёту
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

    // Сосредоточенная узловая нагрузка
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
            // В середине
            return {
              scheme: "Балка на двух опорах, P по центру",
              formula: "f = PL³ / (48EI)",
              f_analytic: (P * L ** 3) / (48 * EI),
            };
          }
          // Произвольное положение
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

    // in_span_point в середине
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

interface Props {
  result: SolverResponse | null;
  model: FrameModel;
  showDiagram: DiagramKind;
  setShowDiagram: (d: DiagramKind) => void;
  diagramScale: number;
  setDiagramScale: (v: number) => void;
}

const EditorResultsPanel = ({
  result,
  model,
  showDiagram,
  setShowDiagram,
  diagramScale,
  setDiagramScale,
}: Props) => {
  const analytic = result ? computeAnalytic(model) : null;
  const numericMm = result ? result.summary.max_displacement * 1000 : null;
  const analyticMm = analytic ? analytic.f_analytic * 1000 : null;
  const deltaPct =
    numericMm !== null && analyticMm !== null && analyticMm > 1e-9
      ? ((numericMm - analyticMm) / analyticMm) * 100
      : null;

  return (
    <div className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)] p-3">
      <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-2">
        Результат
      </p>
      {!result ? (
        <p className="text-[11px] text-[var(--drawing-line-thin)]">
          Нажмите «Посчитать» после построения схемы.
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-mono mb-3">
            <dt className="text-[var(--drawing-line-thin)]">Узлов:</dt>
            <dd>{result.summary.n_nodes}</dd>
            <dt className="text-[var(--drawing-line-thin)]">Элементов:</dt>
            <dd>{result.summary.n_elements}</dd>
            <dt className="text-[var(--drawing-line-thin)]">Макс. прогиб:</dt>
            <dd>{formatNumber(result.summary.max_displacement * 1000, 3)} мм</dd>
            <dt className="text-[var(--drawing-line-thin)]">Макс σ Мизес:</dt>
            <dd>{formatNumber(result.summary.max_sigma_vm / 1e6, 1)} МПа</dd>
            <dt className="text-[var(--drawing-line-thin)]">Запас:</dt>
            <dd>
              {result.summary.min_safety_factor && result.summary.min_safety_factor < 1e5
                ? result.summary.min_safety_factor.toFixed(2)
                : "∞"}
            </dd>
            <dt className="text-[var(--drawing-line-thin)]">Время:</dt>
            <dd>{result.duration_ms} мс</dd>
          </dl>

          {/* Аналитическая проверка */}
          {analytic && analyticMm !== null && deltaPct !== null && (
            <div className="mb-3 border border-[var(--drawing-line-thin)] p-2 text-[10px] font-mono">
              <p className="font-gost uppercase tracking-[0.15em] text-[var(--drawing-line-thin)] mb-1.5">
                Аналит. проверка
              </p>
              <p className="text-[var(--drawing-line-thin)] mb-1">{analytic.scheme}</p>
              <p className="mb-1.5 text-[9px] opacity-70">{analytic.formula}</p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                <span className="text-[var(--drawing-line-thin)]">КЭМ:</span>
                <span>{formatNumber(numericMm!, 3)} мм</span>
                <span className="text-[var(--drawing-line-thin)]">Аналит.:</span>
                <span>{formatNumber(analyticMm, 3)} мм</span>
                <span className="text-[var(--drawing-line-thin)]">Δ:</span>
                <span
                  className={
                    Math.abs(deltaPct) < 2
                      ? "text-green-600"
                      : Math.abs(deltaPct) < 5
                        ? "text-yellow-600"
                        : "text-[var(--drawing-accent)]"
                  }
                >
                  {deltaPct > 0 ? "+" : ""}
                  {deltaPct.toFixed(2)} %
                </span>
              </div>
            </div>
          )}

          {/* Таблица реакций опор */}
          {result.reactions.length > 0 && (
            <div className="mb-3">
              <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1.5">
                Реакции опор
              </p>
              <table className="w-full text-[10px] font-mono border-collapse">
                <thead>
                  <tr className="border-b border-[var(--drawing-line-thin)]">
                    <th className="text-left py-0.5 text-[var(--drawing-line-thin)] font-normal">Узел</th>
                    <th className="text-right py-0.5 text-[var(--drawing-line-thin)] font-normal">Fx, Н</th>
                    <th className="text-right py-0.5 text-[var(--drawing-line-thin)] font-normal">Fy, Н</th>
                    <th className="text-right py-0.5 text-[var(--drawing-line-thin)] font-normal">Mz, Н·м</th>
                  </tr>
                </thead>
                <tbody>
                  {result.reactions.map((r) => (
                    <tr key={r.node_id} className="border-b border-[var(--drawing-line-thin)]/30">
                      <td className="py-0.5">{r.node_id}</td>
                      <td className="text-right py-0.5">{Math.round(r.fx)}</td>
                      <td className="text-right py-0.5">{Math.round(r.fy)}</td>
                      <td className="text-right py-0.5">{Math.round(r.mz)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1.5">
            Вид схемы
          </p>
          <div className="grid grid-cols-2 gap-1 mb-3">
            {[
              {
                v: "none",
                label: "Исходная",
                title: "Недеформированная схема рамы",
              },
              {
                v: "deformed",
                label: "Деформированная",
                title:
                  "Наложение деформированной схемы на канву: узлы смещены, элементы изогнуты по реальным траекториям прогиба",
              },
            ].map((d) => (
              <button
                key={d.v}
                onClick={() => setShowDiagram(d.v as DiagramKind)}
                title={d.title}
                className={`border py-1.5 text-[10px] font-gost uppercase ${
                  showDiagram === d.v
                    ? "bg-[var(--drawing-accent)] text-white border-[var(--drawing-accent)]"
                    : "border-[var(--drawing-line)] hover:bg-[var(--drawing-paper)]"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1.5">
            Эпюра вдоль элемента
          </p>
          <div className="grid grid-cols-3 gap-1 mb-2">
            {[
              {
                v: "N",
                label: "N",
                title: "Эпюра продольной (осевой) силы, Н",
              },
              {
                v: "Qy",
                label: "Q",
                title: "Эпюра поперечной силы, Н",
              },
              {
                v: "Mz",
                label: "M",
                title: "Эпюра изгибающего момента, Н·м",
              },
              {
                v: "sigma",
                label: "σ",
                title: "Эпюра эквивалентных напряжений по Мизесу, МПа",
              },
              {
                v: "uy",
                label: "v",
                title:
                  "Эпюра прогиба v(x) — значение прогиба в каждой точке элемента, мм. Это число, а не графика смещения схемы.",
              },
            ].map((d) => (
              <button
                key={d.v}
                onClick={() => setShowDiagram(d.v as DiagramKind)}
                title={d.title}
                className={`border py-1.5 text-[10px] font-gost uppercase ${
                  showDiagram === d.v
                    ? "bg-[var(--drawing-accent)] text-white border-[var(--drawing-accent)]"
                    : "border-[var(--drawing-line)] hover:bg-[var(--drawing-paper)]"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <label className="text-[10px] font-gost text-[var(--drawing-line-thin)]">
            Масштаб эпюры
            <input
              type="range"
              min={0.1}
              max={3}
              step={0.1}
              value={diagramScale}
              onChange={(e) => setDiagramScale(parseFloat(e.target.value))}
              className="w-full mt-1"
            />
          </label>

          {result.warnings.length > 0 && (
            <div className="mt-3 p-2 border border-[var(--drawing-accent)] text-[10px] text-[var(--drawing-accent)]">
              {result.warnings.map((w, i) => (
                <p key={i}>⚠ {w}</p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EditorResultsPanel;