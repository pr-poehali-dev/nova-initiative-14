/**
 * Мобильный HUD (heads-up display) поверх канваса CAE-редактора.
 *
 * Заменяет на телефоне отдельные блоки левой панели («Инструменты»,
 * «Сетка», «Вид») и систему вкладок. Все частые действия собраны в
 * вертикальный столбец иконок внизу-слева канваса; каждая открывает
 * bottom-sheet в чертёжном стиле. Дополнительно есть две кнопки-якоря
 * (к проверкам / к результатам) — плавно скроллят к блокам под канвасом.
 *
 * Отображается только на мобильной ширине (обёрнут в lg:hidden родителем).
 */
import { useState } from "react";
import Icon from "@/components/ui/icon";
import type { EditorMode } from "@/components/cae/FrameCanvas";
import { safeFixed } from "@/lib/safe-number";

type Sheet = "tool" | "grid" | "view" | null;

const TOOLS: { v: EditorMode; label: string; icon: string }[] = [
  { v: "draw-node", label: "Узел", icon: "Circle" },
  { v: "draw-element", label: "Балка", icon: "Minus" },
  { v: "select", label: "Выбор", icon: "MousePointer" },
];

const GRID_STEPS = [0.1, 0.25, 0.5, 1];

interface Props {
  mode: EditorMode;
  setMode: (m: EditorMode) => void;
  gridStep: number;
  setGridStep: (g: number) => void;
  arrowScale: number;
  setArrowScale: (v: number) => void;
  fontScale: number;
  setFontScale: (v: number) => void;
  onResetView: () => void;
}

/** Прокрутка к блоку под канвасом по id (проверки / результаты). */
const scrollToAnchor = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

