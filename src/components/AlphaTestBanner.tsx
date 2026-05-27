import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { ALPHA_TEST_MODE } from "@/lib/auth";

interface Props {
  /**
   * Размер плашки:
   *  - "compact" — небольшая полоска (для подвалов разделов и тарифов)
   *  - "full"    — крупный блок с CTA (для лендингов и страниц тарифов)
   */
  size?: "compact" | "full";
  /** Доп. классы для внешнего отступа */
  className?: string;
  /** Скрыть кнопку «Открыть редактор» */
  hideCta?: boolean;
}

/**
 * Универсальная плашка режима альфа-тестирования CAE-сервиса.
 * Рендерится только если ALPHA_TEST_MODE === true.
 *
 * Сообщает посетителю: на время альфы все функции CAE и расчёты бесплатны,
 * лимиты сняты, тарифные подписки временно не действуют.
 */
export default function AlphaTestBanner({
  size = "full",
  className = "",
  hideCta = false,
}: Props) {
  if (!ALPHA_TEST_MODE) return null;

  if (size === "compact") {
    return (
      <div
        className={`border-2 border-[var(--drawing-accent)] bg-[var(--drawing-accent)]/5 p-3 flex flex-wrap items-center gap-2 text-xs ${className}`}
      >
        <span className="inline-flex items-center gap-1 bg-[var(--drawing-accent)] text-white px-2 py-0.5 font-gost text-[10px] uppercase tracking-wider shrink-0">
          <Icon name="FlaskConical" size={10} />
          Альфа-тест
        </span>
        <span className="font-gost text-[var(--drawing-line)]">
          На&nbsp;время альфа-тестирования все расчёты бесплатны, тарифы временно не&nbsp;действуют.
        </span>
      </div>
    );
  }

  return (
    <div
      className={`border-2 border-[var(--drawing-accent)] bg-[var(--drawing-accent)]/5 p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 ${className}`}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <span className="shrink-0 w-10 h-10 border-2 border-[var(--drawing-accent)] flex items-center justify-center text-[var(--drawing-accent)]">
          <Icon name="FlaskConical" size={20} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="inline-flex items-center bg-[var(--drawing-accent)] text-white px-2 py-0.5 font-gost text-[10px] uppercase tracking-wider">
              Альфа-тест
            </span>
            <p className="font-gost-upright font-bold text-sm md:text-base">
              Все расчёты бесплатно
            </p>
          </div>
          <p className="font-gost text-xs md:text-sm text-[var(--drawing-line-thin)] leading-relaxed">
            CAE-сервис работает в&nbsp;режиме альфа-тестирования: лимиты на&nbsp;проекты, элементы и&nbsp;количество расчётов сняты. Тарифные подписки временно не&nbsp;действуют&nbsp;&mdash; всё доступно бесплатно. Помогите улучшить сервис обратной связью.
          </p>
        </div>
      </div>
      {!hideCta && (
        <Link
          to="/cae/demo"
          className="btn-drawing btn-drawing-accent text-xs inline-flex shrink-0 self-start md:self-center"
        >
          <Icon name="Calculator" size={14} className="mr-1.5" />
          Открыть редактор
        </Link>
      )}
    </div>
  );
}
