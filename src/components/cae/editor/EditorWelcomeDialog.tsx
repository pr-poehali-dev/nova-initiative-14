/**
 * Стартовый диалог редактора — открывается один раз при первом визите
 * на пустую модель (нет ни узлов, ни элементов). Предлагает три пути:
 *  - Пройти туториал (6 шагов с подсветкой UI)
 *  - Загрузить шаблон (типовая балка / рама)
 *  - Начать с чистого листа
 *
 * Шаблоны — заранее заданные мини-модели для быстрого старта (без расчёта).
 * Флаг показа сохраняется в localStorage.
 */
import Icon from "@/components/ui/icon";
import type { FrameModel } from "@/lib/cae-model";

const STORAGE_KEY = "cae:welcome:shown:v1";

interface Props {
  open: boolean;
  onClose: () => void;
  onStartTutorial: () => void;
  onLoadTemplate: (template: FrameModel) => void;
}

/** Шаблон 1: простая балка на двух опорах с распределённой нагрузкой */
function templateSimpleBeam(): FrameModel {
  return {
    meta: { dim: "2d" },
    materials: [
      {
        id: "steel",
        name: "Сталь C245",
        E: 2.06e11,
        G: 7.9e10,
        nu: 0.3,
        rho: 7850,
        sigma_yield: 2.4e8,
      },
    ],
    sections: [
      {
        id: "i20",
        name: "Двутавр I20",
        A: 26.8e-4,
        I_z: 1840e-8,
        I_y: 115e-8,
        W_z: 184e-6,
        h: 0.2,
      },
    ],
    nodes: [
      { id: "n1", coords: [0, 0, 0] },
      { id: "n2", coords: [6, 0, 0] },
    ],
    elements: [
      { id: "e1", node_start: "n1", node_end: "n2", material_id: "steel", section_id: "i20" },
    ],
    boundary_conditions: [
      { id: "bc1", node_id: "n1", type: "pinned", constrained_dofs: ["ux", "uy"] },
      { id: "bc2", node_id: "n2", type: "roller_x", constrained_dofs: ["uy"] },
    ],
    loads: [
      {
        id: "L1",
        type: "distributed_uniform",
        element_id: "e1",
        load_local_per_length: [0, -10000, 0],
      },
    ],
  };
}

/** Шаблон 2: одноэтажная рама (стойки + ригель) */
function templateFrame(): FrameModel {
  return {
    meta: { dim: "2d" },
    materials: [
      {
        id: "steel",
        name: "Сталь C245",
        E: 2.06e11,
        G: 7.9e10,
        nu: 0.3,
        rho: 7850,
        sigma_yield: 2.4e8,
      },
    ],
    sections: [
      {
        id: "i20",
        name: "Двутавр I20",
        A: 26.8e-4,
        I_z: 1840e-8,
        I_y: 115e-8,
        W_z: 184e-6,
        h: 0.2,
      },
    ],
    nodes: [
      { id: "n1", coords: [0, 0, 0] },
      { id: "n2", coords: [0, 4, 0] },
      { id: "n3", coords: [6, 4, 0] },
      { id: "n4", coords: [6, 0, 0] },
    ],
    elements: [
      { id: "e1", node_start: "n1", node_end: "n2", material_id: "steel", section_id: "i20" },
      { id: "e2", node_start: "n2", node_end: "n3", material_id: "steel", section_id: "i20" },
      { id: "e3", node_start: "n3", node_end: "n4", material_id: "steel", section_id: "i20" },
    ],
    boundary_conditions: [
      { id: "bc1", node_id: "n1", type: "fixed", constrained_dofs: ["ux", "uy", "rz"] },
      { id: "bc2", node_id: "n4", type: "fixed", constrained_dofs: ["ux", "uy", "rz"] },
    ],
    loads: [
      {
        id: "L1",
        type: "distributed_uniform",
        element_id: "e2",
        load_local_per_length: [0, -8000, 0],
      },
    ],
  };
}

