import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import useTariffs, { formatPriceWithCurrency, type Tariff } from "@/hooks/useTariffs";

const ICONS: Record<string, string> = {
  "express": "Zap",
  "individual-month": "User",
  "group-month": "Users",
  "individual-3month": "BookOpen",
  "group-3month": "GraduationCap",
};

function TariffCard({ t }: { t: Tariff }) {
  const icon = ICONS[t.slug] ?? "FileText";

  return (
    <div
      className={`flex flex-col bg-[var(--drawing-bg)] ${
        t.is_popular
          ? "border-2 border-[var(--drawing-accent)]"
          : "border-[1.5px] border-[var(--drawing-line)]"
      }`}
    >
      {/* Шапка */}
      <div
        className={`px-4 py-2.5 flex items-center justify-between ${
          t.is_popular
            ? "bg-[var(--drawing-accent)]"
            : "bg-[var(--drawing-paper)] border-b border-[var(--drawing-line)]"
        }`}
      >
        <span
          className={`font-gost text-[9px] uppercase tracking-[0.2em] ${
            t.is_popular ? "text-white" : "text-[var(--drawing-line-thin)]"
          }`}
        >
          {t.duration}
        </span>
        {t.is_popular && (
          <span className="font-gost text-[9px] text-white opacity-80">Популярный</span>
        )}
        {t.is_warning && !t.is_popular && (
          <Icon name="AlertTriangle" size={11} className="text-[var(--drawing-accent)]" />
        )}
      </div>

      {/* Тело */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start gap-2 mb-2">
          <Icon
            name={icon}
            size={14}
            className={t.is_popular ? "text-[var(--drawing-accent)] mt-0.5 shrink-0" : "text-[var(--drawing-line-thin)] mt-0.5 shrink-0"}
          />
          <h3 className="font-gost-upright text-sm font-bold uppercase tracking-tight leading-snug">
            {t.title}
          </h3>
        </div>

        <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] leading-relaxed mb-3 flex-1">
          {t.audience}
        </p>

        <div className="extension-line-h w-full mb-3" />

        <p className="font-gost-upright text-lg font-bold text-[var(--drawing-accent)] mb-4">
          {formatPriceWithCurrency(t)}
        </p>

        <Link
          to={t.cta_link}
          className={`block text-center py-2 font-gost text-[10px] uppercase tracking-[0.15em] transition-colors ${
            t.is_popular
              ? "bg-[var(--drawing-accent)] text-white hover:bg-[var(--drawing-line)]"
              : "border-[1.5px] border-[var(--drawing-line)] text-[var(--drawing-line)] hover:bg-[var(--drawing-line)] hover:text-[var(--drawing-bg)]"
          }`}
        >
          {t.cta_text}
        </Link>
      </div>
    </div>
  );
}

export default function MentoringCrossSell() {
  const { tariffs, loading } = useTariffs();

  const visible = tariffs.slice(0, 4);

  return (
    <section className="border-t-[2.5px] border-[var(--drawing-line)] py-16">
      {/* Заголовок */}
      <div className="flex items-start gap-4 mb-2">
        <div className="shrink-0 w-8 h-8 border-[1.5px] border-[var(--drawing-accent)] flex items-center justify-center">
          <Icon name="GraduationCap" size={16} className="text-[var(--drawing-accent)]" />
        </div>
        <div>
          <p className="font-gost text-[10px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-1">
            Наставничество · Раздел 05
          </p>
          <h2 className="font-gost-upright text-2xl md:text-3xl font-bold tracking-tight">
            Нужен живой инженер?{" "}
            <span className="text-[var(--drawing-accent)]">Наставник по&nbsp;ВКР</span>
          </h2>
        </div>
      </div>
      <div className="extension-line-h w-full mb-6" />

      <p className="font-gost text-sm text-[var(--drawing-line-thin)] leading-relaxed max-w-2xl mb-10">
        CAE-калькулятор считает за секунды — но диплом защищает человек. Наставник проверит расчёты, поправит оформление по ЕСКД и поможет подготовиться к вопросам комиссии.
      </p>

      {/* Карточки */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-52 border-[1.5px] border-[var(--drawing-line)] bg-[var(--drawing-paper)] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {visible.map((t) => (
            <TariffCard key={t.id} t={t} />
          ))}
        </div>
      )}

      {/* Нижняя плашка */}
      <div className="border-[1.5px] border-[var(--drawing-line)] p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5 justify-between">
        <div className="flex items-start gap-3">
          <Icon name="Lightbulb" size={16} className="text-[var(--drawing-accent)] shrink-0 mt-0.5" />
          <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed max-w-lg">
            <span className="text-[var(--drawing-line)] font-bold">Не уверены, какой формат подойдёт?</span>{" "}
            Запишитесь на бесплатную диагностику — разберём вашу ситуацию за 20–30 минут и подберём тариф.
          </p>
        </div>
        <Link
          to="/pricing"
          className="shrink-0 flex items-center gap-2 font-gost text-[11px] uppercase tracking-[0.15em] border-[1.5px] border-[var(--drawing-accent)] text-[var(--drawing-accent)] px-4 py-2 hover:bg-[var(--drawing-accent)] hover:text-white transition-colors whitespace-nowrap"
        >
          <Icon name="ExternalLink" size={12} />
          Все тарифы
        </Link>
      </div>
    </section>
  );
}
