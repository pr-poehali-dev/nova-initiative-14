import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Сколько расчётов уже использовано (для текста). */
  usedSolves?: number;
  /** Сколько даём в демо. */
  solveLimit?: number;
}

/**
 * Модалка «Демо-лимит исчерпан».
 *
 * Открывается после исчерпания 2-х бесплатных расчётов в демо-редакторе.
 * Содержит:
 *  - объяснение, что даёт регистрация (безлимит на альфа-тесте);
 *  - чекбоксы согласий (персональные данные обязательно, рассылка по желанию);
 *  - чекбокс «попасть в лист ожидания приоритетной волны» (выделенный);
 *  - кнопку «Зарегистрироваться» (ведёт на /register с параметрами).
 *
 * Согласия отправляются через query-string в /register, чтобы форма
 * регистрации могла их предзаполнить.
 */
export default function DemoLimitModal({ open, onClose, usedSolves = 2, solveLimit = 2 }: Props) {
  const [agreePdn, setAgreePdn] = useState(true);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [joinWaitlist, setJoinWaitlist] = useState(true);

  if (!open) return null;

  const registerUrl =
    `/register?from=cae-demo` +
    (agreeMarketing ? `&marketing=1` : ``) +
    (joinWaitlist ? `&waitlist=1` : ``);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Демо-лимит исчерпан"
    >
      <div className="bg-[var(--drawing-bg)] border-[2.5px] border-[var(--drawing-line)] max-w-md w-full relative my-4">
        {/* Чертёжные уголки */}
        <div className="absolute -top-px -left-px w-3 h-3 border-t-[2.5px] border-l-[2.5px] border-[var(--drawing-accent)]" />
        <div className="absolute -top-px -right-px w-3 h-3 border-t-[2.5px] border-r-[2.5px] border-[var(--drawing-accent)]" />
        <div className="absolute -bottom-px -left-px w-3 h-3 border-b-[2.5px] border-l-[2.5px] border-[var(--drawing-accent)]" />
        <div className="absolute -bottom-px -right-px w-3 h-3 border-b-[2.5px] border-r-[2.5px] border-[var(--drawing-accent)]" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute top-2 right-2 p-1.5 hover:bg-[var(--drawing-line)]/10 transition-colors"
        >
          <Icon name="X" size={16} />
        </button>

        <div className="p-5 pt-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="bg-[var(--drawing-accent)] text-white p-2 shrink-0">
              <Icon name="Lock" size={20} />
            </div>
            <div>
              <p className="font-gost text-[10px] uppercase tracking-[0.25em] text-[var(--drawing-line-thin)] mb-1">
                Демо-лимит
              </p>
              <h2 className="font-gost-upright text-xl font-black uppercase tracking-wide leading-tight">
                Пробных расчётов больше нет
              </h2>
            </div>
          </div>

          <p className="text-sm text-[var(--drawing-line-thin)] mb-4 leading-snug">
            Вы использовали <strong className="text-[var(--drawing-line)]">{usedSolves} из&nbsp;{solveLimit}</strong>{" "}
            бесплатных расчётов без&nbsp;регистрации. Чтобы продолжить&nbsp;&mdash; создайте аккаунт.
          </p>

          <div className="border-[1.5px] border-[var(--drawing-accent)] bg-[var(--drawing-accent)]/5 p-3 mb-4">
            <p className="font-gost-upright font-bold text-sm mb-2 flex items-center gap-2">
              <Icon name="Sparkles" size={14} className="text-[var(--drawing-accent)]" />
              После регистрации на альфа-тесте:
            </p>
            <ul className="text-xs text-[var(--drawing-line)] space-y-1 leading-snug">
              <li className="flex gap-2">
                <Icon name="Check" size={12} className="text-[var(--drawing-accent)] mt-0.5 shrink-0" />
                Расчёты без&nbsp;ограничений
              </li>
              <li className="flex gap-2">
                <Icon name="Check" size={12} className="text-[var(--drawing-accent)] mt-0.5 shrink-0" />
                Сохранение проектов и&nbsp;история версий
              </li>
              <li className="flex gap-2">
                <Icon name="Check" size={12} className="text-[var(--drawing-accent)] mt-0.5 shrink-0" />
                Экспорт отчёта в&nbsp;PDF
              </li>
              <li className="flex gap-2">
                <Icon name="Check" size={12} className="text-[var(--drawing-accent)] mt-0.5 shrink-0" />
                Очки и&nbsp;ачивки за&nbsp;приглашение друзей
              </li>
            </ul>
          </div>

          <div className="space-y-2 mb-4">
            <label className="flex items-start gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={agreePdn}
                onChange={(e) => setAgreePdn(e.target.checked)}
                className="mt-0.5 accent-[var(--drawing-accent)]"
              />
              <span className="text-[var(--drawing-line)] leading-snug">
                Согласен на&nbsp;обработку{" "}
                <Link to="/privacy" target="_blank" className="underline hover:text-[var(--drawing-accent)]">
                  персональных данных
                </Link>{" "}
                и&nbsp;принимаю{" "}
                <Link to="/offer" target="_blank" className="underline hover:text-[var(--drawing-accent)]">
                  условия оферты
                </Link>{" "}
                <span className="text-red-700">*</span>
              </span>
            </label>

            <label className="flex items-start gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={agreeMarketing}
                onChange={(e) => setAgreeMarketing(e.target.checked)}
                className="mt-0.5 accent-[var(--drawing-accent)]"
              />
              <span className="text-[var(--drawing-line-thin)] leading-snug">
                Хочу получать новости о&nbsp;запуске тарифов и&nbsp;инженерные материалы (можно отписаться в&nbsp;1&nbsp;клик)
              </span>
            </label>

            <label className="flex items-start gap-2 text-xs cursor-pointer border-[1.5px] border-[var(--drawing-accent)] bg-[var(--drawing-accent)]/10 p-2 -mx-1">
              <input
                type="checkbox"
                checked={joinWaitlist}
                onChange={(e) => setJoinWaitlist(e.target.checked)}
                className="mt-0.5 accent-[var(--drawing-accent)]"
              />
              <span className="leading-snug">
                <strong className="text-[var(--drawing-accent)] font-gost-upright uppercase tracking-wider text-[11px]">
                  Лист ожидания приоритетной волны
                </strong>
                <br />
                <span className="text-[var(--drawing-line-thin)]">
                  Первым получу полный доступ к&nbsp;CAE и&nbsp;лучшие условия после официального старта
                </span>
              </span>
            </label>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-drawing text-xs flex-1"
            >
              Позже
            </button>
            <Link
              to={registerUrl}
              aria-disabled={!agreePdn}
              onClick={(e) => {
                if (!agreePdn) {
                  e.preventDefault();
                }
              }}
              className={`btn-drawing btn-drawing-accent text-xs flex-1 inline-flex items-center justify-center ${!agreePdn ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Зарегистрироваться&nbsp;&rarr;
            </Link>
          </div>

          <p className="text-[10px] text-[var(--drawing-line-thin)] mt-3 text-center">
            Уже есть аккаунт?{" "}
            <Link to="/login" className="underline hover:text-[var(--drawing-accent)]">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
