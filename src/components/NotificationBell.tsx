/**
 * Колокольчик уведомлений в шапке.
 *
 * Показывает бейдж непрочитанных, по клику открывает панель с последними
 * уведомлениями (обновления, исправления, ответы на тикеты). Клик по
 * уведомлению отмечает его прочитанным и ведёт по ссылке.
 *
 * БЕЗ поллинга (тикет #63): счётчик непрочитанных запрашивается ОДИН раз —
 * при заходе пользователя на сайт (монтирование / появление сессии). Никаких
 * фоновых интервалов и опросов по фокусу — это впустую тратило вычисления.
 * Новые уведомления пользователь увидит при следующем заходе.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
  type NotificationType,
} from "@/lib/notifications";

const TYPE_ICON: Record<NotificationType, string> = {
  ticket_reply: "MessageSquare",
  ticket_resolved: "CircleCheckBig",
  fix: "Wrench",
  update: "Sparkles",
  system: "Bell",
};

export default function NotificationBell() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    const res = await getUnreadCount();
    if (res.ok && res.data) setUnread(res.data.unread);
  }, []);

  // Запрашиваем счётчик непрочитанных РОВНО ОДИН РАЗ — когда пользователь
  // зашёл (появилась сессия). Без интервалов и опроса по фокусу: постоянный
  // поллинг впустую расходовал вычислительный ресурс (тикет #63). Свежие
  // уведомления подтянутся при следующем заходе или при открытии панели.
  useEffect(() => {
    if (!user) return;
    refreshCount();
  }, [user, refreshCount]);

  // Закрытие по клику вне и по Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const loadList = useCallback(async () => {
    setLoading(true);
    const res = await listNotifications(30);
    setLoading(false);
    if (res.ok && res.data) setItems(res.data.notifications);
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) loadList();
  };

  const onItemClick = async (n: AppNotification) => {
    if (!n.is_read) {
      await markNotificationRead(n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      setUnread((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (n.link) {
      if (n.link.startsWith("http")) window.location.href = n.link;
      else nav(n.link);
    }
  };

  const onMarkAll = async () => {
    await markAllNotificationsRead();
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
    setUnread(0);
  };

  if (!user) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Уведомления"
        title="Уведомления"
        className="relative flex items-center justify-center min-w-[36px] min-h-[36px] text-[var(--drawing-line)] hover:text-[var(--drawing-accent)] transition-colors"
      >
        <Icon name="Bell" size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-[var(--drawing-accent)] text-white text-[9px] font-bold min-w-[15px] h-[15px] rounded-full flex items-center justify-center px-1 leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[320px] max-w-[calc(100vw-24px)] bg-[var(--drawing-bg)] border-2 border-[var(--drawing-line)] shadow-2xl z-[120]">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--drawing-line)]/40">
            <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line)] font-bold">
              Уведомления
            </p>
            {unread > 0 && (
              <button
                type="button"
                onClick={onMarkAll}
                className="font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-accent)] hover:underline"
              >
                Прочитать все
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
            {loading ? (
              <p className="px-3 py-6 text-center font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
                Загружаем…
              </p>
            ) : items.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <Icon name="BellOff" size={20} className="mx-auto mb-2 text-[var(--drawing-line-thin)] opacity-60" />
                <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
                  Пока нет уведомлений
                </p>
              </div>
            ) : (
              <ul>
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => onItemClick(n)}
                      className={`w-full text-left px-3 py-2.5 border-b border-[var(--drawing-line)]/15 hover:bg-[var(--drawing-line)]/5 transition-colors flex gap-2.5 ${
                        n.is_read ? "opacity-60" : ""
                      }`}
                    >
                      <Icon
                        name={TYPE_ICON[n.type] || "Bell"}
                        size={15}
                        className="mt-0.5 shrink-0 text-[var(--drawing-accent)]"
                        fallback="Bell"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-1.5">
                          <p className="font-gost-upright font-bold text-[12px] leading-snug flex-1">
                            {n.title}
                          </p>
                          {!n.is_read && (
                            <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--drawing-accent)]" />
                          )}
                        </div>
                        {n.body && (
                          <p className="text-[11px] text-[var(--drawing-line-thin)] leading-snug mt-0.5 line-clamp-2">
                            {n.body}
                          </p>
                        )}
                        {n.created_at && (
                          <p className="font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)] mt-1">
                            {new Date(n.created_at).toLocaleString("ru-RU", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}