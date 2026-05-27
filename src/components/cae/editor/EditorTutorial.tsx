/**
 * Интерактивный туториал по CAE-редактору.
 * Не использует внешних библиотек — собственная реализация подсветки + tooltip.
 *
 * Архитектура:
 *  - каждый шаг ссылается на DOM-элемент по data-tutorial="key"
 *  - вокруг целевого элемента рисуется «вырез» в полупрозрачной маске (clip-path)
 *  - tooltip позиционируется автоматически с учётом границ окна
 *  - флаг прохождения сохраняется в localStorage
 *
 * Шаги соответствуют типовому первому опыту:
 *  1. Поставить узлы (режим N + клик)
 *  2. Соединить балкой (режим E + 2 клика)
 *  3. Опора (выбор узла + кнопка опоры)
 *  4. Нагрузка (выбор + значение силы)
 *  5. Расчёт (F5 или кнопка)
 *  6. Прочитать результат (эпюра M + PDF)
 */
import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";

const STORAGE_KEY = "cae:tutorial:completed:v1";

export interface TutorialStep {
  /** data-tutorial="..." значение для поиска целевого DOM-элемента */
  target: string;
  title: string;
  body: string;
  /** Где разместить tooltip относительно цели */
  placement?: "top" | "bottom" | "left" | "right";
}

const STEPS: TutorialStep[] = [
  {
    target: "tools",
    title: "Шаг 1 из 6 · Инструменты",
    body:
      "Слева — три режима работы: создание узла, балка, выбор. Активный режим подсвечен. У каждого режима есть горячая клавиша: N — узел, E — балка, S — выбор.",
    placement: "right",
  },
  {
    target: "canvas",
    title: "Шаг 2 из 6 · Поставьте узлы",
    body:
      "В режиме «Узел» (клавиша N) кликните по холсту 2–3 раза, чтобы создать узлы. Они привязываются к сетке. Колесо мыши — зум, Shift+ЛКМ — панорамирование.",
    placement: "left",
  },
  {
    target: "tools",
    title: "Шаг 3 из 6 · Соедините балкой",
    body:
      "Нажмите «Балка» (или клавишу E), затем кликните по двум узлам подряд — между ними появится элемент с материалом и сечением по умолчанию.",
    placement: "right",
  },
  {
    target: "props",
    title: "Шаг 4 из 6 · Опоры и нагрузки",
    body:
      "Кликните по любому узлу в режиме «Выбор» (S). Справа откроется панель свойств: выберите тип опоры (защемление, шарнир) или задайте силу. Без опор расчёт не запустится.",
    placement: "left",
  },
  {
    target: "solve",
    title: "Шаг 5 из 6 · Запуск расчёта",
    body:
      "Когда модель корректна (в панели «Проблемы модели» нет красных ошибок), нажмите «Посчитать» или клавишу F5. Если кнопка серая — посмотрите, какие проблемы перечислены.",
    placement: "bottom",
  },
  {
    target: "results",
    title: "Шаг 6 из 6 · Результаты",
    body:
      "После расчёта переключайте эпюры N / Q / M / σ / v, чтобы увидеть продольные силы, поперечные, моменты, напряжения и прогиб. Кнопка «PDF» выгружает оформленный отчёт.",
    placement: "left",
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;
const TOOLTIP_W = 320;

function getTargetRect(target: string): Rect | null {
  const el = document.querySelector(`[data-tutorial="${target}"]`);
  if (!el) return null;
  const r = (el as HTMLElement).getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/**
 * Прокручивает страницу так, чтобы целевой элемент туториала оказался
 * в видимой области. Если элемент уже виден — ничего не делаем (избегаем «дёргания»).
 * Используется один раз на смену шага.
 */
function scrollTargetIntoView(target: string) {
  const el = document.querySelector(`[data-tutorial="${target}"]`);
  if (!el) return;
  const r = (el as HTMLElement).getBoundingClientRect();
  const vh = window.innerHeight;
  // Запас сверху/снизу — место под тултип
  const TOP_MARGIN = 120;
  const BOTTOM_MARGIN = 240;
  if (r.top >= TOP_MARGIN && r.bottom <= vh - BOTTOM_MARGIN) return;
  (el as HTMLElement).scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "center",
  });
}

function placeTooltip(rect: Rect, placement: TutorialStep["placement"]): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 16;
  let top = 0;
  let left = 0;
  switch (placement) {
    case "right":
      top = rect.top + rect.height / 2 - 80;
      left = rect.left + rect.width + margin;
      break;
    case "left":
      top = rect.top + rect.height / 2 - 80;
      left = rect.left - TOOLTIP_W - margin;
      break;
    case "top":
      top = rect.top - 180;
      left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
      break;
    case "bottom":
    default:
      top = rect.top + rect.height + margin;
      left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
      break;
  }
  // Защита от выхода за края
  if (left < 16) left = 16;
  if (left + TOOLTIP_W > vw - 16) left = vw - TOOLTIP_W - 16;
  if (top < 16) top = 16;
  if (top + 220 > vh - 16) top = vh - 220 - 16;
  return { top, left };
}

