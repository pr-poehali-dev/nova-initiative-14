/**
 * Модалка лимита узлов CAE-редактора (альфа-тест: 10 узлов).
 *
 * Показывается когда пользователь пытается создать 11-й узел.
 * Объясняет ограничение и сразу предлагает запросить увеличение лимита
 * через техподдержку: поля «желаемый лимит» + «зачем нужно», далее открывается
 * SupportTicketModal с предзаполненным телом тикета.
 */
import { useState } from "react";
import Icon from "@/components/ui/icon";
import SupportTicketModal from "@/components/SupportTicketModal";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Текущий лимит — для отображения в тексте. */
  currentLimit: number;
  /** Сколько узлов уже создано (для контекста в тикете). */
  currentNodeCount: number;
}

export default function NodeLimitModal({
  open,
  onClose,
  currentLimit,
  currentNodeCount,
}: Props) {
  const [desiredLimit, setDesiredLimit] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [supportOpen, setSupportOpen] = useState(false);

  if (!open) return null;

  const desiredNum = parseInt(desiredLimit, 10);
  const desiredValid = Number.isFinite(desiredNum) && desiredNum > currentLimit && desiredNum <= 10000;
  const reasonValid = reason.trim().length >= 10;

  const handleSubmit = () => {
    if (!desiredValid || !reasonValid) return;
    setSupportOpen(true);
  };

  const ticketTitle = `Запрос увеличения лимита узлов: ${desiredNum}`;
  const ticketBody = [
    `Желаемый лимит узлов: ${desiredNum}`,
    `Текущий лимит: ${currentLimit}`,
    `Сейчас в проекте: ${currentNodeCount} узлов`,
    "",
    "Зачем нужно:",
    reason.trim(),
    "",
    "————————————————————————",
    "Заявка отправлена из модалки лимита узлов CAE.",
  ].join("\n");

  return (
    <>
      {/* Подложка */}
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-[var(--drawing-bg)] border-2 border-[var(--drawing-line)] shadow-2xl max-w-[480px] w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-labelledby="node-limit-title"
        >
          {/* Шапка */}
          <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[var(--drawing-line)] bg-[var(--drawing-paper)]">
            <p
              id="node-limit-title"
              className="font-gost-upright text-sm font-black uppercase tracking-wide"
            >
              Лимит узлов · {currentLimit}
            </p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть"
              className="min-w-[36px] min-h-[36px] flex items-center justify-center hover:bg-[var(--drawing-bg)]"
            >
              <Icon name="X" size={16} />
            </button>
          </div>

          {/* Контент */}
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3 border-l-2 border-[var(--drawing-accent)] pl-3">
              <Icon
                name="Info"
                size={18}
                className="text-[var(--drawing-accent)] mt-0.5 shrink-0"
              />
              <p className="text-sm leading-relaxed">
                В альфа-тесте можно создать до&nbsp;<strong>{currentLimit} узлов</strong>{" "}
                в&nbsp;одном проекте. Это временное ограничение, чтобы решатель
                стабильно работал у&nbsp;всех тестировщиков.
              </p>
            </div>

            <p className="text-sm text-[var(--drawing-line-thin)] leading-relaxed">
              Если для задачи нужно больше — оставьте заявку, мы поднимем лимит
              именно вашему аккаунту в&nbsp;течение суток.
            </p>

            {/* Желаемый лимит */}
            <div>
              <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] block mb-1.5">
                Сколько узлов нужно?
              </label>
              <input
                type="number"
                min={currentLimit + 1}
                max={10000}
                value={desiredLimit}
                onChange={(e) => setDesiredLimit(e.target.value)}
                className="drawing-input font-mono"
                placeholder={`больше ${currentLimit}, например 30`}
                autoFocus
              />
              {desiredLimit && !desiredValid && (
                <p className="text-xs text-[var(--drawing-accent)] mt-1">
                  Укажите число больше {currentLimit} и не больше 10000.
                </p>
              )}
            </div>

            {/* Зачем нужно */}
            <div>
              <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] block mb-1.5">
                Зачем нужно? (что считаете)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="drawing-input font-sans"
                placeholder="Например: дипломный проект — пространственная рама промышленного цеха, 40 узлов и 60 стержней"
              />
              <p className="text-[11px] text-[var(--drawing-line-thin)] mt-1">
                Минимум 10 символов. Описание задачи поможет нам быстрее одобрить запрос.
              </p>
            </div>

            {/* Кнопки */}
            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-drawing text-sm flex-1 justify-center"
              >
                Закрыть
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!desiredValid || !reasonValid}
                className="btn-drawing btn-drawing-accent text-sm flex-1 justify-center disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Icon name="Send" size={14} className="mr-1.5" />
                Отправить запрос
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Поверх — модалка тикета с предзаполненными данными */}
      <SupportTicketModal
        open={supportOpen}
        onClose={() => {
          setSupportOpen(false);
          onClose();
        }}
        defaultTitle={ticketTitle}
        defaultBody={ticketBody}
        defaultKind="feature"
      />
    </>
  );
}
