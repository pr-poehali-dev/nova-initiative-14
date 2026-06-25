/**
 * Модалка подбора сечений по балкам («Балки»).
 *
 * Показывает список всех стержней модели. По каждому:
 *  - текущее сечение + выпадающий выбор из сортамента (SECTION_CATALOG);
 *  - запас прочности из расчёта (зелёный ≥1, красный <1), если расчёт был;
 *  - длина и масса погонного метра.
 * Снизу — суммарная масса конструкции. У каждой строки кнопка
 * «Применить ко всем» ставит её сечение всем остальным балкам.
 *
 * Открывается по кнопке (в основном CAE и в виджете) и автоматически
 * после расчёта, если у каких-то балок недостаточный запас прочности.
 *
 * Инлайновые нейтральные стили — чтобы одинаково работать и во встроенном
 * виджете на чужом сайте, и в основном редакторе.
 */
import { useMemo } from "react";
import Icon from "@/components/ui/icon";
import { SECTION_CATALOG, SECTION_GROUPS, findSection } from "@/data/cae-sections";
import {
  elementLength,
  elementRho,
  massPerMeter,
  elementSection,
  elementSafety,
  totalMass,
} from "@/lib/cae/beams";
import type { FrameModel, Section, SolverResponse } from "@/lib/cae-model";

interface Props {
  open: boolean;
  onClose: () => void;
  model: FrameModel;
  result: SolverResponse | null;
  /** Назначить сечение конкретной балке. */
  onSetSection: (elementId: string, sec: Section) => void;
  /** Назначить сечение всем балкам. */
  onApplyToAll: (sec: Section) => void;
}

function fmtMass(kg: number): string {
  if (kg >= 1000) return (kg / 1000).toFixed(2) + " т";
  return kg.toFixed(1) + " кг";
}

export default function BeamSectionsModal({
  open,
  onClose,
  model,
  result,
  onSetSection,
  onApplyToAll,
}: Props) {
  const rows = useMemo(
    () =>
      model.elements.map((el, i) => {
        const sec = elementSection(model, el);
        const rho = elementRho(model, el);
        const len = elementLength(model, el);
        const mpm = sec ? massPerMeter(sec, rho) : 0;
        const safety = elementSafety(result, el.id);
        return {
          el,
          index: i + 1,
          label: el.label || el.id,
          sectionId: sec?.id ?? "",
          sectionName: sec?.name ?? "—",
          length: len,
          massPerM: mpm,
          mass: mpm * len,
          safety,
        };
      }),
    [model, result],
  );

  const total = useMemo(() => totalMass(model), [model]);
  const hasResult = !!result?.elements?.length;

  if (!open) return null;

  const pick = (elementId: string, secId: string) => {
    const sec = findSection(secId) || SECTION_CATALOG.find((s) => s.id === secId);
    if (sec) onSetSection(elementId, sec);
  };

  const applyAll = (secId: string) => {
    const sec = findSection(secId) || SECTION_CATALOG.find((s) => s.id === secId);
    if (sec) onApplyToAll(sec);
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.header}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="Construction" size={18} className="text-[#2563eb]" />
            <span style={{ fontWeight: 700, fontSize: 16 }}>Балки и сечения</span>
          </div>
          <button style={S.close} onClick={onClose} aria-label="Закрыть">
            <Icon name="X" size={18} />
          </button>
        </div>

        <p style={S.hint}>
          Подберите профиль для каждой балки. Кнопка «Ко всем» применяет выбранное
          сечение ко всем балкам сразу.
          {hasResult && " Цвет показывает запас прочности по расчёту."}
        </p>

        <div style={S.list}>
          {rows.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>
              В схеме пока нет балок.
            </div>
          )}
          {rows.map((r) => {
            const danger = r.safety != null && r.safety < 1;
            return (
              <div key={r.el.id} style={S.row}>
                <div style={S.rowTop}>
                  <span style={S.beamLabel}>Балка {r.label}</span>
                  {r.safety != null && (
                    <span
                      style={{
                        ...S.safety,
                        background: danger ? "#fdecec" : "#e8f7ee",
                        color: danger ? "#c0392b" : "#1a7f4b",
                      }}
                    >
                      <Icon name={danger ? "TriangleAlert" : "CircleCheck"} size={12} />
                      Запас {r.safety.toFixed(2)}
                    </span>
                  )}
                </div>

                <div style={S.rowControls}>
                  <select
                    style={S.select}
                    value={r.sectionId}
                    onChange={(e) => pick(r.el.id, e.target.value)}
                  >
                    {!r.sectionId && <option value="">{r.sectionName}</option>}
                    {SECTION_GROUPS.map((g) => (
                      <optgroup key={g.id} label={g.name}>
                        {g.items.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <button
                    style={S.applyBtn}
                    disabled={!r.sectionId}
                    onClick={() => applyAll(r.sectionId)}
                    title="Применить это сечение ко всем балкам"
                  >
                    <Icon name="CopyCheck" size={13} /> Ко всем
                  </button>
                </div>

                <div style={S.meta}>
                  <span>Длина: {r.length.toFixed(2)} м</span>
                  <span>·</span>
                  <span>{r.massPerM.toFixed(1)} кг/м</span>
                  <span>·</span>
                  <span>масса {fmtMass(r.mass)}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={S.footer}>
          <span style={{ fontSize: 13, color: "#6b7280" }}>
            Балок: <strong style={{ color: "#1a1d21" }}>{rows.length}</strong>
          </span>
          <span style={{ fontSize: 14 }}>
            Итого масса:{" "}
            <strong style={{ color: "#1a1d21", fontSize: 16 }}>{fmtMass(total)}</strong>
          </span>
          <button style={S.doneBtn} onClick={onClose}>
            Готово
          </button>
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9998,
    padding: 16,
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  },
  modal: {
    position: "relative",
    background: "#fff",
    color: "#1a1d21",
    borderRadius: 12,
    width: "100%",
    maxWidth: 560,
    maxHeight: "88vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 18px 8px",
  },
  close: { background: "transparent", border: "none", cursor: "pointer", color: "#6b7280" },
  hint: { fontSize: 12.5, color: "#6b7280", padding: "0 18px 10px", lineHeight: 1.4 },
  list: { overflowY: "auto", padding: "0 18px", flex: 1 },
  row: { borderTop: "1px solid #eef0f2", padding: "12px 0" },
  rowTop: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  beamLabel: { fontWeight: 600, fontSize: 14 },
  safety: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 6,
    padding: "2px 8px",
  },
  rowControls: { display: "flex", gap: 8, marginBottom: 6 },
  select: {
    flex: 1,
    minWidth: 0,
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 13,
    background: "#fff",
    outline: "none",
  },
  applyBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    background: "#eef2ff",
    color: "#2563eb",
    border: "1px solid #c7d2fe",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  meta: { display: "flex", gap: 8, fontSize: 12, color: "#9ca3af", flexWrap: "wrap" },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "12px 18px",
    borderTop: "1px solid #eef0f2",
    flexWrap: "wrap",
  },
  doneBtn: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "9px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
};
