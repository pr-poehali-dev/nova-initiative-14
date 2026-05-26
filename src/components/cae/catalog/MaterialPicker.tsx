import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import {
  MATERIAL_GROUPS,
  type MaterialCatalogEntry,
} from "@/lib/cae-catalog";
import type { Material } from "@/lib/cae-model";
import { safeFixed, safeNum } from "@/lib/safe-number";
import {
  loadUserMaterials as _loadUserMaterials,
  saveUserMaterial as _saveUserMaterial,
  removeUserMaterial as _removeUserMaterial,
} from "@/lib/cae-user-library";
import CatalogShell from "./CatalogShell";

const loadUserMaterials = _loadUserMaterials;
const saveUserMaterial = _saveUserMaterial;
const removeUserMaterial = _removeUserMaterial;

interface Props {
  open: boolean;
  onClose: () => void;
  currentId: string | null;
  onPick: (m: Material) => void;
}

const MaterialPicker = ({ open, onClose, currentId, onPick }: Props) => {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"catalog" | "custom">("catalog");

  const [name, setName] = useState("Пользовательский материал");
  const [E, setE] = useState(2.1e11);
  const [G, setG] = useState(8.1e10);
  const [nu, setNu] = useState(0.3);
  const [rho, setRho] = useState(7850);
  const [yld, setYld] = useState(245e6);

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
    <CatalogShell open={open} onClose={onClose} title="Выбор материала" width={520}>
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
                            E = {safeFixed(safeNum(m.E) / 1e9, 1)} ГПа · σт = {safeFixed(safeNum(m.sigma_yield) / 1e6, 0)} МПа · ρ = {safeNum(m.rho)} кг/м³
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
                          <span
                            className={`text-[9px] font-mono shrink-0 ${
                              active ? "text-white/70" : "text-[var(--drawing-line-thin)]"
                            }`}
                          >
                            {m.gost}
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-[10px] font-mono mt-1 ${
                          active ? "text-white/80" : "text-[var(--drawing-line-thin)]"
                        }`}
                      >
                        E = {safeFixed(safeNum(m.E) / 1e9, 0)} ГПа · σт = {safeFixed(safeNum(m.sigma_yield) / 1e6, 0)} МПа · ρ = {safeNum(m.rho)} кг/м³
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      ) : (
        <div className="space-y-3 text-[11px]">
          <p className="text-[var(--drawing-line-thin)]">
            Введите константы материала и сохраните в личную библиотеку. Значения в системе СИ (Па, кг/м³).
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
    </CatalogShell>
  );
};

export default MaterialPicker;