export default function MobileCanvasHud({
  mode,
  setMode,
  gridStep,
  setGridStep,
  arrowScale,
  setArrowScale,
  fontScale,
  setFontScale,
  onResetView,
}: Props) {
  const [sheet, setSheet] = useState<Sheet>(null);

  const currentTool = TOOLS.find((t) => t.v === mode) ?? TOOLS[2];

  const hudBtn =
    "min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)]/95 text-[var(--drawing-line)] shadow-md active:bg-[var(--drawing-paper)] transition";

  return (
    <div className="lg:hidden">
      {/* ── Столбец HUD-иконок внизу-слева. bottom-20 — выше кнопки «Рассчитать» ── */}
      <div className="absolute bottom-4 left-2 z-30 flex flex-col gap-1.5">
        {/* Текущий инструмент → открыть выбор */}
        <button
          type="button"
          onClick={() => setSheet("tool")}
          aria-label={`Инструмент: ${currentTool.label}`}
          title={`Инструмент: ${currentTool.label}`}
          className={`${hudBtn} ${
            mode !== "select"
              ? "!border-[var(--drawing-accent)] !text-[var(--drawing-accent)]"
              : ""
          }`}
        >
          <Icon name={currentTool.icon} size={18} />
          <span className="font-gost text-[8px] uppercase tracking-wider">
            {currentTool.label}
          </span>
        </button>

        {/* Сетка */}
        <button
          type="button"
          onClick={() => setSheet("grid")}
          aria-label="Шаг сетки"
          title="Шаг сетки"
          className={hudBtn}
        >
          <Icon name="Grid3x3" size={18} />
          <span className="font-mono text-[8px]">{gridStep}м</span>
        </button>

        {/* Вид */}
        <button
          type="button"
          onClick={() => setSheet("view")}
          aria-label="Вид схемы"
          title="Размер стрелок и шрифта"
          className={hudBtn}
        >
          <Icon name="SlidersHorizontal" size={18} />
          <span className="font-gost text-[8px] uppercase tracking-wider">Вид</span>
        </button>

        {/* Якорь: к проверкам */}
        <button
          type="button"
          onClick={() => scrollToAnchor("mobile-checks")}
          aria-label="К проверкам"
          title="Перейти к проверкам прочности"
          className={hudBtn}
        >
          <Icon name="ShieldCheck" size={18} />
        </button>

        {/* Якорь: к результатам / эпюрам */}
        <button
          type="button"
          onClick={() => scrollToAnchor("mobile-results")}
          aria-label="К результатам"
          title="Перейти к результатам и эпюрам"
          className={hudBtn}
        >
          <Icon name="BarChart3" size={18} />
        </button>
      </div>

      {/* ── Bottom-sheet: выбор инструмента ── */}
      {sheet === "tool" && (
        <BottomSheet title="Инструмент" onClose={() => setSheet(null)}>
          <div className="grid grid-cols-3 gap-2">
            {TOOLS.map((t) => {
              const active = mode === t.v;
              return (
                <button
                  key={t.v}
                  type="button"
                  onClick={() => {
                    setMode(t.v);
                    setSheet(null);
                  }}
                  aria-pressed={active}
                  className={`min-h-[64px] flex flex-col items-center justify-center gap-1 border-2 font-gost uppercase tracking-wider text-[11px] transition ${
                    active
                      ? "bg-[var(--drawing-accent)] text-white border-[var(--drawing-accent)]"
                      : "border-[var(--drawing-line)] active:bg-[var(--drawing-paper)]"
                  }`}
                >
                  <Icon name={t.icon} size={20} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
          <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] mt-3 leading-relaxed">
            {mode === "draw-node" && "Тап по холсту — добавить узел"}
            {mode === "draw-element" && "Тап на 2 узла подряд — провести балку"}
            {mode === "select" &&
              "Тап — выбрать. Удержание пальца на объекте — свойства."}
          </p>
        </BottomSheet>
      )}

      {/* ── Bottom-sheet: шаг сетки ── */}
      {sheet === "grid" && (
        <BottomSheet title="Шаг сетки" onClose={() => setSheet(null)}>
          <div className="grid grid-cols-4 gap-2">
            {GRID_STEPS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  setGridStep(g);
                  setSheet(null);
                }}
                aria-pressed={gridStep === g}
                className={`min-h-[48px] border-2 text-[12px] font-mono transition ${
                  gridStep === g
                    ? "bg-[var(--drawing-line)] text-[var(--drawing-bg)] border-[var(--drawing-line)]"
                    : "border-[var(--drawing-line)] active:bg-[var(--drawing-paper)]"
                }`}
              >
                {g} м
              </button>
            ))}
          </div>
        </BottomSheet>
      )}

      {/* ── Bottom-sheet: вид (стрелки/шрифт/сброс) ── */}
      {sheet === "view" && (
        <BottomSheet title="Вид схемы" onClose={() => setSheet(null)}>
          <label className="block mb-4">
            <div className="flex items-center justify-between text-[11px] font-gost text-[var(--drawing-line-thin)] mb-1">
              <span>Размер стрелок</span>
              <span className="font-mono">{safeFixed(arrowScale, 2, "1.00")}×</span>
            </div>
            <input
              type="range"
              min={0.3}
              max={3}
              step={0.05}
              value={arrowScale}
              onChange={(e) => setArrowScale(parseFloat(e.target.value))}
              className="w-full accent-[var(--drawing-accent)]"
              aria-label="Размер стрелок нагрузок и реакций"
            />
          </label>
          <label className="block mb-4">
            <div className="flex items-center justify-between text-[11px] font-gost text-[var(--drawing-line-thin)] mb-1">
              <span>Размер шрифта</span>
              <span className="font-mono">{safeFixed(fontScale, 2, "1.00")}×</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2.5}
              step={0.05}
              value={fontScale}
              onChange={(e) => setFontScale(parseFloat(e.target.value))}
              className="w-full accent-[var(--drawing-accent)]"
              aria-label="Размер шрифта подписей на схеме"
            />
          </label>
          <button
            type="button"
            onClick={onResetView}
            className="w-full border-2 border-[var(--drawing-line)] min-h-[44px] text-[11px] font-gost uppercase tracking-wider flex items-center justify-center gap-2 active:bg-[var(--drawing-paper)]"
          >
            <Icon name="RotateCcw" size={14} /> Сбросить вид
          </button>
        </BottomSheet>
      )}
    </div>
  );
}

/**
 * Bottom-sheet в чертёжном стиле: тёмная подложка + панель снизу экрана.
 */
function BottomSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />
      <div className="absolute left-0 right-0 bottom-0 bg-[var(--drawing-bg)] border-t-2 border-[var(--drawing-line)] shadow-2xl font-gost animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--drawing-line)]/30">
          <p className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-line)]">
            {title}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center active:bg-[var(--drawing-paper)]"
          >
            <Icon name="X" size={18} />
          </button>
        </div>
        <div className="p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">{children}</div>
      </div>
    </div>
  );
}
