/**
 * Маркетинговая презентация CAE-виджета для партнёров (металлопрокат /
 * металлоконструкции). Доступна ТОЛЬКО администратору (раздел «Маркетинг»).
 *
 * Две задачи:
 *  1. «Презентация» — печатная копия лендинга /widget-balka, адаптированная
 *     под A4: те же тексты, выгоды, тарифы, шаги подключения и FAQ.
 *  2. «Коммерческое предложение» — официальное КП для отправки компаниям.
 *
 * Экспорт в PDF — через window.print() (печатная вёрстка @media print даёт
 * векторный PDF с настоящим текстом, без растеризации). Скрыто от индексации.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { useWidgetPlans, formatWidgetPrice, type WidgetPlan } from "@/lib/widget-tariffs";

const BENEFITS = [
  {
    title: "Больше заявок с сайта",
    text: "Посетитель сам считает балку и сразу оставляет заявку — вы получаете тёплый лид с готовыми параметрами вместо абстрактного «позвоните мне».",
  },
  {
    title: "Подключение за 5 минут",
    text: "Одна строка кода на любой сайт — Tilda, WordPress, Битрикс, самописный. Не нужен программист, не нужно ничего пересобирать.",
  },
  {
    title: "Настоящий инженерный расчёт",
    text: "Под капотом — конечно-элементный решатель: прогиб, напряжения по Мизесу, запас прочности, каталог профилей по ГОСТ. Не «калькулятор-картинка».",
  },
  {
    title: "Заявки сразу вам на почту",
    text: "Контакт клиента и параметры расчёта приходят на ваш email мгновенно. Ничего не теряется, можно перезванивать по горячим следам.",
  },
  {
    title: "Выглядит как часть вашего сайта",
    text: "Аккуратный нейтральный виджет встраивается в дизайн страницы и не ломает вёрстку — он изолирован и не конфликтует с вашими стилями.",
  },
  {
    title: "Работает только на вашем домене",
    text: "Персональный ключ привязан к вашим доменам. Никто чужой не сможет использовать ваш виджет и ваш лимит расчётов.",
  },
];

const STEPS = [
  {
    name: "Получите ключ",
    text: "Менеджер подключает ваш тариф и выдаёт персональный ключ доступа к виджету, привязанный к домену вашего сайта.",
  },
  {
    name: "Вставьте одну строку кода",
    text: "Скопируйте готовый код и вставьте в HTML-блок на нужной странице сайта. Калькулятор появится сразу.",
  },
  {
    name: "Принимайте заявки",
    text: "Посетители рассчитывают балку и оставляют контакты — заявки с параметрами расчёта приходят вам на email.",
  },
];

const FAQ = [
  {
    q: "Что такое виджет калькулятора балки для сайта?",
    a: "Это встраиваемый инженерный CAE-редактор: посетитель вашего сайта строит расчётную схему балки или рамы, задаёт опоры, нагрузки и профиль из каталога ГОСТ, запускает конечно-элементный расчёт и получает эпюры, прогиб и запас прочности — а затем оставляет заявку на изготовление. Это тот же движок, что и в основном CAE-сервисе Диплом-Инж.рф, поэтому расчёт настоящий, а не приблизительный.",
  },
  {
    q: "Как установить калькулятор на сайт?",
    a: "Нужно вставить одну строку кода (тег script с вашим персональным ключом) в HTML любой страницы. Это работает на Tilda, WordPress, Битрикс, Joomla и самописных сайтах. Программист не требуется — виджет появляется автоматически и сам подстраивает высоту.",
  },
  {
    q: "Кому подходит виджет?",
    a: "Заводам и цехам металлоконструкций, продавцам металлопроката, строительным и проектным компаниям — всем, кто продаёт балки, фермы и каркасы и хочет, чтобы клиент сам подобрал сечение прямо на сайте и оставил заявку.",
  },
  {
    q: "Куда приходят заявки от посетителей?",
    a: "Заявка с контактами клиента и параметрами его расчёта (пролёт, профиль, прогиб, запас прочности) мгновенно отправляется на указанный вами email. Вы перезваниваете клиенту, уже зная, что именно ему нужно.",
  },
  {
    q: "Что будет, если закончатся расчёты по тарифу?",
    a: "Виджет не перестанет работать. При исчерпании месячного лимита автоматически подключается доп-пакет: +50% к лимиту расчётов и +50% к стоимости тарифа за этот месяц. Мы заранее уведомляем письмом при 80% и при исчерпании лимита, а текущий расход всегда виден в личном кабинете партнёра.",
  },
  {
    q: "Как происходит оплата?",
    a: "По постоплате: новый месяц активируется автоматически — формируется счёт, который вы оплачиваете по безналу. Это удобно для юридических лиц и не прерывает работу виджета. Баланс, лимит и задолженность видны в личном кабинете партнёра.",
  },
];

// Реквизиты для коммерческого предложения (ИП Кокшаров С. В.).
const REQUISITES = [
  { label: "Наименование", value: "Кокшаров Сергей Витальевич (ИП)" },
  { label: "ИНН", value: "662007143302" },
  { label: "Расчётный счёт", value: "40802810338190006392" },
  { label: "Валюта счёта", value: "RUR (рубли РФ)" },
  { label: "Банк", value: 'ФИЛИАЛ «ЕКАТЕРИНБУРГСКИЙ» АО «АЛЬФА-БАНК»' },
  { label: "БИК", value: "046577964" },
  { label: "Корр. счёт", value: "30101810100000000964" },
  { label: "Юридический адрес", value: "г. Екатеринбург" },
  { label: "Email", value: "info@диплом-инж.рф" },
  { label: "Телефон", value: "+7 982 855-73-09" },
];

// Светлая фирменная палитра «чертежа» — принудительно для документа,
// чтобы тёмная тема сайта не делала текст бледным/нечитаемым.
const LIGHT_DOC_VARS: React.CSSProperties = {
  ["--drawing-bg" as string]: "#faf8f0",
  ["--drawing-line" as string]: "#1a1a2e",
  ["--drawing-line-thin" as string]: "#3a3a5e",
  ["--drawing-accent" as string]: "#c0392b",
  ["--drawing-paper" as string]: "#f5f3e8",
  ["--drawing-ink" as string]: "#1a1a2e",
  background: "#ffffff",
  color: "#1a1a2e",
};

type View = "presentation" | "offer";

export default function WidgetPresentation() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [view, setView] = useState<View>("presentation");
  // Порядковый номер КП за сегодня (задаётся вручную).
  const [offerSeq, setOfferSeq] = useState(1);
  const offerNo = offerNumber(offerSeq);
  const plans = useWidgetPlans();

  useEffect(() => {
    if (!loading && (!user || !user.is_admin)) {
      nav("/account", { replace: true });
    }
  }, [user, loading, nav]);

  if (loading || !user || !user.is_admin) {
    return (
      <div className="max-w-[800px] mx-auto px-4 pt-24 pb-12 text-center font-gost text-[var(--drawing-line-thin)]">
        Загружаем…
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>
          {view === "offer"
            ? `Коммерческое предложение ${offerNo} · Диплом-Инж.рф`
            : "Презентация виджета · Маркетинг · Диплом-Инж.рф"}
        </title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      {/* Печатные стили: A4, скрытие управляющей панели, аккуратные разрывы */}
      <style>{PRINT_CSS}</style>

      {/* Панель управления — не печатается */}
      <div className="no-print sticky top-16 z-20 bg-[var(--drawing-bg)] border-b border-[var(--drawing-line)]/30">
        <div className="max-w-[900px] mx-auto px-4 py-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => nav("/account")}
            className="btn-drawing text-xs inline-flex items-center gap-1.5"
          >
            <Icon name="ArrowLeft" size={14} /> В кабинет
          </button>
          <div className="flex gap-1 ml-1">
            <button
              onClick={() => setView("presentation")}
              className={`text-xs px-3 py-1.5 border-2 ${
                view === "presentation"
                  ? "border-[var(--drawing-accent)] text-[var(--drawing-accent)]"
                  : "border-[var(--drawing-line)] text-[var(--drawing-line-thin)]"
              }`}
            >
              Презентация
            </button>
            <button
              onClick={() => setView("offer")}
              className={`text-xs px-3 py-1.5 border-2 ${
                view === "offer"
                  ? "border-[var(--drawing-accent)] text-[var(--drawing-accent)]"
                  : "border-[var(--drawing-line)] text-[var(--drawing-line-thin)]"
              }`}
            >
              Коммерческое предложение
            </button>
          </div>
          {view === "offer" && (
            <label className="flex items-center gap-1.5 text-xs text-[var(--drawing-line-thin)] ml-1">
              КП № за день:
              <input
                type="number"
                min={1}
                value={offerSeq}
                onChange={(e) => setOfferSeq(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-14 border-2 border-[var(--drawing-line)] bg-transparent px-2 py-1 text-xs text-[var(--drawing-ink)]"
              />
            </label>
          )}
          <button
            onClick={() => window.print()}
            className="btn-drawing btn-drawing-accent text-xs inline-flex items-center gap-1.5 ml-auto"
          >
            <Icon name="FileDown" size={14} /> Скачать PDF
          </button>
        </div>
        <div className="max-w-[900px] mx-auto px-4 pb-2">
          <p className="font-gost text-[10px] text-[var(--drawing-line-thin)]">
            Подсказка: в окне печати выберите «Сохранить как PDF», поля — «По умолчанию», фон — включить.
          </p>
        </div>
      </div>

      {/* Документ всегда в СВЕТЛОЙ фирменной палитре — независимо от темы
          сайта. Локально переопределяем CSS-переменные «чертежа», чтобы и на
          экране, и в PDF был тёмный текст на белом фоне. */}
      <div
        id="wp-print-root"
        className="print-root max-w-[900px] mx-auto my-6 px-6 md:px-10 py-10 shadow-lg print:my-0 print:shadow-none"
        style={LIGHT_DOC_VARS}
      >
        {view === "presentation" ? <Presentation plans={plans} /> : <Offer offerNo={offerNo} plans={plans} />}
      </div>
    </>
  );
}

