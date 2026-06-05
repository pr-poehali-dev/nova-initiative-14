/**
 * Блок «Профиль» с редактированием имени и сменой пароля (личный кабинет).
 *
 * - Имя: inline-редактирование, сохраняется через sso-auth update-profile.
 * - Пароль: разворачиваемая форма (текущий + новый), change-password.
 *   Если у пользователя ещё нет пароля (вход только через OAuth) — позволяем
 *   задать первый пароль без ввода текущего.
 */
import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfile, changePassword } from "@/lib/auth";

const ProfileEditBlock = () => {
  const { user, refreshUser } = useAuth();

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user?.full_name || "");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState<string | null>(null);

  const [pwOpen, setPwOpen] = useState(false);
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!user) return null;

  const onSaveName = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameMsg("Имя не может быть пустым");
      return;
    }
    setNameSaving(true);
    setNameMsg(null);
    const r = await updateProfile(trimmed);
    setNameSaving(false);
    if (r.ok) {
      await refreshUser();
      setEditingName(false);
    } else {
      setNameMsg(r.message || "Не удалось сохранить");
    }
  };

  const onSavePassword = async () => {
    setPwMsg(null);
    if (newPw.length < 8) {
      setPwMsg({ ok: false, text: "Новый пароль — минимум 8 символов" });
      return;
    }
    if (newPw !== newPw2) {
      setPwMsg({ ok: false, text: "Пароли не совпадают" });
      return;
    }
    setPwSaving(true);
    const r = await changePassword(newPw, curPw || undefined);
    setPwSaving(false);
    if (r.ok) {
      setPwMsg({ ok: true, text: r.message || "Пароль изменён" });
      setCurPw("");
      setNewPw("");
      setNewPw2("");
      setTimeout(() => setPwOpen(false), 1500);
    } else {
      setPwMsg({ ok: false, text: r.message || "Не удалось изменить пароль" });
    }
  };

  return (
    <section className="drawing-frame p-6 bg-[var(--drawing-bg)]">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="User" size={18} />
        <h2 className="font-gost-upright text-sm uppercase tracking-widest">Профиль</h2>
      </div>

      <dl className="space-y-3 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="font-gost text-[var(--drawing-line-thin)]">Email</dt>
          <dd className="font-mono break-all text-right">{user.email}</dd>
        </div>

        {/* Имя — редактируемое */}
        <div className="flex justify-between gap-2 items-start">
          <dt className="font-gost text-[var(--drawing-line-thin)] pt-1">Имя</dt>
          <dd className="text-right flex-1 min-w-0">
            {editingName ? (
              <div className="flex flex-col items-end gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={200}
                  autoFocus
                  className="w-full max-w-[220px] border border-[var(--drawing-line)] bg-transparent px-2 py-1 text-sm text-right"
                  placeholder="Ваше имя"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onSaveName}
                    disabled={nameSaving}
                    className="btn-drawing btn-drawing-accent text-[11px] inline-flex disabled:opacity-60"
                  >
                    <Icon name="Check" size={12} className="mr-1" />
                    {nameSaving ? "Сохраняю…" : "Сохранить"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingName(false);
                      setName(user.full_name || "");
                      setNameMsg(null);
                    }}
                    className="btn-drawing text-[11px]"
                  >
                    Отмена
                  </button>
                </div>
                {nameMsg && <p className="text-[11px] text-red-600">{nameMsg}</p>}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="inline-flex items-center gap-1.5 hover:text-[var(--drawing-accent)] transition"
              >
                <span>{user.full_name || "—"}</span>
                <Icon name="Pencil" size={12} className="text-[var(--drawing-line-thin)]" />
              </button>
            )}
          </dd>
        </div>

        <div className="flex justify-between gap-2">
          <dt className="font-gost text-[var(--drawing-line-thin)]">Email подтверждён</dt>
          <dd className="text-right">{user.email_verified ? "✓ да" : "✗ нет"}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="font-gost text-[var(--drawing-line-thin)]">Роли</dt>
          <dd className="text-right">{user.roles.join(", ") || "—"}</dd>
        </div>
      </dl>

      {/* Смена пароля */}
      <div className="mt-5 pt-4 border-t border-[var(--drawing-line)]/20">
        {!pwOpen ? (
          <button
            type="button"
            onClick={() => setPwOpen(true)}
            className="inline-flex items-center gap-1.5 font-gost text-xs uppercase tracking-wider text-[var(--drawing-accent)] hover:underline"
          >
            <Icon name="KeyRound" size={14} />
            Сменить пароль
          </button>
        ) : (
          <div className="space-y-2.5">
            <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
              Смена пароля
            </p>
            <input
              type="password"
              value={curPw}
              onChange={(e) => setCurPw(e.target.value)}
              placeholder="Текущий пароль (если есть)"
              autoComplete="current-password"
              className="w-full border border-[var(--drawing-line)] bg-transparent px-2 py-1.5 text-sm"
            />
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="Новый пароль (мин. 8 символов)"
              autoComplete="new-password"
              className="w-full border border-[var(--drawing-line)] bg-transparent px-2 py-1.5 text-sm"
            />
            <input
              type="password"
              value={newPw2}
              onChange={(e) => setNewPw2(e.target.value)}
              placeholder="Повторите новый пароль"
              autoComplete="new-password"
              className="w-full border border-[var(--drawing-line)] bg-transparent px-2 py-1.5 text-sm"
            />
            {pwMsg && (
              <p className={`text-[11px] ${pwMsg.ok ? "text-green-700" : "text-red-600"}`}>
                {pwMsg.text}
              </p>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSavePassword}
                disabled={pwSaving}
                className="btn-drawing btn-drawing-accent text-[11px] inline-flex disabled:opacity-60"
              >
                {pwSaving ? "Сохраняю…" : "Изменить пароль"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPwOpen(false);
                  setCurPw("");
                  setNewPw("");
                  setNewPw2("");
                  setPwMsg(null);
                }}
                className="btn-drawing text-[11px]"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProfileEditBlock;
