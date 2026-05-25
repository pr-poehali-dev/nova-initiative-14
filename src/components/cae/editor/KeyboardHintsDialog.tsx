/**
 * Диалог справки по горячим клавишам редактора (вызов по «?»).
 * Простой модал с двумя колонками: режимы и операции.
 */
import Icon from "@/components/ui/icon";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Hint {
  keys: string[];
  desc: string;
}

const MODE_HINTS: Hint[] = [
  { keys: ["S"], desc: "Режим выбора" },
  { keys: ["N"], desc: "Создание узла" },
  { keys: ["E"], desc: "Создание балки (элемента)" },
  { keys: ["Esc"], desc: "Снять выделение и вернуться в режим выбора" },
];

const OP_HINTS: Hint[] = [
  { keys: ["Ctrl", "Z"], desc: "Отменить" },
  { keys: ["Ctrl", "Shift", "Z"], desc: "Вернуть" },
  { keys: ["Ctrl", "Y"], desc: "Вернуть (альтернатива)" },
  { keys: ["Ctrl", "A"], desc: "Выделить все узлы и элементы" },
  { keys: ["Ctrl", "D"], desc: "Дублировать выделенное со смещением" },
  { keys: ["Del"], desc: "Удалить выделенные объекты" },
  { keys: ["Ctrl", "S"], desc: "Сохранить проект" },
  { keys: ["F5"], desc: "Запустить расчёт" },
  { keys: ["?"], desc: "Показать эту справку" },
];

const MOUSE_HINTS: Hint[] = [
  { keys: ["Клик"], desc: "Выбрать узел / элемент / создать в режиме" },
  { keys: ["Shift", "+ клик"], desc: "Добавить к выделению / убрать из выделения" },
  { keys: ["Колесо"], desc: "Масштаб канвы" },
  { keys: ["Средняя кн.", "/ ПКМ"], desc: "Панорамирование" },
  { keys: ["Drag узла"], desc: "Переместить узел (в режиме выбора)" },
];

function KeyChip({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="font-gost text-[11px] px-1.5 py-0.5 border border-[var(--drawing-line)] bg-[var(--drawing-paper)] text-[var(--drawing-ink)] uppercase">
      {children}
    </kbd>
  );
}

function HintRow({ hint }: { hint: Hint }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-dashed border-[var(--drawing-line)] last:border-0">
      <span className="text-[12px] text-[var(--drawing-ink)] font-gost">{hint.desc}</span>
      <span className="flex gap-1 shrink-0">
        {hint.keys.map((k, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-[10px] text-[var(--drawing-line-thin)]">+</span>}
            <KeyChip>{k}</KeyChip>
          </span>
        ))}
      </span>
    </div>
  );
}

function HintColumn({ title, hints }: { title: string; hints: Hint[] }) {
  return (
    <div>
      <h3 className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-2">
        {title}
      </h3>
      <div>
        {hints.map((h, i) => (
          <HintRow key={i} hint={h} />
        ))}
      </div>
    </div>
  );
}

const KeyboardHintsDialog = ({ open, onClose }: Props) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--drawing-bg)] border-2 border-[var(--drawing-line)] max-w-[760px] w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-[var(--drawing-line)] px-4 py-3">
          <h2 className="font-gost text-[14px] uppercase tracking-[0.15em] text-[var(--drawing-ink)]">
            Горячие клавиши
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--drawing-paper)]"
            aria-label="Закрыть"
          >
            <Icon name="X" size={18} />
          </button>
        </div>
        <div className="grid md:grid-cols-2 gap-6 p-4">
          <div className="space-y-5">
            <HintColumn title="Режимы редактора" hints={MODE_HINTS} />
            <HintColumn title="Мышь" hints={MOUSE_HINTS} />
          </div>
          <HintColumn title="Операции" hints={OP_HINTS} />
        </div>
        <div className="px-4 py-3 border-t border-[var(--drawing-line)] text-[11px] text-[var(--drawing-line-thin)] font-gost">
          Совет: фокус в поле ввода блокирует буквенные шорткаты, но Ctrl+Z, Ctrl+S работают всегда.
        </div>
      </div>
    </div>
  );
};

export default KeyboardHintsDialog;
