import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Icon from "@/components/ui/icon";
import { SITE_URL } from "@/lib/seo";
import { useAuth } from "@/contexts/AuthContext";
import { fetchCaeTariffs, joinWaitlist, type CaeTariff } from "@/lib/cae";

const formatPrice = (kopecks: number) => {
  if (kopecks <= 0) return "0 ₽";
  const rub = Math.round(kopecks / 100);
  return rub.toLocaleString("ru-RU") + " ₽";
};

const FEATURES = [
  {
    icon: "Box",
    title: "2D и 3D редактор рам",
    text: "Рисуйте узлы и элементы прямо в браузере — плоские схемы и пространственные рамы. Snap к сетке, перемещение узлов, библиотека сечений ГОСТ.",
  },
  {
    icon: "Calculator",
    title: "Конечно-элементный расчёт",
    text: "Балочный КЭ-решатель на сервере с учётом сдвиговых деформаций. Эпюры N, Q, M и эквивалентные напряжения по Мизесу.",
  },
  {
    icon: "FileText",
    title: "PDF-отчёт по ЕСКД",
    text: "Подробный отчёт с рамкой, формулами и библиографией. Готов для приложения к ВКР или экспертизе.",
  },
  {
    icon: "Database",
    title: "Каталог ГОСТ-профилей",
    text: "Двутавры (ГОСТ 8239-89), швеллеры, уголки, трубы — с готовыми геометрическими характеристиками.",
  },
  {
    icon: "Cloud",
    title: "Облачные проекты",
    text: "Сохраняйте версии модели, делитесь ссылкой с наставником, продолжайте на любом устройстве.",
  },
  {
    icon: "Zap",
    title: "Нелинейные расчёты",
    text: "В тарифе Профи: P-Δ эффекты и упругопластичность. Бенчмарки против LIRA-САПР и SAP2000.",
  },
];