const EditorTutorial = ({ open, onClose }: Props) => {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [, force] = useState(0);

  // При открытии — сброс на первый шаг
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  // При смене шага — прокручиваем подсвеченный элемент в видимую область.
  // Делаем это до старта polling-а, чтобы маска появилась сразу в правильном месте.
  useEffect(() => {
    if (!open) return;
    scrollTargetIntoView(STEPS[step].target);
  }, [open, step]);

  // Отслеживаем позицию целевого элемента (на ресайз/скролл)
  useEffect(() => {
    if (!open) return;
    const update = () => {
      setRect(getTargetRect(STEPS[step].target));
      force((x) => x + 1);
    };
    update();
    const id = window.setInterval(update, 200); // дешёвый poll — на случай если элемент появится позже
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, step]);

  if (!open) return null;

  const cur = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const tooltipPos = rect ? placeTooltip(rect, cur.placement) : { top: 100, left: 100 };

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem(STORAGE_KEY, "1");
      onClose();
    } else {
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    onClose();
  };

  // Полупрозрачная маска с «вырезом» вокруг целевого элемента (4 прямоугольника)
  const holeRect = rect
    ? {
        top: rect.top - PADDING,
        left: rect.left - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
      }
    : null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Затемнение с дырой через 4 прямоугольника (свет проходит через target) */}
      {holeRect && (
        <>
          <div
            className="absolute bg-black/55 pointer-events-auto"
            style={{ top: 0, left: 0, right: 0, height: holeRect.top }}
            onClick={handleSkip}
          />
          <div
            className="absolute bg-black/55 pointer-events-auto"
            style={{
              top: holeRect.top + holeRect.height,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            onClick={handleSkip}
          />
          <div
            className="absolute bg-black/55 pointer-events-auto"
            style={{
              top: holeRect.top,
              left: 0,
              width: holeRect.left,
              height: holeRect.height,
            }}
            onClick={handleSkip}
          />
          <div
            className="absolute bg-black/55 pointer-events-auto"
            style={{
              top: holeRect.top,
              left: holeRect.left + holeRect.width,
              right: 0,
              height: holeRect.height,
            }}
            onClick={handleSkip}
          />
          {/* Светящаяся рамка вокруг цели */}
          <div
            className="absolute border-2 border-[var(--drawing-accent)] pointer-events-none"
            style={{
              top: holeRect.top,
              left: holeRect.left,
              width: holeRect.width,
              height: holeRect.height,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0)",
            }}
          />
        </>
      )}

      {/* Если цель не найдена — полное затемнение */}
      {!holeRect && (
        <div
          className="absolute inset-0 bg-black/55 pointer-events-auto"
          onClick={handleSkip}
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute bg-[var(--drawing-bg)] border-2 border-[var(--drawing-line)] p-4 pointer-events-auto shadow-xl"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          width: TOOLTIP_W,
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-accent)]">
            {cur.title}
          </span>
          <button onClick={handleSkip} className="p-1 hover:bg-[var(--drawing-paper)]" title="Закрыть туториал">
            <Icon name="X" size={14} />
          </button>
        </div>
        <p className="text-[12px] font-gost text-[var(--drawing-ink)] leading-relaxed mb-3">
          {cur.body}
        </p>
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={handleSkip}
            className="text-[11px] font-gost text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)]"
          >
            Пропустить
          </button>
          <div className="flex gap-1">
            <button
              onClick={handlePrev}
              disabled={step === 0}
              className="btn-drawing text-[11px] disabled:opacity-30"
            >
              Назад
            </button>
            <button onClick={handleNext} className="btn-drawing btn-drawing-accent text-[11px]">
              {isLast ? "Готово" : "Дальше"}
            </button>
          </div>
        </div>
        {/* Прогресс */}
        <div className="flex gap-1 mt-3">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-0.5 ${
                i <= step ? "bg-[var(--drawing-accent)]" : "bg-[var(--drawing-line-thin)]/40"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export function isTutorialCompleted(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "1";
}

export function resetTutorial(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export default EditorTutorial;