/**
 * Плавающие управляющие элементы поверх канваса CAE-редактора.
 *
 * Содержит четыре независимых модуля, которые экономят место на правой
 * боковой панели и держат основные действия рядом со схемой:
 *
 *  1. Иконка валидации модели — зелёная галочка (ок) / красный крестик
 *     (есть ошибки). Клик — разворачивает список проблем; клик по проблеме
 *     фокусирует узел/элемент на канвасе.
 *
 *  2. Иконка вопроса — раскрывает короткую подсказку «Выберите узел/элемент,
 *     чтобы настроить опору, нагрузку…».
 *
 *  3. Кнопка «глаза» — мгновенный переключатель Исходная ⇄ Деформированная.
 *
 *  4. Кнопка «Эпюры» — открывает выдвижной модуль вдоль правого края экрана
 *     со всеми видами эпюр (N, Q, M, σ, v) и регулировкой масштаба.
 *     Активен только после успешного расчёта.
 */
import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import type { ValidationIssue } from "@/lib/cae-validate";
import type { DiagramKind } from "@/components/cae/FrameCanvas";

interface Props {
  issues: ValidationIssue[];
  onFocusNode: (id: string) => void;
  onFocusElement: (id: string) => void;

  /** Доступен ли просмотр диаграмм/деформации (после расчёта). */
  hasResult: boolean;
  showDiagram: DiagramKind;
  setShowDiagram: (d: DiagramKind) => void;
  diagramScale: number;
  setDiagramScale: (v: number) => void;
}

type Panel = "issues" | "hint" | "diagrams" | null;

const DIAGRAMS: { v: DiagramKind; label: string; title: string }[] = [
  { v: "N", label: "N", title: "Эпюра продольной (осевой) силы, Н" },
  { v: "Qy", label: "Q", title: "Эпюра поперечной силы, Н" },
  { v: "Mz", label: "M", title: "Эпюра изгибающего момента, Н·м" },
  { v: "sigma", label: "σ", title: "Эпюра эквивалентных напряжений, МПа" },
  { v: "uy", label: "v", title: "Эпюра прогиба v(x), мм" },
];

const DIAGRAM_LABELS: Record<DiagramKind, string> = {
  none: "Исходная",
  deformed: "Деформированная",
  N: "Эпюра N — продольная сила",
  Qy: "Эпюра Q — поперечная сила",
  Mz: "Эпюра M — изгибающий момент",
  sigma: "Эпюра σ — эквивалентные напряжения",
  uy: "Эпюра v — прогиб",
};

