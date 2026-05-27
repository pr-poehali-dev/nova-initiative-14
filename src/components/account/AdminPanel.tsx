import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import {
  adminListTickets,
  adminUpdateTicket,
  KIND_LABELS,
  IMPORTANCE_LABELS,
  STATUS_LABELS,
  type SupportTicket,
  type TicketStatus,
} from "@/lib/support";

/**
 * Админ-панель. Доступна только если user.is_admin === true.
 *
 * Вкладки:
 *  - Тикеты — рабочая модерация (список, изменение статуса, заметка, начисление баллов)
 *  - Пользователи — плейсхолдер (в разработке)
 *  - Очки и ачивки — плейсхолдер (в разработке)
 *  - Контент — плейсхолдер (в разработке)
 *
 * Кнопки плейсхолдеров видны, но помечены «в разработке» и неактивны.
 */
export default function AdminPanel() {
  const [tab, setTab] = useState<"tickets" | "users" | "points" | "content">("tickets");
  return (
    <section className="mb-8 border-[2.5px] border-[var(--drawing-accent)] bg-[var(--drawing-bg)] relative">
      <div className="absolute -top-px -left-px w-3 h-3 border-t-[2.5px] border-l-[2.5px] border-[var(--drawing-accent)]" />
      <div className="absolute -top-px -right-px w-3 h-3 border-t-[2.5px] border-r-[2.5px] border-[var(--drawing-accent)]" />
      <div className="absolute -bottom-px -left-px w-3 h-3 border-b-[2.5px] border-l-[2.5px] border-[var(--drawing-accent)]" />
      <div className="absolute -bottom-px -right-px w-3 h-3 border-b-[2.5px] border-r-[2.5px] border-[var(--drawing-accent)]" />

      <div className="px-4 pt-4 pb-2 border-b border-[var(--drawing-accent)]/30 flex items-center gap-2">
        <Icon name="ShieldCheck" size={16} className="text-[var(--drawing-accent)]" />
        <p className="font-gost text-[10px] uppercase tracking-[0.25em] text-[var(--drawing-accent)]">
          Администратор
        </p>
      </div>

      <div className="px-4 pt-3 flex flex-wrap gap-1 border-b border-[var(--drawing-line)]/20">
        <TabBtn active={tab === "tickets"} onClick={() => setTab("tickets")} label="Тикеты" />
        <TabBtn active={tab === "users"} onClick={() => setTab("users")} label="Пользователи" wip />
        <TabBtn active={tab === "points"} onClick={() => setTab("points")} label="Очки и ачивки" wip />
        <TabBtn active={tab === "content"} onClick={() => setTab("content")} label="Контент" wip />
      </div>

      <div className="p-4">
        {tab === "tickets" && <TicketsTab />}
        {tab === "users" && <PlaceholderTab title="Управление пользователями" />}
        {tab === "points" && <PlaceholderTab title="Ручное начисление баллов" />}
        {tab === "content" && <PlaceholderTab title="Управление контентом (статьи, кейсы)" />}
      </div>
    </section>
  );
}

