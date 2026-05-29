import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import {
  getReferralProfile,
  buildReferralUrl,
  type ReferralProfile,
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selected, setSelected] = useState<Achievement | null>(null);

  const handleCopy = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard недоступен в этом контексте */
    }
  };

  useEffect(() => {
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
  }, []);

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
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="font-gost text-[10px] uppercase tracking-[0.25em] text-[var(--drawing-line-thin)] mb-1">
            Реферальная программа
          </p>
          <h2 className="font-gost-upright text-lg md:text-xl font-black uppercase tracking-wide">
            Баллы и ачивки
          </h2>
        </div>
        <button
          type="button"
          onClick={onInvite}
          className="btn-drawing btn-drawing-accent text-xs inline-flex"
        >
          <Icon name="UserPlus" size={13} className="mr-1.5" />
          Пригласить друга
        </button>
      </div>

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
            Реф-код
          </p>
          <p className="font-gost-upright text-base font-bold leading-tight font-mono">
            {profile.referral_code}
          </p>
        </div>
      </div>

      {/* Реф-ссылка */}
      {refUrl && (
        <div className="border border-dashed border-[var(--drawing-line)] p-3 mb-4 flex items-center gap-2 text-xs">
          <Icon name="Link" size={14} className="text-[var(--drawing-line-thin)] shrink-0" />
          <input
            type="text"
            readOnly
            value={refUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 bg-transparent font-mono text-[var(--drawing-line)] outline-none"
          />
          <button
            type="button"
            onClick={() => handleCopy(refUrl)}
            className={`font-gost uppercase tracking-wider text-[10px] inline-flex items-center gap-1 transition-colors ${
              copied
                ? "text-[var(--drawing-accent)]"
                : "text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)]"
            }`}
            title="Скопировать"
          >
            <Icon name={copied ? "Check" : "Copy"} size={11} />
            {copied ? "Скопировано" : "Копировать"}
          </button>
        </div>
      )}

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