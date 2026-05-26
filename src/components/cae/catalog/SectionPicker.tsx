import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import {
  SECTION_GROUPS,
  makeRectSection,
  makeCircleSection,
  makeRectPipeSection,
  type SectionCatalogEntry,
} from "@/lib/cae-catalog";
import type { Section } from "@/lib/cae-model";
import {
  loadUserSections,
  saveUserSection,
  removeUserSection,
} from "@/lib/cae-user-library";
import CatalogShell from "./CatalogShell";
import { safeFixed, safeNum } from "@/lib/safe-number";

interface Props {
  open: boolean;
  onClose: () => void;
  currentId: string | null;
  onPick: (s: Section) => void;
}

const SectionPreview = ({ s }: { s: Section }) => (
  <div className="border border-[var(--drawing-line)] p-2 bg-[var(--drawing-paper)] text-[10px] font-mono space-y-0.5">
    <p>A = {safeFixed(safeNum(s.A) * 1e4, 3)} см²</p>
    <p>Iz = {safeFixed(safeNum(s.I_z) * 1e8, 3)} см⁴ · Wz = {safeFixed(safeNum(s.W_z) * 1e6, 3)} см³</p>
    <p>Iy = {safeFixed(safeNum(s.I_y) * 1e8, 3)} см⁴ · Wy = {safeFixed(safeNum(s.W_y) * 1e6, 3)} см³</p>
    <p>It = {safeFixed(safeNum(s.I_t) * 1e8, 3)} см⁴</p>
  </div>
);

