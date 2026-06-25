/**
 * Компактная панель виджета вместо стандартного верхнего тулбара CAE.
 *
 * В встроенном режиме (iframe на сайте партнёра) не нужны «Сохранить» и
 * экспорт JSON — нужна только кнопка запуска расчёта и понятный счётчик
 * оставшихся расчётов по тарифу. Стили нейтральные, чтобы не зависеть от
 * темы сайта-носителя.
 */
import Icon from "@/components/ui/icon";

interface Props {
  onSolve: () => void;
  solving: boolean;
  blocked: boolean;
  solvesLeft: number;
  solveLimit: number;
  company?: string;
  /** Открыть модалку подбора сечений «Балки». */
  onOpenBeams?: () => void;
}

export default function WidgetEditorToolbar({
  onSolve,
  solving,
  blocked,
  solvesLeft,
  solveLimit,
  company,
  onOpenBeams,
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 14px",
        background: "#fff",
        borderBottom: "1px solid #e3e6ea",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <Icon name="Calculator" size={18} className="text-[#2563eb]" />
        <span style={{ fontWeight: 700, fontSize: 15, color: "#1a1d21" }}>
          Калькулятор конструкций
        </span>
        {company && (
          <span style={{ fontSize: 12, color: "#9ca3af" }} className="hidden sm:inline">
            · {company}
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 12, color: "#6b7280" }} className="hidden sm:inline">
          {isFinite(solveLimit) ? (
            <>
              Расчётов осталось: <strong style={{ color: "#1a1d21" }}>{solvesLeft}</strong> из {solveLimit}
            </>
          ) : (
            <>Расчёты: <strong style={{ color: "#1a1d21" }}>без ограничений</strong></>
          )}
        </span>
        {onOpenBeams && (
          <button
            onClick={onOpenBeams}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#fff",
              color: "#2563eb",
              border: "1px solid #c7d2fe",
              borderRadius: 8,
              padding: "9px 14px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Icon name="Construction" size={15} /> Балки
          </button>
        )}
        <button
          onClick={onSolve}
          disabled={solving || blocked}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: blocked ? "#9ca3af" : "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "9px 18px",
            fontSize: 14,
            fontWeight: 600,
            cursor: solving || blocked ? "not-allowed" : "pointer",
            opacity: solving ? 0.7 : 1,
          }}
        >
          <Icon name={solving ? "Loader" : "Play"} size={15} className={solving ? "animate-spin" : ""} />
          {solving ? "Считаем…" : "Рассчитать"}
        </button>
      </div>
    </div>
  );
}