function TabBtn({ active, onClick, label, wip }: { active: boolean; onClick: () => void; label: string; wip?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-gost text-[10px] uppercase tracking-wider px-3 py-1.5 border-b-2 transition-colors ${
        active
          ? "border-[var(--drawing-accent)] text-[var(--drawing-accent)]"
          : "border-transparent text-[var(--drawing-line-thin)] hover:text-[var(--drawing-line)]"
      }`}
    >
      {label}
      {wip && <span className="ml-1 text-[8px] text-amber-700">в разраб.</span>}
    </button>
  );
}

function PlaceholderTab({ title }: { title: string }) {
  return (
    <div className="text-center py-10">
      <Icon name="Construction" size={32} className="text-[var(--drawing-line-thin)] mx-auto mb-2" />
      <p className="font-gost-upright font-bold mb-1">{title}</p>
      <p className="font-gost text-[10px] uppercase tracking-wider text-amber-700">
        В разработке
      </p>
    </div>
  );
}

function TicketsTab() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TicketStatus | "">("open");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = (status: TicketStatus | "") => {
    setLoading(true);
    adminListTickets(status || undefined)
      .then((res) => {
        if (res.ok && res.data) setTickets(res.data.tickets);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(filter);
  }, [filter]);

  const onUpdate = async (
    ticketId: number,
    patch: {
      status?: TicketStatus;
      admin_note?: string;
      award_points?: number;
    },
  ) => {
    setSaving(true);
    const res = await adminUpdateTicket({ ticket_id: ticketId, ...patch });
    setSaving(false);
    if (res.ok) {
      load(filter);
      setExpanded(null);
    } else {
      alert(res.message || "Не удалось обновить");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-3">
        {(["open", "in_progress", "resolved", "rejected", ""] as const).map((s) => (
          <button
            key={s || "all"}
            type="button"
            onClick={() => setFilter(s)}
            className={`btn-drawing text-[10px] ${filter === s ? "border-[var(--drawing-accent)] text-[var(--drawing-accent)]" : ""}`}
          >
            {s === "" ? "Все" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="font-gost text-xs uppercase tracking-wider text-[var(--drawing-line-thin)] text-center py-6">
          Загружаем…
        </p>
      ) : tickets.length === 0 ? (
        <p className="font-gost text-xs uppercase tracking-wider text-[var(--drawing-line-thin)] text-center py-6">
          Тикетов нет
        </p>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <TicketRow
              key={t.id}
              ticket={t}
              expanded={expanded === t.id}
              onToggle={() => setExpanded(expanded === t.id ? null : t.id)}
              onUpdate={onUpdate}
              saving={saving}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TicketRow({
  ticket,
  expanded,
  onToggle,
  onUpdate,
  saving,
}: {
  ticket: SupportTicket;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (
    id: number,
    patch: { status?: TicketStatus; admin_note?: string; award_points?: number },
  ) => void;
  saving: boolean;
}) {
  const [note, setNote] = useState(ticket.admin_note || "");
  const [points, setPoints] = useState(0);
  const [status, setStatus] = useState<TicketStatus>(ticket.status);

  const importanceColor = {
    low: "text-[var(--drawing-line-thin)]",
    normal: "text-[var(--drawing-line)]",
    high: "text-amber-700",
    critical: "text-red-700",
  }[ticket.self_importance];

  return (
    <div className="border-[1.5px] border-[var(--drawing-line)]">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-3 hover:bg-[var(--drawing-line)]/5 transition-colors"
      >
        <div className="flex items-center justify-between gap-3 mb-1">
          <span className="font-gost-upright font-bold text-sm truncate">
            #{ticket.id} · {ticket.title}
          </span>
          <span className={`font-gost text-[9px] uppercase tracking-wider ${importanceColor} shrink-0`}>
            {IMPORTANCE_LABELS[ticket.self_importance]}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-gost uppercase tracking-wider text-[var(--drawing-line-thin)]">
          <span>{KIND_LABELS[ticket.kind]}</span>
          <span>·</span>
          <span>{STATUS_LABELS[ticket.status]}</span>
          <span>·</span>
          <span>{ticket.user_email || ticket.email || "гость"}</span>
          {ticket.awarded_points > 0 && (
            <>
              <span>·</span>
              <span className="text-[var(--drawing-accent)] font-bold">+{ticket.awarded_points}&nbsp;баллов</span>
            </>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--drawing-line)]/20 p-3 bg-[var(--drawing-line)]/5">
          <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-1">
            Описание
          </p>
          <p className="text-xs whitespace-pre-wrap leading-snug mb-3 font-mono">{ticket.body}</p>
          {ticket.page_url && (
            <p className="text-[10px] font-mono mb-3 truncate">
              <span className="text-[var(--drawing-line-thin)]">URL: </span>
              <a href={ticket.page_url} className="underline" target="_blank" rel="noreferrer">
                {ticket.page_url}
              </a>
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] block mb-1">
                Статус
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TicketStatus)}
                className="drawing-input text-xs"
              >
                {(Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] block mb-1">
                Начислить баллов автору
              </label>
              <input
                type="number"
                min={0}
                max={500}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value) || 0)}
                className="drawing-input text-xs"
                disabled={!ticket.user_id}
              />
            </div>
          </div>

          <label className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] block mb-1 mt-3">
            Заметка администратора (видна автору)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="drawing-input text-xs font-mono resize-y"
            placeholder="Например: спасибо, исправили в версии 1.2"
          />

          <div className="mt-3 flex gap-2 justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                onUpdate(ticket.id, {
                  status,
                  admin_note: note || undefined,
                  award_points: points > 0 ? points : undefined,
                })
              }
              className="btn-drawing btn-drawing-accent text-[10px] disabled:opacity-50"
            >
              Сохранить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
