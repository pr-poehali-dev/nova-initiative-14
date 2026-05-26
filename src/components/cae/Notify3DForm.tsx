/**
 * Форма подписки на анонс 3D-редактора.
 * Переиспользуется на странице «Мои проекты» (тизер) и на CaeLanding (отдельная секция).
 *
 * Использует joinWaitlist с referral_source = "3d_teaser".
 * Обязательно запрашивает явное согласие на получение новостей.
 */
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { joinWaitlist } from "@/lib/cae";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  /** Визуальный вариант: compact — инлайн, full — карточка */
  variant?: "compact" | "full";
}

const Notify3DForm = ({ variant = "compact" }: Props) => {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || "");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setError("Необходимо дать согласие на получение новостей.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await joinWaitlist({
      email: email.trim().toLowerCase(),
      referral_source: "3d_teaser",
      purpose: "3d_notify",
    });
    setBusy(false);
    if (res.ok) {
      setDone(true);
    } else {
      setError(res.message || res.error || "Не удалось подписаться. Попробуйте позже.");
    }
  };

  if (done) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--drawing-accent)]">
        <Icon name="CheckCircle2" size={18} />
        <span className="font-gost-upright font-bold">
          Подписка оформлена — напишем на&nbsp;{email} как только запустим 3D.
        </span>
      </div>
    );
  }

  if (variant === "full") {
    return (
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] block mb-2">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="drawing-input"
            placeholder="ivan@example.ru"
          />
        </div>

        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 shrink-0 accent-[var(--drawing-accent)]"
            required
          />
          <span className="text-xs text-[var(--drawing-line-thin)] leading-relaxed group-hover:text-[var(--drawing-ink)]">
            Я согласен получать новости и&nbsp;анонсы от&nbsp;Диплом-Инж.рф на&nbsp;указанный email.
            Отписаться можно в&nbsp;любой момент.{" "}
            <Link to="/privacy" className="underline hover:text-[var(--drawing-accent)]">
              Политика конфиденциальности
            </Link>
            .
          </span>
        </label>

        {error && (
          <p className="font-gost text-xs text-[var(--drawing-accent)] border-l-2 border-[var(--drawing-accent)] pl-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !consent}
          className="btn-drawing btn-drawing-accent w-full justify-center disabled:opacity-40"
        >
          <Icon name="Bell" size={14} className="mr-1.5" />
          {busy ? "Подписываем…" : "Уведомить меня о запуске 3D"}
        </button>
      </form>
    );
  }

  // compact — горизонтальная форма для тизера в CaeProjects
  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="drawing-input flex-1 text-sm"
          placeholder="email для уведомления"
        />
        <button
          type="submit"
          disabled={busy || !consent}
          className="btn-drawing btn-drawing-accent text-xs shrink-0 inline-flex disabled:opacity-40"
        >
          <Icon name="Bell" size={13} className="mr-1.5" />
          {busy ? "…" : "Уведомить"}
        </button>
      </div>
      <label className="flex items-start gap-2 cursor-pointer group">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 shrink-0 accent-[var(--drawing-accent)]"
        />
        <span className="text-[11px] text-[var(--drawing-line-thin)] leading-snug group-hover:text-[var(--drawing-ink)]">
          Согласен получать новости и&nbsp;анонсы от&nbsp;Диплом-Инж.рф.{" "}
          <Link to="/privacy" className="underline hover:text-[var(--drawing-accent)]">
            Политика конфиденциальности
          </Link>
          .
        </span>
      </label>
      {error && (
        <p className="font-gost text-[11px] text-[var(--drawing-accent)] mt-2 border-l-2 border-[var(--drawing-accent)] pl-2">
          {error}
        </p>
      )}
    </form>
  );
};

export default Notify3DForm;