/**
 * Номер КП в формате «КП-№{порядковый за день}/{ДД.ММ.ГГГГ}».
 * Порядковый номер за день задаётся вручную (по умолчанию 1).
 */
function offerNumber(seq: number): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const date = `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
  return `КП-№${seq}/${date}`;
}

/* ─────────────────────────── ПРЕЗЕНТАЦИЯ ─────────────────────────── */

function Presentation({ plans }: { plans: WidgetPlan[] }) {
  return (
    <article className="space-y-10">
      <header className="print-page text-center border-b-2 border-[var(--drawing-line)] pb-8">
        <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-accent)] mb-3">
          Виджет для сайтов · Металлоконструкции и прокат
        </p>
        <h1 className="font-gost-upright text-3xl md:text-4xl font-black uppercase tracking-wide leading-[1.1] mb-4">
          Калькулятор балки прямо на вашем сайте
        </h1>
        <p className="font-gost text-base text-[var(--drawing-line-thin)] leading-snug max-w-[640px] mx-auto">
          Дайте посетителям рассчитать прогиб и подобрать сечение балки, не уходя
          с вашего сайта — и сразу оставить заявку на изготовление. Встраивается
          одной строкой кода. Заявки с параметрами расчёта приходят вам на почту.
        </p>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6">
          {["Установка за 5 минут", "Без программиста", "Заявки на email", "Расчёт по ГОСТ"].map(
            (t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 font-gost text-xs text-[var(--drawing-line-thin)]"
              >
                <Icon name="Check" size={14} className="text-green-600" /> {t}
              </span>
            ),
          )}
        </div>
      </header>

      {/* Выгоды */}
      <section className="break-inside-avoid">
        <SectionTitle icon="TrendingUp" text="Почему это повышает конверсию" />
        <div className="grid sm:grid-cols-2 gap-4">
          {BENEFITS.map((b) => (
            <div key={b.title} className="border-2 border-[var(--drawing-line)] p-4 break-inside-avoid">
              <p className="font-gost-upright font-bold text-sm mb-1">{b.title}</p>
              <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-snug">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Как подключить */}
      <section className="break-inside-avoid">
        <SectionTitle icon="Rocket" text="Подключить за 3 шага" />
        <ol className="space-y-4">
          {STEPS.map((s, i) => (
            <li key={s.name} className="flex gap-3 break-inside-avoid">
              <span className="shrink-0 w-7 h-7 rounded-full bg-[var(--drawing-accent)] text-white font-gost-upright font-black text-sm flex items-center justify-center">
                {i + 1}
              </span>
              <div>
                <p className="font-gost-upright font-bold text-sm">{s.name}</p>
                <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-snug mt-0.5">
                  {s.text}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-4 border-2 border-[var(--drawing-line)] bg-[var(--drawing-paper)] p-3 font-mono text-[11px] break-all">
          {'<script src="https://диплом-инж.рф/widget.js" data-key="ВАШ_КЛЮЧ" async></script>'}
        </div>
      </section>

      {/* Тарифы */}
      <section className="print-page break-inside-avoid">
        <SectionTitle icon="Wallet" text="Тарифы" />
        <p className="font-gost text-sm text-[var(--drawing-line-thin)] mb-4">
          Тариф зависит от числа расчётов в месяц — фиксированная абонентская
          плата без процентов с заявок. В любом тарифе можно ограничить число
          расчётов в сутки на одного посетителя.
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div
              key={p.slug}
              className={`border-2 p-5 flex flex-col break-inside-avoid ${
                p.is_popular
                  ? "border-[var(--drawing-accent)] bg-[var(--drawing-paper)]"
                  : "border-[var(--drawing-line)]"
              }`}
            >
              {p.is_popular && (
                <span className="self-start font-gost text-[9px] uppercase tracking-wider bg-[var(--drawing-accent)] text-white px-2 py-0.5 mb-2">
                  Популярный
                </span>
              )}
              <p className="font-gost-upright font-black text-lg uppercase">{p.name}</p>
              <p className="font-gost-upright text-2xl font-black text-[var(--drawing-accent)] my-2">
                {formatWidgetPrice(p.price_monthly)}
              </p>
              <ul className="space-y-1.5 mt-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 font-gost text-xs">
                    <Icon name="Check" size={14} className="text-green-600 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="break-inside-avoid">
        <SectionTitle icon="MessageCircleQuestion" text="Частые вопросы" />
        <div className="space-y-3">
          {FAQ.map((it) => (
            <div key={it.q} className="border-2 border-[var(--drawing-line)] p-4 break-inside-avoid">
              <p className="font-gost-upright font-bold text-sm mb-2">{it.q}</p>
              <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed">{it.a}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center border-t-2 border-[var(--drawing-line)] pt-6">
        <p className="font-gost-upright font-black uppercase tracking-wide text-lg">
          Диплом-Инж.рф
        </p>
        <p className="font-gost text-xs text-[var(--drawing-line-thin)] mt-1">
          Подключение виджета · диплом-инж.рф/widget-balka
        </p>
      </footer>
    </article>
  );
}

/* ──────────────────── КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ ──────────────────── */

function Offer({ offerNo, plans }: { offerNo: string; plans: WidgetPlan[] }) {
  const today = new Date().toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <article className="space-y-8 font-gost text-sm leading-relaxed text-[var(--drawing-ink)]">
      {/* Шапка */}
      <header className="border-b-2 border-[var(--drawing-line)] pb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-gost-upright font-black uppercase tracking-wide text-lg">
              Диплом-Инж.рф
            </p>
            <p className="text-xs text-[var(--drawing-line-thin)]">
              Инженерные онлайн-расчёты · CAE-сервис
            </p>
          </div>
          <p className="text-xs text-right">
            <span className="font-bold">{offerNo}</span>
            <br />
            <span className="text-[var(--drawing-line-thin)]">от {today}</span>
          </p>
        </div>
        <h1 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide mt-5">
          Коммерческое предложение
        </h1>
        <p className="mt-1">
          Виджет онлайн-калькулятора балки для сайта компании металлопроката
          и металлоконструкций
        </p>
      </header>

      {/* Крючок */}
      <section className="break-inside-avoid border-2 border-[var(--drawing-accent)] bg-[var(--drawing-paper)] p-5">
        <p className="font-gost-upright font-black text-lg leading-snug mb-2">
          Превратите посетителей сайта в заявки на изготовление —
          не нанимая программиста.
        </p>
        <p>
          Большинство посетителей сайта завода уходят, так и не позвонив: им проще
          посчитать балку самим. Дайте им сделать это прямо у вас — встроенный
          калькулятор подберёт сечение, покажет прогиб и запас прочности, а контакт
          клиента с параметрами расчёта придёт вам на почту. Вы перезваниваете уже
          тёплому клиенту, который знает, что ему нужно.
        </p>
      </section>

      {/* Цифры */}
      <section className="break-inside-avoid grid grid-cols-3 gap-4 text-center">
        {[
          { big: "5 мин", small: "на установку — одна строка кода" },
          { big: "0 ₽", small: "комиссии с заявок — фиксированная плата" },
          { big: "ГОСТ", small: "настоящий FEM-расчёт, каталог профилей" },
        ].map((m) => (
          <div key={m.small} className="border-2 border-[var(--drawing-line)] p-3">
            <p className="font-gost-upright font-black text-xl text-[var(--drawing-accent)]">
              {m.big}
            </p>
            <p className="text-[11px] text-[var(--drawing-line-thin)] leading-snug mt-1">
              {m.small}
            </p>
          </div>
        ))}
      </section>

      {/* 1. О предложении */}
      <section className="break-inside-avoid">
        <OfferTitle n={1} text="О предложении" />
        <p>
          Предлагаем встроить в ваш сайт онлайн-калькулятор расчёта балки. Посетитель
          задаёт пролёт, опоры и нагрузку, подбирает профиль из каталога ГОСТ, получает
          прогиб, напряжения и запас прочности — и тут же оставляет заявку на изготовление.
          Под капотом — настоящий конечно-элементный решатель, тот же, что в основном
          CAE-сервисе Диплом-Инж.рф. Это не «калькулятор-картинка», а полноценный
          инженерный инструмент, который вызывает доверие у клиента.
        </p>
      </section>

      {/* 2. Выгоды — карточками, как в презентации */}
      <section className="break-inside-avoid">
        <OfferTitle n={2} text="Почему это повышает продажи" />
        <div className="grid sm:grid-cols-2 gap-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="border-2 border-[var(--drawing-line)] p-4 break-inside-avoid">
              <div className="flex items-center gap-2 mb-1">
                <Icon name={b.icon} size={18} fallback="Sparkles" className="text-[var(--drawing-accent)] shrink-0" />
                <p className="font-gost-upright font-bold text-sm">{b.title}</p>
              </div>
              <p className="text-xs text-[var(--drawing-line-thin)] leading-snug">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Тарифы */}
      <section className="print-page break-inside-avoid">
        <OfferTitle n={3} text="Тарифы" />
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[var(--drawing-paper)]">
              <th className="border-2 border-[var(--drawing-line)] p-2 text-left font-gost-upright">Тариф</th>
              <th className="border-2 border-[var(--drawing-line)] p-2 text-left font-gost-upright">Стоимость</th>
              <th className="border-2 border-[var(--drawing-line)] p-2 text-left font-gost-upright">Что входит</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.slug} className={`align-top ${p.is_popular ? "bg-[var(--drawing-paper)]" : ""}`}>
                <td className="border-2 border-[var(--drawing-line)] p-2 font-gost-upright font-bold whitespace-nowrap">
                  {p.name}
                  {p.is_popular && (
                    <span className="block text-[8px] uppercase tracking-wider text-[var(--drawing-accent)]">
                      Популярный
                    </span>
                  )}
                </td>
                <td className="border-2 border-[var(--drawing-line)] p-2 font-bold text-[var(--drawing-accent)] whitespace-nowrap">
                  {formatWidgetPrice(p.price_monthly)}
                </td>
                <td className="border-2 border-[var(--drawing-line)] p-2">{p.features.join(" · ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-[var(--drawing-line-thin)] mt-2">
          Тариф определяется числом расчётов в месяц. Оплата по постоплате для юридических
          лиц: счёт по безналу, новый месяц активируется автоматически и не прерывает работу
          виджета. При исчерпании месячного лимита подключается доп-пакет (+50% к лимиту
          и стоимости за месяц) с заблаговременным уведомлением.
        </p>
      </section>

      {/* 4. Как подключаем */}
      <section className="break-inside-avoid">
        <OfferTitle n={4} text="Как подключаем" />
        <ol className="space-y-2">
          {STEPS.map((s, i) => (
            <li key={s.name} className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--drawing-accent)] text-white font-gost-upright font-black text-xs flex items-center justify-center">
                {i + 1}
              </span>
              <span>
                <b className="font-gost-upright">{s.name}.</b> {s.text}
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-3 border-2 border-[var(--drawing-line)] bg-[var(--drawing-paper)] p-3 font-mono text-[11px] break-all">
          {'<script src="https://диплом-инж.рф/widget.js" data-key="ВАШ_КЛЮЧ" async></script>'}
        </div>
      </section>

      {/* 5. Кому подходит */}
      <section className="break-inside-avoid">
        <OfferTitle n={5} text="Кому подходит" />
        <p>
          Заводам и цехам металлоконструкций, продавцам металлопроката, строительным
          и проектным компаниям — всем, кто продаёт балки, фермы и каркасы и хочет, чтобы
          клиент сам подобрал сечение прямо на сайте и оставил заявку.
        </p>
      </section>

      {/* 6. Контакты — акцентный CTA */}
      <section className="break-inside-avoid border-2 border-[var(--drawing-accent)] bg-[var(--drawing-paper)] p-5">
        <OfferTitle n={6} text="Контакты" />
        <p>
          Чтобы подключить виджет или получить демо под ваш сайт — свяжитесь с нами.
          Поможем встроить калькулятор и настроить заявки на вашу почту в день обращения.
        </p>
        <ul className="mt-3 space-y-1 font-bold">
          <li className="flex items-center gap-2">
            <Icon name="Globe" size={15} className="text-[var(--drawing-accent)]" />
            диплом-инж.рф/widget-balka
          </li>
          <li className="flex items-center gap-2">
            <Icon name="Mail" size={15} className="text-[var(--drawing-accent)]" />
            info@диплом-инж.рф
          </li>
          <li className="flex items-center gap-2">
            <Icon name="Phone" size={15} className="text-[var(--drawing-accent)]" />
            +7 982 855-73-09
          </li>
        </ul>
        <p className="text-[10px] text-[var(--drawing-line-thin)] mt-3">
          Предложение носит информационный характер и не является публичной офертой.
          Окончательные условия фиксируются в договоре.
        </p>
      </section>

      {/* 7. Реквизиты */}
      <section className="break-inside-avoid">
        <OfferTitle n={7} text="Реквизиты" />
        <table className="w-full border-collapse text-xs">
          <tbody>
            {REQUISITES.map((r) => (
              <tr key={r.label} className="align-top">
                <td className="border-2 border-[var(--drawing-line)] p-2 font-gost-upright font-bold whitespace-nowrap w-[42%]">
                  {r.label}
                </td>
                <td className="border-2 border-[var(--drawing-line)] p-2">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </article>
  );
}

function OfferTitle({ n, text }: { n: number; text: string }) {
  return (
    <h2 className="font-gost-upright font-black uppercase tracking-wide text-base mb-3 flex items-center gap-2 border-b border-[var(--drawing-line)]/40 pb-1.5">
      <span className="w-6 h-6 rounded-full bg-[var(--drawing-accent)] text-white text-xs flex items-center justify-center shrink-0">
        {n}
      </span>
      {text}
    </h2>
  );
}

function SectionTitle({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon name={icon} size={18} fallback="Sparkles" className="text-[var(--drawing-accent)]" />
      <h2 className="font-gost-upright text-xl font-black uppercase tracking-wide">{text}</h2>
    </div>
  );
}

/**
 * Печатные стили. Чтобы в PDF не попадали навигация, cookie-баннер, тосты и
 * внешние виджеты (Яндекс.Метрика и пр.), при печати скрываем ВСЮ страницу
 * и показываем только документ #wp-print-root. Это надёжнее, чем перечислять
 * селекторы сторонних элементов, которые мы не контролируем.
 */
const PRINT_CSS = `
@media print {
  /* Печатаем фоновые заливки и акцентные цвета (иначе блёкло) */
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  /* Скрываем всё */
  body * { visibility: hidden !important; }
  /* Показываем только документ и его содержимое */
  #wp-print-root, #wp-print-root * { visibility: visible !important; }
  /* Документ во всю ширину листа, в начало страницы */
  #wp-print-root {
    position: absolute !important;
    left: 0; top: 0;
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  body { background: #fff !important; }
  .no-print { display: none !important; }
  .print-page { break-after: page; }
  .break-inside-avoid { break-inside: avoid; }
  a[href]:after { content: ""; }
}
@page { size: A4; margin: 14mm; }
`;