const SectionPicker = ({ open, onClose, currentId, onPick }: Props) => {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"catalog" | "rect" | "circle" | "rect_pipe">("catalog");

  const [rectB, setRectB] = useState(0.05);
  const [rectH, setRectH] = useState(0.1);
  const [circD, setCircD] = useState(0.06);
  const [rpB, setRpB] = useState(0.08);
  const [rpH, setRpH] = useState(0.12);
  const [rpT, setRpT] = useState(0.005);

  const [userSections, setUserSections] = useState<SectionCatalogEntry[]>([]);
  useEffect(() => {
    if (open) setUserSections(loadUserSections());
  }, [open]);

  const applyAndSave = (s: SectionCatalogEntry) => {
    saveUserSection(s);
    setUserSections(loadUserSections());
    onPick(s as Section);
    onClose();
  };

  const removeFromLibrary = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeUserSection(id);
    setUserSections(loadUserSections());
  };

  const ql = q.trim().toLowerCase();
  const filteredGroups = SECTION_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter(
      (s) => !ql || s.name.toLowerCase().includes(ql) || s.id.toLowerCase().includes(ql),
    ),
  })).filter((g) => g.items.length > 0);

  const tabs = [
    { v: "catalog", label: "Каталог" },
    { v: "rect", label: "Прямоуг." },
    { v: "circle", label: "Круг" },
    { v: "rect_pipe", label: "Профтруба" },
  ];

  return (
    <CatalogShell open={open} onClose={onClose} title="Выбор сечения" width={560}>
      <div className="grid grid-cols-4 gap-1 mb-3">
        {tabs.map((t) => (
          <button
            key={t.v}
            onClick={() => setTab(t.v as typeof tab)}
            className={`py-2 text-[10px] font-gost uppercase tracking-wider border ${
              tab === t.v
                ? "bg-[var(--drawing-line)] text-[var(--drawing-bg)] border-[var(--drawing-line)]"
                : "border-[var(--drawing-line)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "catalog" && (
        <>
          <input
            type="text"
            placeholder="Поиск (I20, U24, L100×8, ⌀57…)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="drawing-input mb-4"
          />

          {userSections.length > 0 && (() => {
            const filtered = userSections.filter(
              (s) =>
                !ql ||
                s.name.toLowerCase().includes(ql) ||
                s.id.toLowerCase().includes(ql),
            );
            if (filtered.length === 0) return null;
            return (
              <section className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-accent)]">
                    Мои сечения · {filtered.length}
                  </p>
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {filtered.map((s) => {
                    const active = currentId === s.id;
                    return (
                      <div key={s.id} className="relative">
                        <button
                          onClick={() => {
                            onPick(s as Section);
                            onClose();
                          }}
                          className={`w-full text-left p-2 border ${
                            active
                              ? "border-[var(--drawing-accent)] bg-[var(--drawing-accent)] text-white"
                              : "border-[var(--drawing-accent)] border-dashed hover:bg-[var(--drawing-paper)]"
                          }`}
                        >
                          <p className="font-gost-upright font-bold text-[12px] leading-tight pr-6">
                            {s.name || s.id}
                          </p>
                          <p
                            className={`text-[10px] font-mono mt-0.5 ${
                              active ? "text-white/85" : "text-[var(--drawing-line-thin)]"
                            }`}
                          >
                            A={safeFixed(safeNum(s.A) * 1e4, 2)} см² · Iz={safeFixed(safeNum(s.I_z) * 1e8, 0)} см⁴
                          </p>
                        </button>
                        <button
                          onClick={(e) => removeFromLibrary(s.id, e)}
                          title="Удалить из библиотеки"
                          className={`absolute top-1 right-1 p-0.5 ${
                            active
                              ? "text-white hover:text-white/70"
                              : "text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)]"
                          }`}
                        >
                          <Icon name="X" size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })()}

          {filteredGroups.map((g) => (
            <section key={g.id} className="mb-5">
              <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-2">
                {g.name}
              </p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {g.items.map((s) => {
                  const active = currentId === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        onPick(s as Section);
                        onClose();
                      }}
                      className={`text-left p-2 border ${
                        active
                          ? "border-[var(--drawing-accent)] bg-[var(--drawing-accent)] text-white"
                          : "border-[var(--drawing-line)] hover:bg-[var(--drawing-paper)]"
                      }`}
                    >
                      <p className="font-gost-upright font-bold text-[12px] leading-tight">{s.id}</p>
                      <p className={`text-[10px] font-mono mt-0.5 ${active ? "text-white/85" : "text-[var(--drawing-line-thin)]"}`}>
                        A={safeFixed(safeNum(s.A) * 1e4, 2)} см²
                        {" · "}
                        Iz={safeFixed(safeNum(s.I_z) * 1e8, 0)} см⁴
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      )}

      {tab === "rect" && (
        <div className="space-y-3 text-[11px]">
          <p className="text-[var(--drawing-line-thin)]">
            Прямоугольник сплошной b×h (метры). Программа вычислит A, I, W автоматически.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-gost text-[10px] uppercase">b (ширина), м</label>
              <input type="number" step="0.005" value={rectB} onChange={(e) => setRectB(parseFloat(e.target.value) || 0)} className="drawing-input font-mono" />
            </div>
            <div>
              <label className="font-gost text-[10px] uppercase">h (высота), м</label>
              <input type="number" step="0.005" value={rectH} onChange={(e) => setRectH(parseFloat(e.target.value) || 0)} className="drawing-input font-mono" />
            </div>
          </div>
          <SectionPreview s={makeRectSection(rectB, rectH)} />
          <button
            onClick={() => applyAndSave(makeRectSection(rectB, rectH))}
            className="btn-drawing btn-drawing-accent w-full text-xs justify-center"
          >
            Создать и сохранить в&nbsp;«Мои сечения»
          </button>
        </div>
      )}

      {tab === "circle" && (
        <div className="space-y-3 text-[11px]">
          <p className="text-[var(--drawing-line-thin)]">Круг сплошной диаметром d (метры).</p>
          <div>
            <label className="font-gost text-[10px] uppercase">d (диаметр), м</label>
            <input type="number" step="0.005" value={circD} onChange={(e) => setCircD(parseFloat(e.target.value) || 0)} className="drawing-input font-mono" />
          </div>
          <SectionPreview s={makeCircleSection(circD)} />
          <button
            onClick={() => applyAndSave(makeCircleSection(circD))}
            className="btn-drawing btn-drawing-accent w-full text-xs justify-center"
          >
            Создать и сохранить в&nbsp;«Мои сечения»
          </button>
        </div>
      )}

      {tab === "rect_pipe" && (
        <div className="space-y-3 text-[11px]">
          <p className="text-[var(--drawing-line-thin)]">Профильная труба b×h×t (метры).</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-gost text-[10px] uppercase">b, м</label>
              <input type="number" step="0.005" value={rpB} onChange={(e) => setRpB(parseFloat(e.target.value) || 0)} className="drawing-input font-mono" />
            </div>
            <div>
              <label className="font-gost text-[10px] uppercase">h, м</label>
              <input type="number" step="0.005" value={rpH} onChange={(e) => setRpH(parseFloat(e.target.value) || 0)} className="drawing-input font-mono" />
            </div>
            <div>
              <label className="font-gost text-[10px] uppercase">t, м</label>
              <input type="number" step="0.001" value={rpT} onChange={(e) => setRpT(parseFloat(e.target.value) || 0)} className="drawing-input font-mono" />
            </div>
          </div>
          <SectionPreview s={makeRectPipeSection(rpB, rpH, rpT)} />
          <button
            onClick={() => applyAndSave(makeRectPipeSection(rpB, rpH, rpT))}
            className="btn-drawing btn-drawing-accent w-full text-xs justify-center"
          >
            Создать и сохранить в&nbsp;«Мои сечения»
          </button>
        </div>
      )}
    </CatalogShell>
  );
};

export default SectionPicker;