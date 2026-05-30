import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import {
  getReferralProfile,
  getMyReferrals,
  applyRefCode,
  buildReferralUrl,
  type ReferralProfile,
  type ReferralFriend,
  type Achievement,
} from "@/lib/referrals";

interface Props {
  /** Обработчик клика «Пригласить друга» — открывает существующую модалку. */
  onInvite: () => void;
}

/**
 * Блок «Очки и ачивки» для страницы /account.
 *
 * Показывает реф-код, общий счёт баллов, кол-во активных рефералов,
 * место в рейтинге, статус листа ожидания и сетку ачивок.
 * Данные подгружаются с referral-api при монтировании.
 */
export default function PointsAchievementsBlock({ onInvite }: Props) {
  const [profile, setProfile] = useState<ReferralProfile | null>(null);
  const [friends, setFriends] = useState<ReferralFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [selected, setSelected] = useState<Achievement | null>(null);

  // Ввод кода приглашения «позже»
  const [codeInput, setCodeInput] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyMsg, setApplyMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleCopy = async (text: string, what: "code" | "link") => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard недоступен в этом контексте */
    }
  };

  const loadAll = () => {
    setLoading(true);
    getReferralProfile()
      .then((res) => {
        if (res.ok && res.data) {
          setProfile(res.data);
          setError(null);
        } else {
          setError(res.message || "Не удалось загрузить очки");
        }
      })
      .finally(() => setLoading(false));
    getMyReferrals().then((res) => {
      if (res.ok && res.data) setFriends(res.data.referrals);
    });
  };

  useEffect(loadAll, []);

  const onApplyCode = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setApplying(true);
    const res = await applyRefCode(code);
    setApplying(false);
    if (res.ok) {
      setApplyMsg({ ok: true, text: "Код применён! Баллы начислены." });
      setCodeInput("");
      loadAll();
    } else {
      setApplyMsg({ ok: false, text: res.message || "Не удалось применить код" });
    }
  };

  if (loading) {
    return (
      <div className="border-[1.5px] border-[var(--drawing-line)] p-4 mb-6 text-center font-gost text-xs uppercase tracking-wider text-[var(--drawing-line-thin)]">
        Загружаем&nbsp;баллы…
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="border-[1.5px] border-[var(--drawing-line)] p-4 mb-6 text-xs text-[var(--drawing-line-thin)]">
        {error || "Нет данных о баллах"}
      </div>
    );
  }

  const refUrl = buildReferralUrl(profile.referral_code);

  return (
    <section className="mb-8">
      <div className="mb-3">
        <p className="font-gost text-[10px] uppercase tracking-[0.25em] text-[var(--drawing-line-thin)] mb-1">
          Реферальная программа
        </p>
        <h2 className="font-gost-upright text-lg md:text-xl font-black uppercase tracking-wide">
          Приглашайте друзей и зарабатывайте баллы
        </h2>
      </div>

      {/* ── Заметный блок приглашения ── */}
      <div className="border-2 border-[var(--drawing-accent)] bg-[var(--drawing-accent)]/5 p-4 md:p-5 mb-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="shrink-0 w-11 h-11 border-2 border-[var(--drawing-accent)] flex items-center justify-center text-[var(--drawing-accent)]">
            <Icon name="Gift" size={22} />
          </div>
          <div className="min-w-0">
            <p className="font-gost-upright font-black text-base md:text-lg leading-tight">
              +10 баллов за каждого друга
            </p>
            <p className="text-sm text-[var(--drawing-line-thin)] leading-snug mt-0.5">
              И&nbsp;ещё +1&nbsp;балл за&nbsp;каждый день, когда приглашённый делает расчёты.
              Чем больше инженеров&nbsp;— тем выше вы в&nbsp;рейтинге и&nbsp;ближе к&nbsp;топ-100.
            </p>
          </div>
        </div>

        {/* Код приглашения — крупно, отдельно, для пересылки */}
        <div className="grid sm:grid-cols-[auto_1fr] gap-3 items-stretch">
          <div className="border-2 border-[var(--drawing-accent)] bg-[var(--drawing-bg)] px-4 py-3 text-center">
            <p className="font-gost text-[9px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1">
              Ваш код
            </p>
            <div className="flex items-center justify-center gap-2">
              <span className="font-gost-upright text-2xl md:text-3xl font-black tracking-[0.15em] text-[var(--drawing-accent)] font-mono">
                {profile.referral_code}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(profile.referral_code, "code")}
                aria-label="Скопировать код"
                title="Скопировать код"
                className="shrink-0 text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] transition-colors"
              >
                <Icon name={copied === "code" ? "Check" : "Copy"} size={18} />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 justify-center">
            {/* Ссылка (кириллический домен, без punycode) */}
            <div className="border border-dashed border-[var(--drawing-line)] px-3 py-2 flex items-center gap-2 text-xs bg-[var(--drawing-bg)]">
              <Icon name="Link" size={14} className="text-[var(--drawing-line-thin)] shrink-0" />
              <input
                type="text"
                readOnly
                value={refUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 bg-transparent font-mono text-[var(--drawing-line)] outline-none min-w-0"
              />
              <button
                type="button"
                onClick={() => handleCopy(refUrl, "link")}
                className={`font-gost uppercase tracking-wider text-[10px] inline-flex items-center gap-1 shrink-0 transition-colors ${
                  copied === "link" ? "text-[var(--drawing-accent)]" : "text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)]"
                }`}
              >
                <Icon name={copied === "link" ? "Check" : "Copy"} size={11} />
                {copied === "link" ? "Готово" : "Ссылка"}
              </button>
            </div>
            <button
              type="button"
              onClick={onInvite}
              className="btn-drawing btn-drawing-accent text-xs inline-flex items-center justify-center w-full"
            >
              <Icon name="Share2" size={13} className="mr-1.5" />
              Поделиться приглашением
            </button>
          </div>
        </div>
      </div>

      {/* ── Ввод кода приглашения, если ещё не привязан ── */}
      {!profile.has_referrer && (
        <div className="border border-dashed border-[var(--drawing-line)] p-3 mb-4">
          <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-2">
            Вас кто-то пригласил? Введите его код
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="НАПРИМЕР, AB12CD34"
              maxLength={16}
              className="drawing-input text-sm flex-1 bg-[var(--drawing-bg)] text-[var(--drawing-line)] font-mono"
            />
            <button
              type="button"
              onClick={onApplyCode}
              disabled={applying || !codeInput.trim()}
              className="btn-drawing text-xs disabled:opacity-50"
            >
              {applying ? "Применяем…" : "Применить код"}
            </button>
          </div>
          {applyMsg && (
            <p className={`text-xs mt-2 ${applyMsg.ok ? "text-[var(--drawing-accent)]" : "text-red-700"}`}>
              {applyMsg.text}
            </p>
          )}
        </div>
      )}

      {/* Метрики */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <div className="border-[2px] border-[var(--drawing-accent)] bg-[var(--drawing-accent)]/5 p-3">
          <p className="font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-1">
            Всего баллов
          </p>
          <p className="font-gost-upright text-2xl font-black text-[var(--drawing-accent)] leading-none">
            {profile.total_points}
          </p>
        </div>
        <div className="border-[1.5px] border-[var(--drawing-line)] p-3">
          <p className="font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-1">
            Друзей приглашено
          </p>
          <p className="font-gost-upright text-2xl font-black leading-none">
            {profile.referrals_count}
            <span className="text-xs font-gost text-[var(--drawing-line-thin)] ml-1 font-normal">
              ({profile.active_referrals_count} актив.)
            </span>
          </p>
        </div>
        <div className="border-[1.5px] border-[var(--drawing-line)] p-3">
          <p className="font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-1">
            Место в рейтинге
          </p>
          <p className="font-gost-upright text-2xl font-black leading-none">
            #{profile.rank}
          </p>
        </div>
        <div className="border-[1.5px] border-[var(--drawing-line)] p-3">
          <p className="font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-1">
            Активных за неделю
          </p>
          <p className="font-gost-upright text-2xl font-black leading-none">
            {friends.filter((f) => f.week.runs > 0).length}
          </p>
        </div>
      </div>

      {/* ── Список приглашённых с активностью ── */}
      {friends.length > 0 && <ReferralsList friends={friends} />}

      {/* Ачивки */}
      <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-2">
        Ачивки ({profile.achievements.filter((a) => a.awarded).length}/{profile.achievements.length})
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {profile.achievements.map((a) => {
          const pct = a.awarded
            ? 100
            : a.progress
              ? Math.min(100, Math.round((a.progress.current / a.progress.target) * 100))
              : 0;
          return (
            <button
              type="button"
              key={a.code}
              onClick={() => setSelected(a)}
              className={`text-left border-[1.5px] p-2.5 transition-colors hover:bg-[var(--drawing-accent)]/10 ${
                a.awarded
                  ? "border-[var(--drawing-accent)] bg-[var(--drawing-accent)]/5"
                  : "border-[var(--drawing-line)]/30"
              }`}
            >
              <div className={`flex items-start gap-2 ${a.awarded ? "" : "opacity-60"}`}>
                {a.icon && (
                  <Icon
                    name={a.icon}
                    fallback="Award"
                    size={18}
                    className={a.awarded ? "text-[var(--drawing-accent)]" : "text-[var(--drawing-line-thin)]"}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-gost-upright text-xs font-bold leading-tight truncate">
                    {a.title}
                  </p>
                  <p className="font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
                    {a.awarded ? "Получено" : `+${a.points} баллов`}
                  </p>
                </div>
              </div>
              {/* Прогресс-бар: для ачивок с порогом — реальный, иначе 0/100 */}
              <div className="mt-2 h-1 w-full bg-[var(--drawing-line)]/15 overflow-hidden">
                <div
                  className={`h-full ${a.awarded ? "bg-[var(--drawing-accent)]" : "bg-[var(--drawing-line)]/50"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {a.progress && !a.awarded && (
                <p className="font-gost text-[8px] uppercase tracking-wider text-[var(--drawing-line-thin)] mt-1 text-right">
                  {a.progress.current}/{a.progress.target}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <AchievementModal achievement={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}

/**
 * Список приглашённых друзей с их активностью за последнюю неделю:
 * сколько проектов в работе, расчётов, средняя сложность и отношение
 * элементов к узлам (показатель «насыщенности» схемы).
 */
function ReferralsList({ friends }: { friends: ReferralFriend[] }) {
  const [open, setOpen] = useState(false);
  const preview = open ? friends : friends.slice(0, 3);

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" }) : "";

  return (
    <div className="mb-5">
      <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-2">
        Приглашённые · активность за&nbsp;неделю
      </p>
      <div className="space-y-2">
        {preview.map((f, i) => (
          <div
            key={i}
            className="border-[1.5px] border-[var(--drawing-line)] p-3 flex flex-wrap items-center gap-x-4 gap-y-2"
          >
            <div className="flex items-center gap-2 min-w-[120px] flex-1">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  f.week.runs > 0 ? "bg-[var(--drawing-accent)]" : f.ever_active ? "bg-amber-600" : "bg-[var(--drawing-line-thin)]/50"
                }`}
                title={f.week.runs > 0 ? "Активен на этой неделе" : f.ever_active ? "Был активен раньше" : "Ещё не считал"}
              />
              <div className="min-w-0">
                <p className="font-gost-upright font-bold text-sm truncate">{f.name}</p>
                <p className="font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
                  с {fmtDate(f.joined_at)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-center">
              <Metric value={f.week.active_projects} label="проектов" />
              <Metric value={f.week.runs} label="расчётов" />
              <Metric
                value={f.week.avg_complexity != null ? f.week.avg_complexity : "—"}
                label="ср. слож."
                hint="Среднее число элементов в расчёте"
              />
              <Metric
                value={f.week.avg_ratio != null ? f.week.avg_ratio : "—"}
                label="элем/узл"
                hint="Отношение элементов к узлам — насыщенность схемы"
              />
            </div>
          </div>
        ))}
      </div>
      {friends.length > 3 && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full border border-dashed border-[var(--drawing-line)]/50 py-2 mt-2 text-[10px] font-gost uppercase tracking-wider text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] hover:border-[var(--drawing-accent)] flex items-center justify-center gap-1.5 transition-colors"
        >
          <Icon name={open ? "ChevronUp" : "ChevronDown"} size={12} />
          {open ? "Свернуть" : `Показать всех (${friends.length})`}
        </button>
      )}
    </div>
  );
}

function Metric({
  value,
  label,
  hint,
}: {
  value: number | string;
  label: string;
  hint?: string;
}) {
  return (
    <div title={hint} className="min-w-[44px]">
      <p className="font-gost-upright text-base font-black leading-none">{value}</p>
      <p className="font-gost text-[8px] uppercase tracking-wider text-[var(--drawing-line-thin)] mt-0.5">
        {label}
      </p>
    </div>
  );
}

/**
 * Модалка ачивки: крупная иконка, название, описание и прогресс.
 * Открывается по клику на карточку в сетке ачивок.
 */
function AchievementModal({
  achievement: a,
  onClose,
}: {
  achievement: Achievement;
  onClose: () => void;
}) {
  const pct = a.awarded
    ? 100
    : a.progress
      ? Math.min(100, Math.round((a.progress.current / a.progress.target) * 100))
      : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="drawing-frame bg-[var(--drawing-bg)] max-w-sm w-full p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute top-3 right-3 p-1 text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] transition-colors"
        >
          <Icon name="X" size={18} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div
            className={`mb-3 flex items-center justify-center w-16 h-16 border-[2px] ${
              a.awarded
                ? "border-[var(--drawing-accent)] bg-[var(--drawing-accent)]/10"
                : "border-[var(--drawing-line)]/30 opacity-60"
            }`}
          >
            <Icon
              name={a.icon || "Award"}
              fallback="Award"
              size={32}
              className={a.awarded ? "text-[var(--drawing-accent)]" : "text-[var(--drawing-line-thin)]"}
            />
          </div>
          <h3 className="font-gost-upright text-lg font-black uppercase tracking-wide mb-1">
            {a.title}
          </h3>
          <span
            className={`font-gost text-[10px] uppercase tracking-wider mb-3 ${
              a.awarded ? "text-[var(--drawing-accent)]" : "text-[var(--drawing-line-thin)]"
            }`}
          >
            {a.awarded ? "✓ Получено" : `Награда: +${a.points} баллов`}
          </span>
          {a.description && (
            <p className="text-sm leading-snug text-[var(--drawing-line)] mb-4">
              {a.description}
            </p>
          )}

          <div className="w-full">
            <div className="h-2 w-full bg-[var(--drawing-line)]/15 overflow-hidden">
              <div
                className={`h-full transition-all ${a.awarded ? "bg-[var(--drawing-accent)]" : "bg-[var(--drawing-line)]/50"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] mt-2">
              {a.awarded
                ? "Выполнено"
                : a.progress
                  ? `Прогресс: ${a.progress.current} из ${a.progress.target}`
                  : "Ещё не получено"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}