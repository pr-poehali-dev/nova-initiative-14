/**
 * Блок «Моя подписка» в личном кабинете.
 *
 * Показывает реальный статус доступа пользователя:
 *  - CAE: режим альфа-теста (все расчёты бесплатны) — берётся из getUserPlan;
 *  - Наставничество: ссылка на подбор тарифа;
 *  - дата регистрации и баллы лояльности.
 *
 * Намеренно НЕ выдумываем платных подписок: пока действует альфа-тест, честно
 * сообщаем, что функции открыты бесплатно.
 */
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { getUserPlan, ALPHA_TEST_MODE } from "@/lib/auth";

const formatRuDate = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

const SubscriptionBlock = () => {
  const { user } = useAuth();
  if (!user) return null;

  const plan = getUserPlan(user);
  const isAlpha = plan === "alpha" || ALPHA_TEST_MODE;

  return (
    <section className="drawing-frame p-6 bg-[var(--drawing-bg)] mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="CreditCard" size={18} />
        <h2 className="font-gost-upright text-sm uppercase tracking-widest">Моя подписка</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 text-sm">
        {/* CAE-доступ */}
        <div className="border border-[var(--drawing-line)]/30 p-3">
          <p className="font-gost text-[var(--drawing-line-thin)] text-[10px] uppercase tracking-wider mb-2">
            CAE-калькулятор
          </p>
          {isAlpha ? (
            <>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1 bg-[var(--drawing-accent)] text-white px-2 py-0.5 font-gost text-[10px] uppercase tracking-wider">
                  <Icon name="FlaskConical" size={10} />
                  Альфа-тест
                </span>
                <span className="font-gost text-xs text-[var(--drawing-line)]">бесплатно</span>
              </div>
              <p className="text-[var(--drawing-line-thin)] text-xs leading-snug">
                Все расчёты и функции открыты на время альфа-тестирования. Лимиты сняты.
              </p>
              <Link
                to="/cae/changelog"
                className="inline-flex items-center gap-1 mt-2 text-[var(--drawing-accent)] text-xs hover:underline"
              >
                <Icon name="ListChecks" size={12} />
                Что нового в CAE
              </Link>
            </>
          ) : (
            <p className="text-[var(--drawing-line)]">
              План: <strong>{plan}</strong>
            </p>
          )}
        </div>

        {/* Наставничество */}
        <div className="border border-[var(--drawing-line)]/30 p-3">
          <p className="font-gost text-[var(--drawing-line-thin)] text-[10px] uppercase tracking-wider mb-2">
            Наставничество
          </p>
          <p className="text-[var(--drawing-line)] text-xs leading-snug mb-2">
            Индивидуальное сопровождение дипломного проекта подбирается на диагностике.
          </p>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-1 text-[var(--drawing-accent)] text-xs hover:underline"
          >
            <Icon name="ArrowRight" size={12} />
            Подобрать тариф
          </Link>
        </div>
      </div>

      {/* Сводка аккаунта */}
      <dl className="mt-4 pt-3 border-t border-[var(--drawing-line)]/20 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <div className="flex justify-between gap-2">
          <dt className="font-gost text-[var(--drawing-line-thin)]">В проекте с</dt>
          <dd className="text-right">{formatRuDate(user.created_at)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="font-gost text-[var(--drawing-line-thin)]">Email</dt>
          <dd className="text-right">
            {user.email_verified ? (
              <span className="text-green-700">подтверждён</span>
            ) : (
              <Link to="/verify-email" className="text-amber-700 hover:underline">
                не подтверждён
              </Link>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
};

export default SubscriptionBlock;
