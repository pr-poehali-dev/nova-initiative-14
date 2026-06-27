/**
 * Админ-вкладка «Пользователи».
 *
 * Возможности:
 *  - поиск по email / имени;
 *  - список пользователей с баллами, статусом и флагами ролей;
 *  - переключение ролей (Админ / Владелец);
 *  - блокировка / разблокировка входа;
 *  - ручное начисление (или списание) баллов с заметкой.
 *
 * Все действия идут через sso-auth (admin-*), доступ — только is_admin.
 */
import { useEffect, useState, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import {
  adminListUsers,
  adminSetRole,
  adminToggleActive,
  adminAwardPoints,
  type AdminUser,
} from "@/lib/auth";

export default function AdminUsersTab() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback((query: string) => {
    setLoading(true);
    adminListUsers(query)
      .then((res) => {
        if (res.ok && res.data) setUsers(res.data.users);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q, load]);

  const patchUser = (id: number, patch: Partial<AdminUser>) =>
    setUsers((list) => list.map((u) => (u.id === id ? { ...u, ...patch } : u)));

  const onToggleRole = async (
    u: AdminUser,
    field: "is_admin" | "is_owner" | "is_sales",
  ) => {
    const value = !u[field];
    // Роль продавца на бэке передаётся как 'sales', остальные — как имя колонки.
    const apiField = field === "is_sales" ? "sales" : field;
    setBusyId(u.id);
    const r = await adminSetRole(u.id, apiField, value);
    setBusyId(null);
    if (r.ok) patchUser(u.id, { [field]: value });
    else alert(r.message || "Не удалось изменить роль");
  };

  const onToggleActive = async (u: AdminUser) => {
    const value = !u.is_active;
    setBusyId(u.id);
    const r = await adminToggleActive(u.id, value);
    setBusyId(null);
    if (r.ok) patchUser(u.id, { is_active: value });
    else alert(r.message || "Не удалось изменить статус");
  };

  return (
    <div>
      <div className="relative mb-3">
        <Icon
          name="Search"
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--drawing-line-thin)]"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск по email или имени"
          className="w-full border border-[var(--drawing-line)] bg-transparent pl-8 pr-2 py-1.5 text-sm"
        />
      </div>

      {loading ? (
        <p className="font-gost text-xs uppercase tracking-wider text-[var(--drawing-line-thin)] text-center py-6">
          Загружаем…
        </p>
      ) : users.length === 0 ? (
        <p className="font-gost text-xs uppercase tracking-wider text-[var(--drawing-line-thin)] text-center py-6">
          Никого не найдено
        </p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              isSelf={me?.id === u.id}
              expanded={expanded === u.id}
              busy={busyId === u.id}
              onToggle={() => setExpanded(expanded === u.id ? null : u.id)}
              onToggleRole={onToggleRole}
              onToggleActive={onToggleActive}
              onPointsAwarded={(total) => patchUser(u.id, { total_points: total })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UserRow({
  user,
  isSelf,
  expanded,
  busy,
  onToggle,
  onToggleRole,
  onToggleActive,
  onPointsAwarded,
}: {
  user: AdminUser;
  isSelf: boolean;
  expanded: boolean;
  busy: boolean;
  onToggle: () => void;
  onToggleRole: (u: AdminUser, field: "is_admin" | "is_owner" | "is_sales") => void;
  onToggleActive: (u: AdminUser) => void;
  onPointsAwarded: (total: number) => void;
}) {
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");
  const [awarding, setAwarding] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onAward = async () => {
    const p = Number(points);
    if (!p) {
      setMsg("Укажите ненулевое число");
      return;
    }
    setAwarding(true);
    setMsg(null);
    const r = await adminAwardPoints(user.id, p, note.trim());
    setAwarding(false);
    if (r.ok && r.data) {
      onPointsAwarded(r.data.total_points);
      setPoints("");
      setNote("");
      setMsg("Готово");
      setTimeout(() => setMsg(null), 1500);
    } else {
      setMsg(r.message || "Ошибка");
    }
  };

  return (
    <div className={`border-[1.5px] ${user.is_active ? "border-[var(--drawing-line)]" : "border-red-600/60"}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-3 hover:bg-[var(--drawing-line)]/5 transition-colors"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-gost-upright font-bold text-sm truncate">
            {user.full_name || user.email}
          </span>
          <span className="font-mono text-xs text-[var(--drawing-accent)] shrink-0">
            {user.total_points} б.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          <span className="font-mono text-[10px] text-[var(--drawing-line-thin)] truncate">
            {user.email}
          </span>
          {user.is_admin && <Badge label="Админ" />}
          {user.is_owner && <Badge label="Владелец" />}
          {user.is_sales && <Badge label="Продажи" />}
          {!user.is_active && <Badge label="Заблокирован" danger />}
          {!user.email_verified && <Badge label="Email не подтверждён" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--drawing-line)]/20 p-3 space-y-3">
          {/* Роли и блокировка */}
          <div className="flex flex-wrap gap-1.5">
            <ActionBtn
              active={user.is_admin}
              disabled={busy}
              onClick={() => onToggleRole(user, "is_admin")}
              label={user.is_admin ? "Снять админа" : "Сделать админом"}
              icon="ShieldCheck"
            />
            <ActionBtn
              active={user.is_owner}
              disabled={busy}
              onClick={() => onToggleRole(user, "is_owner")}
              label={user.is_owner ? "Снять владельца" : "Сделать владельцем"}
              icon="Crown"
            />
            <ActionBtn
              active={user.is_sales}
              disabled={busy}
              onClick={() => onToggleRole(user, "is_sales")}
              label={user.is_sales ? "Снять продажника" : "Сделать продажником"}
              icon="MessagesSquare"
            />
            <ActionBtn
              danger={user.is_active}
              disabled={busy || isSelf}
              onClick={() => onToggleActive(user)}
              label={user.is_active ? "Заблокировать" : "Разблокировать"}
              icon={user.is_active ? "Ban" : "CircleCheck"}
            />
          </div>
          {isSelf && (
            <p className="font-gost text-[10px] text-[var(--drawing-line-thin)]">
              Это ваш аккаунт — блокировку и снятие админ-прав с себя нельзя.
            </p>
          )}

          {/* Начисление баллов */}
          <div className="pt-2 border-t border-[var(--drawing-line)]/10">
            <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-1.5">
              Начислить / списать баллы
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                placeholder="±баллы"
                className="w-24 border border-[var(--drawing-line)] bg-transparent px-2 py-1 text-sm"
              />
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Причина (необязательно)"
                maxLength={200}
                className="flex-1 min-w-[140px] border border-[var(--drawing-line)] bg-transparent px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={onAward}
                disabled={awarding}
                className="btn-drawing btn-drawing-accent text-[11px] disabled:opacity-60"
              >
                {awarding ? "…" : "Начислить"}
              </button>
              {msg && <span className="font-gost text-[11px] text-[var(--drawing-line-thin)]">{msg}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Badge({ label, danger }: { label: string; danger?: boolean }) {
  return (
    <span
      className={`font-gost text-[8px] uppercase tracking-wider px-1.5 py-0.5 border ${
        danger ? "border-red-600 text-red-600" : "border-[var(--drawing-line-thin)] text-[var(--drawing-line-thin)]"
      }`}
    >
      {label}
    </span>
  );
}

function ActionBtn({
  active,
  danger,
  disabled,
  onClick,
  label,
  icon,
}: {
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  icon: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`btn-drawing text-[10px] inline-flex items-center disabled:opacity-40 ${
        danger ? "border-red-600 text-red-600" : active ? "border-[var(--drawing-accent)] text-[var(--drawing-accent)]" : ""
      }`}
    >
      <Icon name={icon} size={12} className="mr-1" fallback="Circle" />
      {label}
    </button>
  );
}