/** Шаблон 3: консольная балка */
function templateCantilever(): FrameModel {
  return {
    meta: { dim: "2d" },
    materials: [
      {
        id: "steel",
        name: "Сталь C245",
        E: 2.06e11,
        G: 7.9e10,
        nu: 0.3,
        rho: 7850,
        sigma_yield: 2.4e8,
      },
    ],
    sections: [
      {
        id: "i20",
        name: "Двутавр I20",
        A: 26.8e-4,
        I_z: 1840e-8,
        I_y: 115e-8,
        W_z: 184e-6,
        h: 0.2,
      },
    ],
    nodes: [
      { id: "n1", coords: [0, 0, 0] },
      { id: "n2", coords: [3, 0, 0] },
    ],
    elements: [
      { id: "e1", node_start: "n1", node_end: "n2", material_id: "steel", section_id: "i20" },
    ],
    boundary_conditions: [
      { id: "bc1", node_id: "n1", type: "fixed", constrained_dofs: ["ux", "uy", "rz"] },
    ],
    loads: [
      {
        id: "L1",
        type: "nodal_force",
        node_id: "n2",
        force: [0, -5000, 0],
        moment: [0, 0, 0],
      },
    ],
  };
}

const TEMPLATES = [
  {
    key: "beam",
    title: "Простая балка",
    desc: "Балка 6 м на двух опорах с распределённой нагрузкой 10 кН/м",
    build: templateSimpleBeam,
  },
  {
    key: "frame",
    title: "Одноэтажная рама",
    desc: "Жёсткая рама 6×4 м с распределённой нагрузкой на ригеле",
    build: templateFrame,
  },
  {
    key: "cantilever",
    title: "Консоль",
    desc: "Консольная балка 3 м с сосредоточенной силой 5 кН на конце",
    build: templateCantilever,
  },
];

const EditorWelcomeDialog = ({ open, onClose, onStartTutorial, onLoadTemplate }: Props) => {
  if (!open) return null;

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    onClose();
  };

  const handleTutorial = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    onStartTutorial();
    onClose();
  };

  const handleTemplate = (build: () => FrameModel) => {
    localStorage.setItem(STORAGE_KEY, "1");
    onLoadTemplate(build());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-[var(--drawing-bg)] border-2 border-[var(--drawing-line)] max-w-[760px] w-full max-h-[90vh] overflow-auto shadow-2xl">
        <div className="border-b-2 border-[var(--drawing-line)] px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-gost-upright text-[18px] font-bold text-[var(--drawing-ink)]">
              С чего начнём расчёт?
            </h2>
            <p className="font-gost text-[11px] text-[var(--drawing-line-thin)] mt-1">
              Выберите путь — туториал, готовый шаблон или чистый лист
            </p>
          </div>
          <button onClick={handleSkip} className="p-1 hover:bg-[var(--drawing-paper)]" title="Закрыть">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Туториал */}
          <button
            onClick={handleTutorial}
            className="w-full border-2 border-[var(--drawing-accent)] bg-[var(--drawing-accent)] text-white p-4 flex items-start gap-3 text-left hover:opacity-90 transition"
          >
            <Icon name="GraduationCap" size={28} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-gost-upright text-[14px] font-bold uppercase tracking-wider">
                Пройти туториал
              </p>
              <p className="font-gost text-[12px] opacity-90 mt-1">
                6 шагов: от первого узла до готового PDF-отчёта. ~2 минуты.
              </p>
            </div>
            <Icon name="ChevronRight" size={20} className="shrink-0 mt-1" />
          </button>

          {/* Шаблоны */}
          <div>
            <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-2">
              Готовые шаблоны
            </p>
            <div className="grid md:grid-cols-3 gap-3">
              {TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => handleTemplate(t.build)}
                  className="border-2 border-[var(--drawing-line)] hover:border-[var(--drawing-accent)] bg-[var(--drawing-bg)] p-3 text-left transition"
                >
                  <p className="font-gost-upright text-[13px] font-bold text-[var(--drawing-ink)] mb-1">
                    {t.title}
                  </p>
                  <p className="font-gost text-[11px] text-[var(--drawing-line-thin)] leading-snug">
                    {t.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Пустой лист */}
          <button
            onClick={handleSkip}
            className="w-full border-2 border-dashed border-[var(--drawing-line)] hover:border-[var(--drawing-accent)] bg-[var(--drawing-bg)] p-3 text-[12px] font-gost text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] transition flex items-center justify-center gap-2"
          >
            <Icon name="FilePlus" size={14} />
            Начать с чистого листа
          </button>
        </div>
      </div>
    </div>
  );
};

export function isWelcomeShown(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "1";
}

export default EditorWelcomeDialog;