export default function CanvasFloatingControls({
  issues,
  onFocusNode,
  onFocusElement,
  hasResult,
  showDiagram,
  setShowDiagram,
  diagramScale,
  setDiagramScale,
}: Props) {
  const [open, setOpen] = useState<Panel>(null);

  // Позиция перетаскиваемой панели эпюр (px относительно канваса).
  // null → панель «прилеплена» к правому краю (поведение по умолчанию).
  const [diagPos, setDiagPos] = useState<{ left: number; top: number } | null>(null);

  // Сбрасываем позицию при закрытии панели — следующий раз откроется у края.
  useEffect(() => {
    if (open !== "diagrams") setDiagPos(null);
  }, [open]);

  // Старт перетаскивания за шапку панели эпюр (только десктоп).
  const onDiagDragStart = (e: React.PointerEvent) => {
    if (!window.matchMedia("(min-width: 768px)").matches) return;
    if (e.button !== 0) return;
    const panel = (e.currentTarget as HTMLElement).parentElement;
    const container = panel?.offsetParent as HTMLElement | null;
    if (!panel || !container) return;
    const panelRect = panel.getBoundingClientRect();
    const contRect = container.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const baseLeft = panelRect.left - contRect.left;
    const baseTop = panelRect.top - contRect.top;
    const maxLeft = container.clientWidth - panel.offsetWidth - 4;
    const maxTop = container.clientHeight - 40;
    const onMove = (ev: PointerEvent) => {
      const left = Math.min(maxLeft, Math.max(4, baseLeft + (ev.clientX - startX)));
      const top = Math.min(maxTop, Math.max(4, baseTop + (ev.clientY - startY)));
      setDiagPos({ left, top });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");
  const isValid = errors.length === 0;
  const totalIssues = issues.length;

  // Закрытие открытой панели по Escape — стандартное UX-ожидание
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isDeformed = showDiagram === "deformed";
  // Деформация работает только когда модель посчитана.
  // Клик по глазу переключает между «исходной» и «деформированной».
  const toggleEye = () => {
    if (!hasResult) return;
    setShowDiagram(isDeformed ? "none" : "deformed");
  };

  const handleFocusIssue = (it: ValidationIssue) => {
    if (it.nodeId) onFocusNode(it.nodeId);
    else if (it.elementId) onFocusElement(it.elementId);
    setOpen(null);
  };

  return (
    <>
      {/* ── Вертикальный столбец иконок справа сверху ── */}
      <div className="absolute top-2 right-2 z-20 flex flex-col gap-1">
        {/* Валидация */}
        <button
          type="button"
          onClick={() => setOpen(open === "issues" ? null : "issues")}
          aria-label={isValid ? "Модель корректна" : `Проблем: ${totalIssues}`}
          title={isValid ? "Модель корректна" : `Проблем: ${totalIssues} — посмотреть`}
          className={`relative min-w-[40px] min-h-[40px] flex items-center justify-center border-[1.5px] bg-[var(--drawing-bg)] shadow-sm transition-colors ${
            isValid
              ? "border-[#1a8a5a] text-[#1a8a5a] hover:bg-[#1a8a5a]/10"
              : "border-[var(--drawing-accent)] text-[var(--drawing-accent)] hover:bg-[var(--drawing-accent)]/10"
          }`}
        >
          <Icon name={isValid ? "CircleCheck" : "CircleX"} size={20} />
          {!isValid && (
            <span className="absolute -top-1 -right-1 bg-[var(--drawing-accent)] text-white text-[9px] font-bold min-w-[16px] h-[16px] rounded-full flex items-center justify-center px-1">
              {totalIssues}
            </span>
          )}
        </button>

        {/* Подсказка */}
        <button
          type="button"
          onClick={() => setOpen(open === "hint" ? null : "hint")}
          aria-label="Подсказка"
          title="Подсказка"
          className="min-w-[40px] min-h-[40px] flex items-center justify-center border-[1.5px] border-[var(--drawing-line)] text-[var(--drawing-line)] bg-[var(--drawing-bg)] shadow-sm hover:bg-[var(--drawing-paper)] transition-colors"
        >
          <Icon name="HelpCircle" size={20} />
        </button>

        {/* Глаз — переключает «исходная/деформированная» */}
        <button
          type="button"
          onClick={toggleEye}
          disabled={!hasResult}
          aria-label={isDeformed ? "Скрыть деформированную схему" : "Показать деформированную схему"}
          title={
            !hasResult
              ? "Сначала запустите расчёт"
              : isDeformed
                ? "Сейчас показана деформированная — кликните, чтобы вернуть исходную"
                : "Показать деформированную схему"
          }
          className={`min-w-[40px] min-h-[40px] flex items-center justify-center border-[1.5px] bg-[var(--drawing-bg)] shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            isDeformed
              ? "border-[var(--drawing-accent)] text-[var(--drawing-accent)] bg-[var(--drawing-accent)]/10"
              : "border-[var(--drawing-line)] text-[var(--drawing-line)] hover:bg-[var(--drawing-paper)]"
          }`}
        >
          <Icon name={isDeformed ? "Eye" : "EyeOff"} size={20} />
        </button>

        {/* Эпюры */}
        <button
          type="button"
          onClick={() => setOpen(open === "diagrams" ? null : "diagrams")}
          disabled={!hasResult}
          aria-label="Эпюры"
          title={hasResult ? "Эпюры N / Q / M / σ / v" : "Сначала запустите расчёт"}
          className={`min-w-[40px] min-h-[40px] flex items-center justify-center border-[1.5px] bg-[var(--drawing-bg)] shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            ["N", "Qy", "Mz", "sigma", "uy"].includes(showDiagram)
              ? "border-[var(--drawing-accent)] text-[var(--drawing-accent)] bg-[var(--drawing-accent)]/10"
              : "border-[var(--drawing-line)] text-[var(--drawing-line)] hover:bg-[var(--drawing-paper)]"
          }`}
        >
          <Icon name="LineChart" size={20} />
        </button>
      </div>

      {/* ── Поповер: проблемы ── */}
      {open === "issues" && (
        <Popover onClose={() => setOpen(null)} title={isValid ? "Модель корректна" : "Проблемы модели"}>
          {isValid ? (
            <p className="text-xs text-[#1a8a5a] flex items-center gap-2">
              <Icon name="CircleCheck" size={14} />
              Можно запускать расчёт
            </p>
          ) : (
            <div className="max-h-[40vh] overflow-y-auto -mx-3">
              {[...errors, ...warnings].map((it, idx) => {
                const isError = it.level === "error";
                const clickable = !!(it.nodeId || it.elementId);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => clickable && handleFocusIssue(it)}
                    disabled={!clickable}
                    className={`w-full text-left px-3 py-2 border-b border-dashed border-[var(--drawing-line)]/30 ${
                      clickable ? "cursor-pointer hover:bg-[var(--drawing-paper)]" : "cursor-default"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Icon
                        name={isError ? "CircleX" : "TriangleAlert"}
                        size={14}
                        className={`mt-0.5 shrink-0 ${isError ? "text-[var(--drawing-accent)]" : "text-amber-700"}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-gost leading-snug ${isError ? "text-[var(--drawing-accent)]" : "text-amber-800"}`}>
                          {it.message}
                        </p>
                        {it.hint && (
                          <p className="text-[10px] text-[var(--drawing-line-thin)] mt-0.5 leading-snug">
                            {it.hint}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Popover>
      )}

      {/* ── Поповер: подсказка ── */}
      {open === "hint" && (
        <Popover onClose={() => setOpen(null)} title="Подсказка">
          <p className="text-xs leading-relaxed text-[var(--drawing-line-thin)]">
            Чтобы настроить узел или балку — откройте свойства:
          </p>

          {/* ПК-подсказки: правый клик, клавиатура */}
          <ul className="mt-2 space-y-1 text-[11px] text-[var(--drawing-line-thin)] hidden md:block">
            <li className="flex gap-2"><Icon name="MousePointer2" size={11} className="mt-0.5 shrink-0" /> <strong>Правый клик</strong> по&nbsp;узлу/балке&nbsp;&mdash; свойства</li>
            <li className="flex gap-2"><Icon name="MousePointer" size={11} className="mt-0.5 shrink-0" /> Обычный клик&nbsp;&mdash; выделить</li>
            <li className="flex gap-2"><Icon name="MousePointer" size={11} className="mt-0.5 shrink-0" /> Двойной клик в&nbsp;пустом месте&nbsp;&mdash; новый узел</li>
            <li className="flex gap-2"><Icon name="Keyboard" size={11} className="mt-0.5 shrink-0" /> Delete&nbsp;&mdash; удалить выбранное, Ctrl+Z&nbsp;&mdash; отменить</li>
          </ul>
          {/* На ПК сообщаем, что доступна и мобильная версия */}
          <p className="mt-2 text-[11px] font-gost text-[var(--drawing-accent)] leading-snug hidden md:block">
            <Icon name="Smartphone" size={11} className="inline mr-1 -mt-0.5" />
            Программой можно пользоваться даже с телефона.
          </p>

          {/* Мобильные подсказки: жесты пальцем */}
          <ul className="mt-2 space-y-1 text-[11px] text-[var(--drawing-line-thin)] md:hidden">
            <li className="flex gap-2"><Icon name="Hand" size={11} className="mt-0.5 shrink-0" /> <strong>Удержать палец</strong> на&nbsp;узле/балке ~0.5с&nbsp;&mdash; свойства</li>
            <li className="flex gap-2"><Icon name="Pointer" size={11} className="mt-0.5 shrink-0" /> Обычный тап&nbsp;&mdash; выделить</li>
            <li className="flex gap-2"><Icon name="Pointer" size={11} className="mt-0.5 shrink-0" /> Двойной тап в&nbsp;пустом месте&nbsp;&mdash; новый узел</li>
          </ul>
        </Popover>
      )}

      {/* ── Выдвижная панель эпюр (перетаскиваемая на ПК) ── */}
      {open === "diagrams" && (
        <div
          className="absolute z-30 w-[260px] max-w-[calc(100vw-72px)] bg-[var(--drawing-bg)] border-[1.5px] border-[var(--drawing-accent)] shadow-lg"
          style={
            diagPos
              ? { left: diagPos.left, top: diagPos.top }
              : { top: 8, right: 52 }
          }
        >
          <div
            onPointerDown={onDiagDragStart}
            className="flex items-center justify-between px-3 py-2 border-b border-[var(--drawing-accent)]/40 bg-[var(--drawing-accent)]/5 md:cursor-grab md:active:cursor-grabbing select-none"
            style={{ touchAction: "none" }}
          >
            <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] flex items-center gap-1.5">
              <Icon name="GripVertical" size={12} className="hidden md:inline opacity-50" />
              Эпюры
            </p>
            <button
              type="button"
              onClick={() => setOpen(null)}
              aria-label="Закрыть"
              className="p-1 hover:bg-[var(--drawing-line)]/10"
            >
              <Icon name="X" size={12} />
            </button>
          </div>
          <div className="p-3 space-y-3">
            {/* Текущее состояние */}
            <p className="text-[11px] text-[var(--drawing-line-thin)] leading-snug">
              Сейчас:{" "}
              <strong className="text-[var(--drawing-line)]">
                {DIAGRAM_LABELS[showDiagram]}
              </strong>
            </p>

            {/* Сетка эпюр */}
            <div>
              <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-1.5">
                Эпюра вдоль элемента
              </p>
              <div className="grid grid-cols-5 gap-1">
                {DIAGRAMS.map((d) => (
                  <button
                    key={d.v}
                    type="button"
                    onClick={() => setShowDiagram(d.v)}
                    title={d.title}
                    className={`border-[1.5px] py-2 text-xs font-gost-upright font-bold uppercase ${
                      showDiagram === d.v
                        ? "bg-[var(--drawing-accent)] text-white border-[var(--drawing-accent)]"
                        : "border-[var(--drawing-line)] hover:bg-[var(--drawing-paper)]"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Масштаб */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
                  Масштаб эпюры
                </span>
                <span className="font-mono text-[10px] text-[var(--drawing-line)]">
                  {diagramScale.toFixed(1)}×
                </span>
              </div>
              <input
                type="range"
                min={0.1}
                max={3}
                step={0.1}
                value={diagramScale}
                onChange={(e) => setDiagramScale(parseFloat(e.target.value))}
                className="w-full accent-[var(--drawing-accent)]"
              />
            </div>

            {/* Скрыть эпюру */}
            <button
              type="button"
              onClick={() => setShowDiagram("none")}
              className="btn-drawing text-[10px] w-full justify-center"
            >
              <Icon name="EyeOff" size={11} className="mr-1" />
              Скрыть эпюру
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Локальный поповер, прикреплённый к правому краю канваса.
 * Используем абсолютное позиционирование внутри относительного враппера канваса —
 * это даёт мобильное и десктопное поведение без отдельной библиотеки.
 */
function Popover({
  onClose,
  title,
  children,
}: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="absolute top-2 right-[52px] z-30 w-[280px] max-w-[calc(100vw-72px)] bg-[var(--drawing-bg)] border-[1.5px] border-[var(--drawing-line)] shadow-lg">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--drawing-line)]/30">
        <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line)]">
          {title}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="p-1 hover:bg-[var(--drawing-line)]/10"
        >
          <Icon name="X" size={12} />
        </button>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}