const CaeLanding = () => {
  const { user } = useAuth();
  const [tariffs, setTariffs] = useState<CaeTariff[]>([]);
  const [email, setEmail] = useState(user?.email || "");
  const [purpose, setPurpose] = useState("");
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCaeTariffs()
      .then((r) => setTariffs(r.data?.tariffs || []))
      .catch(() => setTariffs([]));
  }, []);

  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
  }, [user, email]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await joinWaitlist({
      email: email.trim().toLowerCase(),
      role_self: role || undefined,
      purpose: purpose || undefined,
      referral_source: "cae_landing",
    });
    setBusy(false);
    if (res.ok) {
      setDone(true);
    } else {
      setError(res.message || res.error || "Не удалось добавить в список.");
    }
  };

  return (
    <>
      <Helmet>
        <title>Облачный CAE для машиностроителей — 2D/3D расчёт рам и балок · Диплом-Инж.рф</title>
        <meta
          name="description"
          content="Облачный CAE для машиностроителей: плоские и пространственные рамы, библиотека ГОСТ-профилей, эпюры N/Q/M, PDF-отчёт по ЕСКД. Лёгкий, в браузере, без установки. Скоро в раннем доступе."
        />
        <link rel="canonical" href={`${SITE_URL}/cae`} />
      </Helmet>

      <div className="max-w-[1200px] mx-auto px-4 pt-20 md:pt-24 pb-16">
        {/* Hero */}
        <section className="text-center mb-16">
          <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-4">
            CAE-инструмент · Раздел 01 · Скоро
          </p>
          <h1 className="font-gost-upright text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight text-[var(--drawing-line)] mb-5 leading-tight">
            Облачный расчёт
            <br />
            <span className="text-[var(--drawing-accent)]">рам и балок</span>
            <br />
            прямо в&nbsp;браузере
          </h1>
          <p className="text-base md:text-lg text-[var(--drawing-line-thin)] max-w-2xl mx-auto leading-relaxed mb-3">
            Облачный CAE-инструмент для машиностроителей: 2D и&nbsp;3D балочные рамы, библиотека ГОСТ-профилей, эпюры, пояснительная записка по&nbsp;ЕСКД. Лёгкая альтернатива APM&nbsp;WinMachine и&nbsp;ANSYS прямо в&nbsp;браузере.
          </p>
          <p className="font-gost text-sm uppercase tracking-wider text-[var(--drawing-accent)]">
            Запуск весной 2027&nbsp;·&nbsp;Сейчас собираем ранний доступ
          </p>
        </section>

        {/* Waitlist form */}
        <section className="max-w-[640px] mx-auto mb-20" id="waitlist">
          <div className="drawing-frame p-6 md:p-8 bg-[var(--drawing-bg)]">
            <p className="font-gost text-[10px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-2 text-center">
              Ранний доступ
            </p>
            <h2 className="font-gost-upright text-xl md:text-2xl font-black uppercase tracking-wide text-center mb-2">
              Попасть в&nbsp;вайт-лист
            </h2>
            <p className="text-sm text-center text-[var(--drawing-line-thin)] mb-6">
              Первые 100 участников получат год Базового тарифа бесплатно и&nbsp;возможность повлиять на&nbsp;функционал.
            </p>

            {done ? (
              <div className="text-center py-6">
                <Icon name="CheckCircle2" size={48} className="mx-auto mb-3 text-[var(--drawing-accent)]" />
                <p className="font-gost-upright text-lg font-bold mb-2">Вы в&nbsp;списке!</p>
                <p className="text-sm text-[var(--drawing-line-thin)]">
                  Напишем на&nbsp;<span className="font-mono">{email}</span> как только откроем доступ.
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] block mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="drawing-input"
                    placeholder="ivan@example.ru"
                  />
                </div>
                <div>
                  <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] block mb-2">
                    Кто вы (необязательно)
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="drawing-input"
                  >
                    <option value="">— выберите —</option>
                    <option value="student">Студент / выпускник</option>
                    <option value="engineer">Действующий инженер</option>
                    <option value="mentor">Наставник / преподаватель</option>
                    <option value="company">Малое КБ</option>
                    <option value="other">Другое</option>
                  </select>
                </div>
                <div>
                  <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] block mb-2">
                    Какие задачи будете считать (необязательно)
                  </label>
                  <textarea
                    rows={3}
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="drawing-input"
                    placeholder="Например: рамы металлоконструкций для ВКР"
                    maxLength={1000}
                  />
                </div>

                {error && (
                  <p className="font-gost text-xs text-[var(--drawing-accent)] border-l-2 border-[var(--drawing-accent)] pl-3">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="btn-drawing btn-drawing-accent w-full justify-center disabled:opacity-50"
                >
                  {busy ? "Записываем…" : "Получить ранний доступ"}
                </button>

                <p className="font-gost text-[10px] text-center text-[var(--drawing-line-thin)] opacity-70">
                  Никакого спама.{" "}
                  <Link to="/privacy" className="underline">
                    Политика конфиденциальности
                  </Link>
                </p>
              </form>
            )}
          </div>
        </section>

        {/* Features */}
        <section className="mb-20">
          <p className="font-gost text-[10px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-2 text-center">
            Возможности · Раздел 02
          </p>
          <h2 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide text-center mb-10">
            Что внутри
          </h2>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="border-2 border-[var(--drawing-line)] p-5 bg-[var(--drawing-bg)]">
                <Icon name={f.icon} size={28} className="text-[var(--drawing-accent)] mb-3" />
                <h3 className="font-gost-upright text-base font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--drawing-line-thin)] leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tariffs preview */}
        {tariffs.length > 0 && (
          <section className="mb-20">
            <p className="font-gost text-[10px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-2 text-center">
              Тарифы · Раздел 03 · Предварительные
            </p>
            <h2 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide text-center mb-3">
              Сколько будет стоить
            </h2>
            <p className="text-sm text-center text-[var(--drawing-line-thin)] max-w-2xl mx-auto mb-10">
              Финальные цены могут отличаться. Участники раннего доступа получат фиксированную скидку на&nbsp;год.
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {tariffs.map((t) => (
                <div
                  key={t.slug}
                  className={`border-2 p-5 bg-[var(--drawing-bg)] ${
                    t.slug === "basic"
                      ? "border-[var(--drawing-accent)]"
                      : "border-[var(--drawing-line)]"
                  }`}
                >
                  <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1">
                    Тариф
                  </p>
                  <h3 className="font-gost-upright text-lg font-bold uppercase mb-3">{t.name}</h3>
                  <p className="text-2xl font-black mb-1 text-[var(--drawing-accent)]">
                    {formatPrice(t.price_monthly)}
                    {t.price_monthly > 0 && (
                      <span className="text-sm text-[var(--drawing-line-thin)] font-normal">
                        {" "}
                        / мес
                      </span>
                    )}
                  </p>
                  {t.price_one_off > 0 && (
                    <p className="text-xs text-[var(--drawing-line-thin)] mb-3">
                      или {formatPrice(t.price_one_off)} за&nbsp;разовый расчёт
                    </p>
                  )}
                  <ul className="text-xs text-[var(--drawing-line-thin)] space-y-1.5 mt-4">
                    <li>· до&nbsp;{t.max_projects} проектов</li>
                    <li>· до&nbsp;{t.max_elements} элементов</li>
                    {t.allow_nonlinear && <li>· нелинейный solver</li>}
                    {t.allow_team && <li>· команда до&nbsp;{t.max_team_members} чел.</li>}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Lead-magnet — наставничество */}
        <section className="border-t-[2.5px] border-[var(--drawing-line)] pt-10 text-center">
          <p className="font-gost text-[10px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-3">
            Нужна помощь живого инженера?
          </p>
          <h2 className="font-gost-upright text-xl md:text-2xl font-black uppercase tracking-wide mb-3">
            Наставничество по&nbsp;ВКР
          </h2>
          <p className="text-sm text-[var(--drawing-line-thin)] max-w-xl mx-auto mb-5">
            CAE — инструмент. А&nbsp;если нужен опытный конструктор, который проверит ваш расчёт и&nbsp;поможет защитить диплом — мы&nbsp;здесь.
          </p>
          <Link to="/contacts" className="btn-drawing text-xs inline-flex">
            Записаться на&nbsp;диагностику&nbsp;&rarr;
          </Link>
        </section>
      </div>
    </>
  );
};

export default CaeLanding;