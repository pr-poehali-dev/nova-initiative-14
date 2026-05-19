import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import useTariffs, { formatPriceWithCurrency } from "@/hooks/useTariffs";

const FaqCtaSection = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { tariffs } = useTariffs();

  const expressTariff = tariffs.find((t) => t.slug === "express-3d");
  const accompanyTariff = tariffs.find((t) => t.slug === "accompany-3m");

  const faqData = [
    {
      q: "Вы пишете диплом за меня?",
      a: "Нет. Мы не пишем текст, не делаем чертежи и не выполняем расчёты за студента. Мы обучаем методологии, помогаем выстроить логику, проверяем ваши материалы и готовим к защите. Автор работы — вы.",
    },
    {
      q: "Это этично?",
      a: "Да. Наставничество — это образовательная услуга. Мы работаем как репетитор или научный консультант: объясняем, направляем, проверяем. Вы выполняете работу самостоятельно и несёте за неё ответственность.",
    },
    {
      q: "Что если до защиты осталось мало времени?",
      a: "Мы оценим объём на диагностике и честно скажем, что реально успеть. Есть экспресс-формат на 3 дня для критических ситуаций. Но чем раньше вы обратитесь — тем лучше результат.",
    },
    {
      q: "Что если научрук оставил замечания?",
      a: "Разберём каждое замечание, объясним, что именно требуется исправить, и поможем сформулировать ответ. Проверим исправленную версию перед повторной сдачей.",
    },
    {
      q: "Сколько стоит?",
      a: `Зависит от формата: от ${expressTariff ? formatPriceWithCurrency(expressTariff) : "экспресс-разбора"} за 3 дня до ${accompanyTariff ? formatPriceWithCurrency(accompanyTariff) : "полного сопровождения"} за 3 месяца. Итоговая стоимость фиксируется после диагностики, когда мы понимаем объём работы.`,
    },
    {
      q: "Как проходят занятия?",
      a: "Индивидуальные встречи проходят онлайн. Вы присылаете материалы — мы проверяем и разбираем на встрече. Между встречами доступна переписка с наставником.",
    },
  ];

  return (
    <>
      <section className="py-16 px-4 md:px-8 bg-[var(--drawing-paper)]">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="section-callout font-gost-upright text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Частые вопросы
          </h2>
          <div className="extension-line-h w-48 mb-10" />

          <div className="max-w-2xl space-y-0">
            {faqData.map((item, i) => (
              <div key={i} className="border-b-[1.5px] border-[var(--drawing-line)]">
                <button
                  className="w-full flex items-center justify-between py-4 text-left gap-4"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-gost text-sm text-[var(--drawing-line)]">{item.q}</span>
                  <span className="shrink-0 text-[var(--drawing-line-thin)]">
                    <Icon name={openFaq === i ? "ChevronUp" : "ChevronDown"} size={16} />
                  </span>
                </button>
                {openFaq === i && (
                  <div className="pb-4">
                    <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed pl-0">
                      {item.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8">
            <Link to="/faq" className="font-gost text-xs text-[var(--drawing-accent)] hover:underline">
              Все вопросы и ответы&nbsp;&rarr;
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 md:px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="drawing-frame p-8 md:p-12 text-center">
            <h2 className="font-gost-upright text-3xl md:text-4xl font-bold tracking-tight mb-4 text-[var(--drawing-line)]">
              Разберём ваш диплом
              <br />
              за 20 минут
            </h2>
            <div className="extension-line-h w-32 mx-auto my-5" />
            <p className="font-gost text-sm text-[var(--drawing-line-thin)] leading-relaxed max-w-lg mx-auto mb-8">
              Бесплатная диагностика: оценим состояние работы, определим слабые места и&nbsp;составим план действий. Без обязательств.
            </p>
            <Link to="/contacts" className="btn-drawing btn-drawing-accent text-sm inline-block">
              Записаться на диагностику ВКР
            </Link>
            <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] opacity-70 mt-4">
              Ответим в течение 2 часов в рабочее время (10:00&ndash;20:00).
            </p>
          </div>
        </div>
      </section>
    </>
  );
};

export default FaqCtaSection;