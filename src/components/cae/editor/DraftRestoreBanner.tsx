/**
 * Баннер восстановления несохранённого черновика (тикет №49).
 *
 * Появляется, если при открытии проекта в localStorage найден более новый
 * черновик модели, чем сохранённая на сервере версия. Даёт выбрать:
 * восстановить правки или продолжить с серверной версии.
 */
import Icon from "@/components/ui/icon";
import { formatDraftTime } from "@/lib/cae/draft";

interface DraftRestoreBannerProps {
  savedAt: number;
  onRestore: () => void;
  onDiscard: () => void;
}

const DraftRestoreBanner = ({ savedAt, onRestore, onDiscard }: DraftRestoreBannerProps) => {
  return (
    <div className="max-w-[1400px] mx-auto px-3 mt-3">
      <div className="border-[2.5px] border-[var(--drawing-accent)] bg-[var(--drawing-accent)]/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start gap-3 flex-1">
          <Icon
            name="History"
            size={20}
            className="text-[var(--drawing-accent)] mt-0.5 shrink-0"
          />
          <div>
            <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] mb-1">
              Найден несохранённый черновик
            </p>
            <p className="text-sm text-[var(--drawing-line)]">
              На этом устройстве остались изменения от{" "}
              <strong>{formatDraftTime(savedAt)}</strong>, которые не были сохранены
              на сервер. Восстановить их?
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onRestore}
            className="btn-drawing btn-drawing-accent text-xs inline-flex"
          >
            <Icon name="RotateCcw" size={14} className="mr-1.5" />
            Восстановить
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="btn-drawing text-xs inline-flex"
          >
            Не нужно
          </button>
        </div>
      </div>
    </div>
  );
};

export default DraftRestoreBanner;
