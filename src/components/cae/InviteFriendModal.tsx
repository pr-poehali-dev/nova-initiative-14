import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import {
  buildReferralUrl,
  buildReferralMessage,
  getReferralProfile,
  type ReferralProfile,
} from "@/lib/referrals";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Модалка «Пригласить друга».
 *
 * Показывает реф-ссылку текущего юзера, текущие очки, активных рефералов
 * и краткое описание бонусов программы. Поддерживает копирование ссылки
 * и шеринг через нативный Web Share API на мобильных.
 */
export default function InviteFriendModal({ open, onClose }: Props) {
  const [profile, setProfile] = useState<ReferralProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getReferralProfile()
      .then((res) => {
        if (res.ok && res.data) setProfile(res.data);
      })
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const refUrl = buildReferralUrl(profile?.referral_code);
  const refMessage = buildReferralMessage(profile?.referral_code);

  const handleCopy = async () => {
    if (!refUrl) return;
    try {
      await navigator.clipboard.writeText(refUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard недоступен */
    }
  };

  const handleCopyMessage = async () => {
    if (!profile?.referral_code) return;
    try {
      await navigator.clipboard.writeText(refMessage);
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 2000);
    } catch {
      /* clipboard недоступен */
    }
  };

  const handleShare = async () => {
    if (!profile?.referral_code) return;
    // Шерим уже готовый «продающий» текст вместе со ссылкой.
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Диплом-Инж.рф · CAE-расчёты",
          text: refMessage,
        });
      } catch {
        /* пользователь отменил */
      }
    } else {
      handleCopyMessage();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Пригласить друга"
      onClick={onClose}
    >
      <div
        className="bg-[var(--drawing-bg)] border-[2.5px] border-[var(--drawing-line)] max-w-md w-full relative flex flex-col max-h-[90dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-px -left-px w-3 h-3 border-t-[2.5px] border-l-[2.5px] border-[var(--drawing-accent)] pointer-events-none" />
        <div className="absolute -top-px -right-px w-3 h-3 border-t-[2.5px] border-r-[2.5px] border-[var(--drawing-accent)] pointer-events-none" />
        <div className="absolute -bottom-px -left-px w-3 h-3 border-b-[2.5px] border-l-[2.5px] border-[var(--drawing-accent)] pointer-events-none" />
        <div className="absolute -bottom-px -right-px w-3 h-3 border-b-[2.5px] border-r-[2.5px] border-[var(--drawing-accent)] pointer-events-none" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute top-2 right-2 z-10 p-1.5 bg-[var(--drawing-bg)] hover:bg-[var(--drawing-line)]/10 transition-colors"
        >
          <Icon name="X" size={16} />
        </button>

        <div className="p-5 pt-6 overflow-y-auto">
          <div className="flex items-start gap-3 mb-4">
            <div className="bg-[var(--drawing-accent)] text-white p-2 shrink-0">
              <Icon name="UserPlus" size={20} />
            </div>
            <div>
              <p className="font-gost text-[10px] uppercase tracking-[0.25em] text-[var(--drawing-line-thin)] mb-1">
                Реферальная программа
              </p>
              <h2 className="font-gost-upright text-xl font-black uppercase tracking-wide leading-tight">
                Пригласить друга
              </h2>
            </div>
          </div>

          <p className="text-sm text-[var(--drawing-line-thin)] mb-4 leading-snug">
            Поделитесь ссылкой. Когда друг зарегистрируется, вы&nbsp;оба получите{" "}
            <strong className="text-[var(--drawing-line)]">+10&nbsp;баллов</strong>. За&nbsp;каждый день,
            когда друг сделает расчёт в&nbsp;CAE, вам начисляется ещё{" "}
            <strong className="text-[var(--drawing-line)]">+1&nbsp;балл</strong>.
          </p>

          {/* Текущие показатели */}
          {profile && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="border-[1.5px] border-[var(--drawing-line)] p-2 text-center">
                <p className="font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
                  Баллов
                </p>
                <p className="font-gost-upright text-lg font-black text-[var(--drawing-accent)]">
                  {profile.total_points}
                </p>
              </div>
              <div className="border-[1.5px] border-[var(--drawing-line)] p-2 text-center">
                <p className="font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
                  Друзей
                </p>
                <p className="font-gost-upright text-lg font-black">
                  {profile.referrals_count}
                </p>
              </div>
              <div className="border-[1.5px] border-[var(--drawing-line)] p-2 text-center">
                <p className="font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
                  Место
                </p>
                <p className="font-gost-upright text-lg font-black">
                  #{profile.rank}
                </p>
              </div>
            </div>
          )}

          {/* Реф-ссылка */}
          <label className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] block mb-1">
            Ваша персональная ссылка
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              readOnly
              value={loading ? "Загружаем…" : refUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="drawing-input flex-1 font-mono text-xs"
            />
            <button
              type="button"
              onClick={handleCopy}
              disabled={!refUrl}
              className="btn-drawing text-xs px-3 disabled:opacity-50"
              title="Скопировать"
            >
              <Icon name={copied ? "Check" : "Copy"} size={14} />
            </button>
          </div>

          {/* Готовое сообщение для пересылки другу */}
          <div className="flex items-center justify-between mb-1">
            <label className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
              Готовое сообщение другу
            </label>
            <button
              type="button"
              onClick={handleCopyMessage}
              disabled={!profile?.referral_code}
              className={`font-gost uppercase tracking-wider text-[10px] inline-flex items-center gap-1 transition-colors disabled:opacity-50 ${
                copiedMsg ? "text-[var(--drawing-accent)]" : "text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)]"
              }`}
              title="Скопировать текст"
            >
              <Icon name={copiedMsg ? "Check" : "Copy"} size={11} />
              {copiedMsg ? "Скопировано" : "Копировать текст"}
            </button>
          </div>
          <textarea
            readOnly
            value={loading ? "Загружаем…" : refMessage}
            onFocus={(e) => e.currentTarget.select()}
            rows={7}
            className="drawing-input w-full text-xs leading-relaxed resize-none mb-3 bg-[var(--drawing-bg)] text-[var(--drawing-line)]"
          />

          <button
            type="button"
            onClick={handleShare}
            disabled={!profile?.referral_code}
            className="btn-drawing btn-drawing-accent text-xs w-full justify-center disabled:opacity-50"
          >
            <Icon name="Share2" size={14} className="mr-1.5" />
            Поделиться сообщением
          </button>

          <div className="mt-4 pt-3 border-t border-dashed border-[var(--drawing-line)]/30 text-xs text-[var(--drawing-line-thin)] leading-relaxed">
            <p className="font-gost-upright font-bold text-[var(--drawing-line)] mb-1">
              Что дают баллы:
            </p>
            <ul className="space-y-0.5">
              <li>&middot; Место в&nbsp;листе ожидания приоритетной волны</li>
              <li>&middot; Лучшие условия после старта CAE (пропорционально рейтингу)</li>
              <li>&middot; Ачивки: «Связной», «Амбассадор», «Адвокат CAE»</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}