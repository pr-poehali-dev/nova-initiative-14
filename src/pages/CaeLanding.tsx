import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import { SITE_URL } from "@/lib/seo";
import { useAuth } from "@/contexts/AuthContext";
import { fetchCaeTariffs, joinWaitlist, type CaeTariff } from "@/lib/cae";
import Notify3DForm from "@/components/cae/Notify3DForm";
import TariffsSection from "@/components/cae/TariffsSection";
import MentoringCrossSell from "@/components/cae/MentoringCrossSell";
import AlphaTestBanner from "@/components/AlphaTestBanner";
import { rememberRefCode } from "@/lib/referrals";

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
  const [searchParams] = useSearchParams();
  const [tariffs, setTariffs] = useState<CaeTariff[]>([]);
  const [email, setEmail] = useState(user?.email || "");
  const [purpose, setPurpose] = useState("");
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Реф-код из ?ref=ABCDEFGH — запоминаем в localStorage, чтобы он передался в форму регистрации
  const refCode = (searchParams.get("ref") || "").trim().toUpperCase().slice(0, 16);
  useEffect(() => {
    if (refCode) rememberRefCode(refCode);
  }, [refCode]);

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
        {/* Альфа-тест */}
        <AlphaTestBanner className="mb-6" />

        {/* Реферальный баннер — отображается только если в URL пришёл ?ref= */}
        {refCode && !user && (
          <div className="border-[2.5px] border-[var(--drawing-accent)] bg-gradient-to-br from-[var(--drawing-accent)]/10 to-[var(--drawing-accent)]/5 p-5 mb-10 relative">
            <div className="absolute -top-px -left-px w-3 h-3 border-t-[2.5px] border-l-[2.5px] border-[var(--drawing-accent)]" />
            <div className="absolute -top-px -right-px w-3 h-3 border-t-[2.5px] border-r-[2.5px] border-[var(--drawing-accent)]" />
            <div className="absolute -bottom-px -left-px w-3 h-3 border-b-[2.5px] border-l-[2.5px] border-[var(--drawing-accent)]" />
            <div className="absolute -bottom-px -right-px w-3 h-3 border-b-[2.5px] border-r-[2.5px] border-[var(--drawing-accent)]" />
            <div className="flex flex-col md:flex-row items-start gap-4">
              <div className="bg-[var(--drawing-accent)] text-white p-3 shrink-0">
                <Icon name="Gift" size={24} />
              </div>
              <div className="flex-1">
                <p className="font-gost text-[10px] uppercase tracking-[0.25em] text-[var(--drawing-accent)] mb-1">
                  Вас пригласили в&nbsp;CAE · Код {refCode}
                </p>
                <h2 className="font-gost-upright text-xl md:text-2xl font-black uppercase tracking-wide leading-tight mb-3">
                  Друг приглашает вас попробовать CAE
                </h2>
                <ul className="space-y-1.5 text-sm text-[var(--drawing-line)] mb-4">
                  <li className="flex items-start gap-2">
                    <Icon name="Check" size={14} className="text-[var(--drawing-accent)] mt-0.5 shrink-0" />
                    <span><strong>+10 баллов</strong> вам за регистрацию по&nbsp;этой ссылке</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon name="Check" size={14} className="text-[var(--drawing-accent)] mt-0.5 shrink-0" />
                    <span>Бесплатный безлимит на&nbsp;время альфа-теста</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon name="Check" size={14} className="text-[var(--drawing-accent)] mt-0.5 shrink-0" />
                    <span>Место в&nbsp;листе ожидания приоритетной волны</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon name="Check" size={14} className="text-[var(--drawing-accent)] mt-0.5 shrink-0" />
                    <span>Ачивки и&nbsp;рейтинг с&nbsp;лучшими условиями при официальном старте</span>
                  </li>
                </ul>
                <Link
                  to={`/register?ref=${encodeURIComponent(refCode)}&waitlist=1`}
                  className="btn-drawing btn-drawing-accent text-sm inline-flex"
                >
                  <Icon name="UserPlus" size={15} className="mr-2" />
                  Зарегистрироваться и получить бонус
                </Link>
              </div>
            </div>
          </div>
        )}

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
          <p className="font-gost text-sm uppercase tracking-wider text-[var(--drawing-accent)] mb-6">
            Запуск весной 2027&nbsp;·&nbsp;Сейчас собираем ранний доступ
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/cae/demo"
              className="btn-drawing btn-drawing-accent text-sm inline-flex"
            >
              <Icon name="Play" size={15} className="mr-2" />
              Попробовать без регистрации
            </Link>
            <a
              href="#waitlist"
              className="btn-drawing text-sm inline-flex"
            >
              Записаться в ранний доступ
            </a>
          </div>
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

        {/* 3D-анонс */}
        <section className="mb-20" id="3d-notify">
          <div className="border-2 border-dashed border-amber-700/50 bg-amber-50/20 p-6 md:p-10 grid md:grid-cols-2 gap-8 items-start">
            <div>
              <p className="font-gost text-[10px] uppercase tracking-[0.3em] text-amber-700 mb-2">
                На подходе · Раздел 02.5
              </p>
              <h2 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide mb-4">
                3D-редактор
                <br />
                пространственных рам
              </h2>
              <ul className="space-y-2 text-sm text-[var(--drawing-line-thin)]">
                {[
                  "6 степеней свободы в узле: N, Qy, Qz, Mz, My, Mx",
                  "Проверки элементов по СП 16.13330 (сталь)",
                  "Пространственные эпюры и цветовые карты напряжений",
                  "PDF-отчёт с 3D-схемой и таблицами усилий",
                  "Импорт схемы из DXF (в планах)",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Icon name="Box" size={13} className="text-amber-700 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-[var(--drawing-line-thin)] border-l-2 border-amber-700/40 pl-3">
                Сейчас проходим верификацию на&nbsp;эталонных задачах из&nbsp;учебника Пособие к&nbsp;СП&nbsp;16.
                Релиз — по&nbsp;готовности верификации, не&nbsp;раньше.
              </p>
            </div>
            <div className="drawing-frame p-6 bg-[var(--drawing-bg)]">
              <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1 text-center">
                Уведомить о запуске
              </p>
              <h3 className="font-gost-upright text-lg font-bold uppercase tracking-wide text-center mb-5">
                Быть первым
              </h3>
              <Notify3DForm variant="full" />
            </div>
          </div>
        </section>

        {/* Tariffs */}
        {tariffs.length > 0 && (
          <TariffsSection tariffs={tariffs} />
        )}

        <MentoringCrossSell />
      </div>
    </>
  );
};

export default CaeLanding;