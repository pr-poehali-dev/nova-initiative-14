import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { fetchCaeTariffs, type CaeTariff } from "@/lib/cae";

const fmtRub = (kopecks: number) =>
  Math.round(kopecks / 100).toLocaleString("ru-RU") + " ₽";

const HIGHLIGHTS: Record<string, { icon: string; text: string }[]> = {
  free: [
    { icon: "MousePointer", text: "3 расчёта в месяц" },
    { icon: "FileText", text: "PDF-отчёт по ГОСТ" },
    { icon: "Box", text: "До 10 элементов" },
  ],
  basic: [
    { icon: "Infinity", text: "Неограниченные расчёты" },
    { icon: "FileText", text: "PDF без водяного знака" },
    { icon: "BookOpen", text: "Все ГОСТ-профили" },
  ],
  pro: [
    { icon: "Users", text: "Команда до 3 чел." },
    { icon: "Zap", text: "Нелинейный solver" },
    { icon: "FolderOpen", text: "Безлимит проектов" },
  ],
  enterprise: [
    { icon: "Building2", text: "До 10 участников" },
    { icon: "Plug", text: "API-доступ" },
    { icon: "ShieldCheck", text: "Приоритетный solver" },
  ],
};

export default function CaeCrossSell() {
  const [tariffs, setTariffs] = useState<CaeTariff[]>([]);

  useEffect(() => {
    fetchCaeTariffs()
      .then((r) => setTariffs(r.data?.tariffs || []))
      .catch(() => {});
  }, []);

  const visible = tariffs.filter(
    (t) => !["demo", "advanced"].includes(t.slug),
  );

  if (visible.length === 0) return null;

  return (
    <section className="py-16 px-4 md:px-8 bg-[var(--drawing-paper)]">
      <div className="max-w-[1200px] mx-auto">

        {/* Заголовок */}
        <div className="flex items-start gap-4 mb-2">
          <div className="shrink-0 w-8 h-8 border-[1.5px] border-[var(--drawing-accent)] flex items-center justify-center">
            <Icon name="Calculator" size={16} className="text-[var(--drawing-accent)]" />
          </div>
          <div>
            <p className="font-gost text-[10px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-1">
              Инструмент · Раздел 04
            </p>
            <h2 className="font-gost-upright text-2xl md:text-3xl font-bold tracking-tight">
              Считайте сами —{" "}
              <span className="text-[var(--drawing-accent)]">CAE-калькулятор</span>
            </h2>
          </div>
        </div>
        <div className="extension-line-h w-full mb-6" />

        <p className="font-gost text-sm text-[var(--drawing-line-thin)] leading-relaxed max-w-2xl mb-10">
          Пока наставник проверяет вашу работу — вы можете самостоятельно рассчитать раму, ферму или балку прямо в браузере. Эпюры N, Q, M, подбор сечения по ГОСТ, PDF-отчёт для диплома.
        </p>

        {/* Карточки тарифов CAE */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {visible.map((t) => {
            const isPopular = t.slug === "basic";
            const isEnterprise = t.slug === "enterprise";
            const features = HIGHLIGHTS[t.slug] ?? [];

            return (
              <div
                key={t.slug}
                className={`flex flex-col bg-[var(--drawing-bg)] ${
                  isPopular
                    ? "border-2 border-[var(--drawing-accent)]"
                    : "border-[1.5px] border-[var(--drawing-line)]"
                }`}
              >
                {/* Шапка */}
                <div
                  className={`px-4 py-2.5 flex items-center justify-between ${
                    isPopular
                      ? "bg-[var(--drawing-accent)]"
                      : "bg-[var(--drawing-paper)] border-b border-[var(--drawing-line)]"
                  }`}
                >
                  <span
                    className={`font-gost text-[9px] uppercase tracking-[0.2em] ${
                      isPopular ? "text-white" : "text-[var(--drawing-line-thin)]"
                    }`}
                  >
                    {t.name}
                  </span>
                  {isPopular && (
                    <span className="font-gost text-[9px] text-white opacity-80">
                      Популярный
                    </span>
                  )}
                </div>

                {/* Тело */}
                <div className="p-4 flex flex-col flex-1">
                  {/* Цена */}
                  <p className="font-gost-upright text-xl font-bold text-[var(--drawing-accent)] mb-0.5">
                    {isEnterprise
                      ? "По запросу"
                      : t.price_monthly > 0
                        ? `${fmtRub(t.price_monthly)} / мес`
                        : "Бесплатно"}
                  </p>
                  {t.price_yearly > 0 && !isEnterprise && (
                    <p className="font-gost text-[9px] text-[var(--drawing-line-thin)] mb-3">
                      или {fmtRub(t.price_yearly)} / год
                    </p>
                  )}

                  <div className="extension-line-h w-full my-3" />

                  {/* Фичи */}
                  <ul className="space-y-2 flex-1 mb-4">
                    {features.map((f) => (
                      <li key={f.text} className="flex items-center gap-2">
                        <Icon
                          name={f.icon}
                          size={12}
                          className={
                            isPopular
                              ? "text-[var(--drawing-accent)]"
                              : "text-[var(--drawing-line-thin)]"
                          }
                        />
                        <span className="font-gost text-[11px] text-[var(--drawing-line-thin)]">
                          {f.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {isEnterprise ? (
                    <a
                      href="mailto:hello@diplom-inzh.ru?subject=Корпоратив"
                      className="block text-center py-2 font-gost text-[10px] uppercase tracking-[0.15em] border-[1.5px] border-[var(--drawing-line)] text-[var(--drawing-line)] hover:bg-[var(--drawing-line)] hover:text-[var(--drawing-bg)] transition-colors"
                    >
                      Написать
                    </a>
                  ) : (
                    <Link
                      to={t.price_monthly === 0 ? "/cae/new" : "/register"}
                      className={`block text-center py-2 font-gost text-[10px] uppercase tracking-[0.15em] transition-colors ${
                        isPopular
                          ? "bg-[var(--drawing-accent)] text-white hover:bg-[var(--drawing-line)]"
                          : "border-[1.5px] border-[var(--drawing-line)] text-[var(--drawing-line)] hover:bg-[var(--drawing-line)] hover:text-[var(--drawing-bg)]"
                      }`}
                    >
                      {t.price_monthly === 0 ? "Попробовать" : "Выбрать"}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Нижняя плашка — почему это важно */}
        <div className="border-[1.5px] border-[var(--drawing-line)] p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5 justify-between">
          <div className="flex items-start gap-3">
            <Icon name="Lightbulb" size={16} className="text-[var(--drawing-accent)] shrink-0 mt-0.5" />
            <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed max-w-lg">
              <span className="text-[var(--drawing-line)] font-bold">Наставник + калькулятор — сильная связка:</span>{" "}
              вы понимаете физику задачи, наставник помогает с оформлением и логикой работы, калькулятор считает за секунды.
            </p>
          </div>
          <Link
            to="/cae"
            className="shrink-0 flex items-center gap-2 font-gost text-[11px] uppercase tracking-[0.15em] border-[1.5px] border-[var(--drawing-accent)] text-[var(--drawing-accent)] px-4 py-2 hover:bg-[var(--drawing-accent)] hover:text-white transition-colors whitespace-nowrap"
          >
            <Icon name="ExternalLink" size={12} />
            О калькуляторе
          </Link>
        </div>

      </div>
    </section>
  );
}
