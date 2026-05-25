/**
 * Универсальная slide-in панель справа: каталог материалов / сечений / шаблонов.
 * Открывается при выборе в правой панели редактора.
 */
import { useState, useEffect, type ReactNode } from "react";
import Icon from "@/components/ui/icon";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  width?: number;
  children: ReactNode;
}

const CatalogPanel = ({ open, onClose, title, width = 460, children }: Props) => {
  if (!open) return null;
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />
      <aside
        className="fixed top-0 right-0 z-50 h-full bg-[var(--drawing-bg)] border-l-2 border-[var(--drawing-line)] shadow-2xl flex flex-col"
        style={{ width: `min(95vw, ${width}px)` }}
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--drawing-line)] shrink-0">
          <h2 className="font-gost-upright text-sm font-bold uppercase tracking-widest">{title}</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 hover:bg-[var(--drawing-paper)]"
            aria-label="Закрыть"
          >
            <Icon name="X" size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </>
  );
};

// ============================================================
// Материал
// ============================================================

import {
  MATERIAL_GROUPS,
  type MaterialCatalogEntry,
} from "@/lib/cae-catalog";
import type { Material } from "@/lib/cae-model";
import {
  loadUserMaterials as _loadUserMaterials,
  saveUserMaterial as _saveUserMaterial,
  removeUserMaterial as _removeUserMaterial,
} from "@/lib/cae-user-library";

// Реэкспорт под локальными именами (чтобы не конфликтовало с импортом ниже)
const loadUserMaterials = _loadUserMaterials;
const saveUserMaterial = _saveUserMaterial;
const removeUserMaterial = _removeUserMaterial;

interface MaterialPickerProps {
  open: boolean;
  onClose: () => void;
  currentId: string | null;
  onPick: (m: Material) => void;
}

