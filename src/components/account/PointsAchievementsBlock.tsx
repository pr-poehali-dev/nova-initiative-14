import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import {
  getReferralProfile,
  buildReferralUrl,
  type ReferralProfile,
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
            onClick={() => navigator.clipboard?.writeText(refUrl)}
            className="font-gost uppercase tracking-wider text-[10px] hover:text-[var(--drawing-accent)]"
            title="Скопировать"
          >
            Копировать
          </button>
        </div>
      )}

      {/* Ачивки */}
      <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-2">
        Ачивки ({profile.achievements.filter((a) => a.awarded).length}/{profile.achievements.length})
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {profile.achievements.map((a) => (
          <div
            key={a.code}
            className={`border-[1.5px] p-2.5 ${
              a.awarded
                ? "border-[var(--drawing-accent)] bg-[var(--drawing-accent)]/5"
                : "border-[var(--drawing-line)]/30 opacity-50 grayscale"
            }`}
            title={a.description || ""}
          >
            <div className="flex items-start gap-2">
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
          </div>
        ))}
      </div>
    </section>
  );
}
