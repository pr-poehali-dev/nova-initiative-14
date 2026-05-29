import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import {
  getMyTickets,
  KIND_LABELS,
  IMPORTANCE_LABELS,
  STATUS_LABELS,
  type SupportTicket,
} from "@/lib/support";

interface Props {
  /** Открыть модалку «Сообщить о проблеме» — управляется родителем. */
  onNewTicket: () => void;
}

/**
 * Блок «Мои обращения» для страницы /account.
 *
 * Список тикетов пользователя со статусом, самооценкой важности,
 * заметкой администратора и баллами, начисленными по факту обработки.
 * Загружается при монтировании компонента.
 */
const ACTIVE_STATUSES: SupportTicket["status"][] = ["open", "in_progress"];
const PREVIEW_COUNT = 3;

export default function MyTicketsBlock({ onNewTicket }: Props) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  // Показывать ли весь список (включая решённые) или только превью.
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setLoading(true);
    getMyTickets()
      .then((res) => {
        if (res.ok && res.data) {
          setTickets(res.data.tickets);
          setError(null);
        } else {
          setError(res.message || "Не удалось загрузить обращения");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const statusColor = (s: SupportTicket["status"]) => {
    switch (s) {
      case "open":
        return "text-amber-700 border-amber-700";
      case "in_progress":
        return "text-[var(--drawing-accent)] border-[var(--drawing-accent)]";
      case "resolved":
        return "text-green-700 border-green-700";
      case "rejected":
      case "duplicate":
        return "text-[var(--drawing-line-thin)] border-[var(--drawing-line-thin)]";
      default:
        return "text-[var(--drawing-line)] border-[var(--drawing-line)]";
    }
  };

  // Активные тикеты — сверху; внутри групп новые выше. Превью показывает
  // последние активные, остальное — под кнопкой «показать все».
  const activeTickets = tickets.filter((t) => ACTIVE_STATUSES.includes(t.status));
  const activeCount = activeTickets.length;
  const sorted = [...tickets].sort((a, b) => {
    const aActive = ACTIVE_STATUSES.includes(a.status) ? 0 : 1;
    const bActive = ACTIVE_STATUSES.includes(b.status) ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;
    return (b.created_at || "").localeCompare(a.created_at || "");
  });
  const visible = showAll ? sorted : sorted.slice(0, PREVIEW_COUNT);
  const hiddenCount = sorted.length - visible.length;

  return (
    <section className="mb-8">
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="font-gost text-[10px] uppercase tracking-[0.25em] text-[var(--drawing-line-thin)] mb-1">
            Техподдержка
          </p>
          <h2 className="font-gost-upright text-lg md:text-xl font-black uppercase tracking-wide flex items-center gap-2">
            Мои обращения
            {activeCount > 0 && (
              <span className="font-gost text-[10px] font-bold uppercase tracking-wider text-white bg-[var(--drawing-accent)] px-2 py-0.5 leading-none">
                {activeCount} актив.
              </span>
            )}
          </h2>
        </div>
        <button
          type="button"
          onClick={onNewTicket}
          className="btn-drawing text-xs inline-flex"
        >
          <Icon name="Plus" size={13} className="mr-1.5" />
          Новое обращение
        </button>
      </div>

      {loading ? (
        <div className="border-[1.5px] border-[var(--drawing-line)] p-4 text-center font-gost text-xs uppercase tracking-wider text-[var(--drawing-line-thin)]">
          Загружаем…
        </div>
      ) : error ? (
        <div className="border-[1.5px] border-[var(--drawing-line)] p-4 text-xs text-[var(--drawing-line-thin)]">
          {error}
        </div>
      ) : tickets.length === 0 ? (
        <div className="border border-dashed border-[var(--drawing-line)]/40 p-5 text-center text-xs text-[var(--drawing-line-thin)]">
          <Icon name="MessageSquare" size={20} className="mx-auto mb-2 opacity-60" />
          <p className="leading-snug">
            Пока нет обращений. Заметили баг или хотите предложить идею&nbsp;&mdash; нажмите{" "}
            <strong className="text-[var(--drawing-line)]">«Новое обращение»</strong>.
            За&nbsp;полезные сообщения администратор начисляет баллы.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((t) => {
            const isOpen = expanded === t.id;
            return (
              <div key={t.id} className="border-[1.5px] border-[var(--drawing-line)]">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : t.id)}
                  className="w-full text-left p-3 hover:bg-[var(--drawing-line)]/5 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="font-gost-upright font-bold text-sm truncate flex-1 min-w-0">
                      #{t.id} · {t.title}
                    </span>
                    <span
                      className={`font-gost text-[9px] uppercase tracking-wider border px-1.5 py-0.5 shrink-0 ${statusColor(t.status)}`}
                    >
                      {STATUS_LABELS[t.status]}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-gost uppercase tracking-wider text-[var(--drawing-line-thin)]">
                    <span>{KIND_LABELS[t.kind]}</span>
                    <span>·</span>
                    <span>Важность: {IMPORTANCE_LABELS[t.self_importance]}</span>
                    {t.awarded_points > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-[var(--drawing-accent)] font-bold inline-flex items-center gap-0.5">
                          <Icon name="Award" size={10} />
                          +{t.awarded_points}&nbsp;баллов
                        </span>
                      </>
                    )}
                    {t.created_at && (
                      <>
                        <span>·</span>
                        <span>{new Date(t.created_at).toLocaleDateString("ru-RU")}</span>
                      </>
                    )}
                  </div>
                </button>

                {isOpen && t.admin_note && (
                  <div className="border-t border-[var(--drawing-line)]/20 p-3 bg-[var(--drawing-line)]/5">
                    <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-accent)] mb-1">
                      Ответ администратора
                    </p>
                    <p className="text-xs whitespace-pre-wrap leading-snug font-mono">
                      {t.admin_note}
                    </p>
                    {t.resolved_at && (
                      <p className="font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)] mt-2">
                        Закрыто:{" "}
                        {new Date(t.resolved_at).toLocaleString("ru-RU", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </p>
                    )}
                  </div>
                )}

                {isOpen && !t.admin_note && (
                  <div className="border-t border-[var(--drawing-line)]/20 p-3 bg-[var(--drawing-line)]/5 text-xs text-[var(--drawing-line-thin)] italic">
                    Администратор ещё не оставил комментарий.
                  </div>
                )}
              </div>
            );
          })}

          {/* Кнопка «показать все / свернуть» — только если есть скрытые. */}
          {(hiddenCount > 0 || showAll) && sorted.length > PREVIEW_COUNT && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="w-full border border-dashed border-[var(--drawing-line)]/50 py-2 text-[10px] font-gost uppercase tracking-wider text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] hover:border-[var(--drawing-accent)] flex items-center justify-center gap-1.5 transition-colors"
            >
              {showAll ? (
                <>
                  <Icon name="ChevronUp" size={12} />
                  Свернуть
                </>
              ) : (
                <>
                  <Icon name="ChevronDown" size={12} />
                  Показать все ({sorted.length}), включая решённые
                </>
              )}
            </button>
          )}
        </div>
      )}
    </section>
  );
}