export const MaterialPicker = ({ open, onClose, currentId, onPick }: MaterialPickerProps) => {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"catalog" | "custom">("catalog");

  // custom form
  const [name, setName] = useState("Пользовательский материал");
  const [E, setE] = useState(2.1e11);
  const [G, setG] = useState(8.1e10);
  const [nu, setNu] = useState(0.3);
  const [rho, setRho] = useState(7850);
  const [yld, setYld] = useState(245e6);

  // Пользовательские материалы из localStorage
  const [userMaterials, setUserMaterials] = useState<MaterialCatalogEntry[]>([]);
  useEffect(() => {
    if (open) setUserMaterials(loadUserMaterials());
  }, [open]);

  const applyAndSaveMat = (m: MaterialCatalogEntry) => {
    saveUserMaterial(m);
    setUserMaterials(loadUserMaterials());
    onPick(m as Material);
    onClose();
  };

  const removeMatFromLibrary = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeUserMaterial(id);
    setUserMaterials(loadUserMaterials());
  };

  const ql = q.trim().toLowerCase();
  const filteredGroups = MATERIAL_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter(
      (m) =>
        !ql ||
        m.name.toLowerCase().includes(ql) ||
        (m.gost || "").toLowerCase().includes(ql) ||
        m.id.toLowerCase().includes(ql),
    ),
  })).filter((g) => g.items.length > 0);

  return (
    <CatalogPanel open={open} onClose={onClose} title="Выбор материала" width={520}>
      <div className="flex gap-1 mb-3">
        <button
          onClick={() => setTab("catalog")}
          className={`flex-1 py-2 text-[11px] font-gost uppercase tracking-wider border ${
            tab === "catalog"
              ? "bg-[var(--drawing-line)] text-[var(--drawing-bg)] border-[var(--drawing-line)]"
              : "border-[var(--drawing-line)]"
          }`}
        >
          Каталог ГОСТ
        </button>
        <button
          onClick={() => setTab("custom")}
          className={`flex-1 py-2 text-[11px] font-gost uppercase tracking-wider border ${
            tab === "custom"
              ? "bg-[var(--drawing-line)] text-[var(--drawing-bg)] border-[var(--drawing-line)]"
              : "border-[var(--drawing-line)]"
          }`}
        >
          Свой материал
        </button>
      </div>

      {tab === "catalog" ? (
        <>
          <input
            type="text"
            placeholder="Поиск (например: 40Х, Ст3, чугун…)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="drawing-input mb-4"
          />

          {/* Пользовательские материалы */}
          {userMaterials.length > 0 && (() => {
            const filtered = userMaterials.filter(
              (m) =>
                !ql ||
                (m.name || "").toLowerCase().includes(ql) ||
                m.id.toLowerCase().includes(ql),
            );
            if (filtered.length === 0) return null;
            return (
              <section className="mb-5">
                <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] mb-2">
                  Мои материалы · {filtered.length}
                </p>
                <div className="space-y-1.5">
                  {filtered.map((m) => {
                    const active = currentId === m.id;
                    return (
                      <div key={m.id} className="relative">
                        <button
                          onClick={() => {
                            onPick(m as Material);
                            onClose();
                          }}
                          className={`w-full text-left p-2.5 border ${
                            active
                              ? "border-[var(--drawing-accent)] bg-[var(--drawing-accent)] text-white"
                              : "border-[var(--drawing-accent)] border-dashed hover:bg-[var(--drawing-paper)]"
                          }`}
                        >
                          <span className="font-gost-upright font-bold text-sm leading-tight pr-6 block">
                            {m.name || m.id}
                          </span>
                          <p
                            className={`text-[10px] font-mono mt-1 ${
                              active ? "text-white/80" : "text-[var(--drawing-line-thin)]"
                            }`}
                          >
                            E = {(m.E / 1e9).toFixed(1)} ГПа · σт = {((m.sigma_yield ?? 0) / 1e6).toFixed(0)} МПа · ρ = {m.rho} кг/м³
                          </p>
                        </button>
                        <button
                          onClick={(e) => removeMatFromLibrary(m.id, e)}
                          title="Удалить из библиотеки"
                          className={`absolute top-1.5 right-1.5 p-0.5 ${
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
              <div className="space-y-1.5">
                {g.items.map((m) => {
                  const active = currentId === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        onPick(m as Material);
                        onClose();
                      }}
                      className={`w-full text-left p-2.5 border ${
                        active
                          ? "border-[var(--drawing-accent)] bg-[var(--drawing-accent)] text-white"
                          : "border-[var(--drawing-line)] hover:bg-[var(--drawing-paper)]"
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-gost-upright font-bold text-sm leading-tight">
                          {m.name}
                        </span>
                        {m.gost && (
                          <span className={`font-gost text-[9px] uppercase tracking-wider shrink-0 ${active ? "text-white/70" : "text-[var(--drawing-line-thin)]"}`}>
                            {m.gost}
                          </span>
                        )}
                      </div>
                      <p className={`text-[10px] font-mono mt-1 ${active ? "text-white/80" : "text-[var(--drawing-line-thin)]"}`}>
                        E = {(m.E / 1e9).toFixed(1)} ГПа · σт = {((m.sigma_yield ?? 0) / 1e6).toFixed(0)} МПа · ρ = {m.rho} кг/м³
                      </p>
                      {m.description && (
                        <p className={`text-[10px] mt-1 leading-snug ${active ? "text-white/90" : "text-[var(--drawing-line-thin)]"}`}>
                          {m.description}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      ) : (
        <div className="space-y-3 text-[11px]">
          <p className="text-[var(--drawing-line-thin)] mb-2">
            Введите параметры материала вручную (СИ). Сохранится только в текущей модели.
          </p>
          <div>
            <label className="font-gost text-[10px] uppercase tracking-wider">Название</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="drawing-input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-gost text-[10px] uppercase tracking-wider">E, Па</label>
              <input type="number" value={E} onChange={(e) => setE(parseFloat(e.target.value) || 0)} className="drawing-input font-mono" />
            </div>
            <div>
              <label className="font-gost text-[10px] uppercase tracking-wider">G, Па</label>
              <input type="number" value={G} onChange={(e) => setG(parseFloat(e.target.value) || 0)} className="drawing-input font-mono" />
            </div>
            <div>
              <label className="font-gost text-[10px] uppercase tracking-wider">ν</label>
              <input type="number" step="0.01" value={nu} onChange={(e) => setNu(parseFloat(e.target.value) || 0)} className="drawing-input font-mono" />
            </div>
            <div>
              <label className="font-gost text-[10px] uppercase tracking-wider">ρ, кг/м³</label>
              <input type="number" value={rho} onChange={(e) => setRho(parseFloat(e.target.value) || 0)} className="drawing-input font-mono" />
            </div>
            <div className="col-span-2">
              <label className="font-gost text-[10px] uppercase tracking-wider">σт (предел текучести), Па</label>
              <input type="number" value={yld} onChange={(e) => setYld(parseFloat(e.target.value) || 0)} className="drawing-input font-mono" />
            </div>
          </div>
          <button
            onClick={() => {
              const m: MaterialCatalogEntry = {
                id: `custom_mat_${Date.now()}`,
                name,
                E, G, nu, rho,
                sigma_yield: yld,
                category: "custom",
              };
              applyAndSaveMat(m);
            }}
            className="btn-drawing btn-drawing-accent w-full text-xs justify-center"
          >
            Создать и&nbsp;сохранить в&nbsp;«Мои материалы»
          </button>
        </div>
      )}
    </CatalogPanel>
  );
};

// ============================================================
// Сечение
// ============================================================

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

interface SectionPickerProps {
  open: boolean;
  onClose: () => void;
  currentId: string | null;
  onPick: (s: Section) => void;
}

export const SectionPicker = ({ open, onClose, currentId, onPick }: SectionPickerProps) => {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"catalog" | "rect" | "circle" | "rect_pipe">("catalog");

  const [rectB, setRectB] = useState(0.05);
  const [rectH, setRectH] = useState(0.1);
  const [circD, setCircD] = useState(0.06);
  const [rpB, setRpB] = useState(0.08);
  const [rpH, setRpH] = useState(0.12);
  const [rpT, setRpT] = useState(0.005);

  // Пользовательские сечения из localStorage
  const [userSections, setUserSections] = useState<SectionCatalogEntry[]>([]);
  useEffect(() => {
    if (open) setUserSections(loadUserSections());
  }, [open]);

  // Хелпер: применить сечение, сохранить в библиотеку, закрыть
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
    <CatalogPanel open={open} onClose={onClose} title="Выбор сечения" width={560}>
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

          {/* Пользовательские сечения */}
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
                            A={(s.A * 1e4).toFixed(2)} см² · Iz={((s.I_z ?? 0) * 1e8).toFixed(0)} см⁴
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
                        A={(s.A * 1e4).toFixed(2)} см²
                        {" · "}
                        Iz={(((s.I_z ?? 0) * 1e8).toFixed(0))} см⁴
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
    </CatalogPanel>
  );
};

const SectionPreview = ({ s }: { s: Section }) => (
  <div className="border border-[var(--drawing-line)] p-2 bg-[var(--drawing-paper)] text-[10px] font-mono space-y-0.5">
    <p>A = {(s.A * 1e4).toFixed(3)} см²</p>
    <p>Iz = {((s.I_z ?? 0) * 1e8).toFixed(3)} см⁴ · Wz = {((s.W_z ?? 0) * 1e6).toFixed(3)} см³</p>
    <p>Iy = {((s.I_y ?? 0) * 1e8).toFixed(3)} см⁴ · Wy = {((s.W_y ?? 0) * 1e6).toFixed(3)} см³</p>
    <p>It = {((s.I_t ?? 0) * 1e8).toFixed(3)} см⁴</p>
  </div>
);

export default CatalogPanel;