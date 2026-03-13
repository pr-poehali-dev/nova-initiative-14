import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import CONTACT from "@/constants/contactInfo";

interface FormData {
  name: string;
  contact: string;
  university: string;
  topic: string;
  timeLeft: string;
  hasChapters: string;
  pagesReady: string;
  hasComments: string;
  commentsText: string;
  consent: boolean;
}

const initialForm: FormData = {
  name: "",
  contact: "",
  university: "",
  topic: "",
  timeLeft: "",
  hasChapters: "",
  pagesReady: "",
  hasComments: "",
  commentsText: "",
  consent: false,
};

const Contacts = () => {
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitted, setSubmitted] = useState(false);

  const update = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) errs.name = "Укажите имя";
    if (!form.contact.trim()) errs.contact = "Укажите телефон или Telegram";
    if (!form.timeLeft) errs.timeLeft = "Выберите срок";
    if (!form.consent) errs.consent = "Необходимо согласие";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setSubmitted(true);
    }
  };

  return (
    <main className="min-h-screen grid-bg">
      <section className="pt-28 pb-16 px-4 md:px-8 max-w-[1200px] mx-auto">
        <div className="drawing-frame p-6 md:p-10 relative">
          <div className="zone-marker top-2 left-3">Ж1</div>
          <div className="zone-marker top-2 right-3">Зона VII</div>

          <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-3">
            Контакты и запись&nbsp;&middot; ДИПЛОМ.ИНЖ
          </div>
          <div className="extension-line-h w-full mb-6" />

          <h1 className="font-gost-upright text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[0.95] mb-6 text-[var(--drawing-line)]">
            Свяжитесь
            <br />
            <span className="text-[var(--drawing-accent)]">с нами</span>
          </h1>

          <div className="extension-line-h w-3/4 my-5" />

          <p className="font-gost text-sm md:text-base max-w-2xl text-[var(--drawing-line-thin)] leading-relaxed">
            Запишитесь на бесплатную диагностику ВКР или задайте вопрос.
          </p>
        </div>
      </section>

      <section className="px-4 md:px-8 max-w-[1200px] mx-auto pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <div className="lg:col-span-7">
            {submitted ? (
              <div className="drawing-frame p-8 md:p-10 text-center">
                <div className="flex justify-center mb-4">
                  <span className="w-14 h-14 border-[2px] border-green-700 flex items-center justify-center text-green-700">
                    <Icon name="Check" size={28} />
                  </span>
                </div>
                <h2 className="font-gost-upright text-2xl font-bold tracking-tight mb-4 text-[var(--drawing-line)]">
                  Заявка отправлена!
                </h2>
                <div className="extension-line-h w-32 mx-auto my-4" />
                <p className="font-gost text-sm text-[var(--drawing-line-thin)] leading-relaxed max-w-md mx-auto mb-6">
                  Мы свяжемся в&nbsp;течение 2&nbsp;часов в&nbsp;рабочее время (10:00&ndash;20:00).
                  <br />
                  Или напишите нам в&nbsp;Telegram: <a href={CONTACT.telegramLink} target="_blank" rel="noopener noreferrer" className="text-[var(--drawing-accent)] hover:underline">{CONTACT.telegram}</a>
                </p>
                <button
                  className="btn-drawing text-xs"
                  onClick={() => { setSubmitted(false); setForm(initialForm); setErrors({}); }}
                >
                  Отправить ещё одну заявку
                </button>
              </div>
            ) : (
              <div className="drawing-frame p-6 md:p-8 relative">
                <div className="zone-marker top-2 right-3">Ф</div>

                <h2 className="font-gost-upright text-lg md:text-xl font-bold tracking-tight mb-1 text-[var(--drawing-line)]">
                  Запись на бесплатную диагностику ВКР
                </h2>
                <p className="font-gost text-xs text-[var(--drawing-line-thin)] mb-6">
                  20&ndash;30 минут, разберём ваш план или черновик. Без обязательств.
                </p>

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  <div>
                    <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1 block">
                      Имя <span className="text-[var(--drawing-accent)]">*</span>
                    </label>
                    <input
                      type="text"
                      className="drawing-input"
                      placeholder="Как к вам обращаться"
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                    />
                    {errors.name && <p className="font-gost text-[10px] text-[var(--drawing-accent)] mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1 block">
                      Телефон или Telegram <span className="text-[var(--drawing-accent)]">*</span>
                    </label>
                    <input
                      type="text"
                      className="drawing-input"
                      placeholder="+7 (___) ___-__-__ или @username"
                      value={form.contact}
                      onChange={(e) => update("contact", e.target.value)}
                    />
                    {errors.contact && <p className="font-gost text-[10px] text-[var(--drawing-accent)] mt-1">{errors.contact}</p>}
                  </div>

                  <div>
                    <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1 block">
                      Университет / кафедра
                    </label>
                    <input
                      type="text"
                      className="drawing-input"
                      placeholder="Например: УрФУ, кафедра ТМС"
                      value={form.university}
                      onChange={(e) => update("university", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1 block">
                      Тема ВКР
                    </label>
                    <textarea
                      className="drawing-input resize-none"
                      rows={2}
                      placeholder="Кратко опишите тему или направление"
                      value={form.topic}
                      onChange={(e) => update("topic", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1 block">
                      Сколько времени до защиты <span className="text-[var(--drawing-accent)]">*</span>
                    </label>
                    <select
                      className="drawing-input"
                      value={form.timeLeft}
                      onChange={(e) => update("timeLeft", e.target.value)}
                    >
                      <option value="">Выберите...</option>
                      <option value="3+">Больше 3 месяцев</option>
                      <option value="1-3">1&ndash;3 месяца</option>
                      <option value="2-4w">2&ndash;4 недели</option>
                      <option value="<1w">Меньше недели</option>
                      <option value="unknown">Не знаю точно</option>
                    </select>
                    {errors.timeLeft && <p className="font-gost text-[10px] text-[var(--drawing-accent)] mt-1">{errors.timeLeft}</p>}
                  </div>

                  <div>
                    <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-2 block">
                      Нужно ли проверить уже написанные главы?
                    </label>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="hasChapters"
                          value="yes"
                          checked={form.hasChapters === "yes"}
                          onChange={(e) => update("hasChapters", e.target.value)}
                          className="accent-[var(--drawing-accent)]"
                        />
                        <span className="font-gost text-xs text-[var(--drawing-line)]">Да</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="hasChapters"
                          value="no"
                          checked={form.hasChapters === "no"}
                          onChange={(e) => update("hasChapters", e.target.value)}
                          className="accent-[var(--drawing-accent)]"
                        />
                        <span className="font-gost text-xs text-[var(--drawing-line)]">Нет</span>
                      </label>
                    </div>
                  </div>

                  {form.hasChapters === "yes" && (
                    <div>
                      <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1 block">
                        Сколько страниц уже есть?
                      </label>
                      <input
                        type="number"
                        className="drawing-input"
                        placeholder="Примерное количество"
                        min={0}
                        value={form.pagesReady}
                        onChange={(e) => update("pagesReady", e.target.value)}
                      />
                    </div>
                  )}

                  <div>
                    <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-2 block">
                      Есть ли замечания научного руководителя?
                    </label>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="hasComments"
                          value="yes"
                          checked={form.hasComments === "yes"}
                          onChange={(e) => update("hasComments", e.target.value)}
                          className="accent-[var(--drawing-accent)]"
                        />
                        <span className="font-gost text-xs text-[var(--drawing-line)]">Да</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="hasComments"
                          value="no"
                          checked={form.hasComments === "no"}
                          onChange={(e) => update("hasComments", e.target.value)}
                          className="accent-[var(--drawing-accent)]"
                        />
                        <span className="font-gost text-xs text-[var(--drawing-line)]">Нет</span>
                      </label>
                    </div>
                  </div>

                  {form.hasComments === "yes" && (
                    <div>
                      <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1 block">
                        Текст замечаний
                      </label>
                      <textarea
                        className="drawing-input resize-none"
                        rows={3}
                        placeholder="Вставьте замечания или опишите кратко"
                        value={form.commentsText}
                        onChange={(e) => update("commentsText", e.target.value)}
                      />
                    </div>
                  )}

                  <div className="extension-line-h w-full" />

                  <div>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.consent}
                        onChange={(e) => update("consent", e.target.checked)}
                        className="accent-[var(--drawing-accent)] mt-1 shrink-0"
                      />
                      <span className="font-gost text-[10px] text-[var(--drawing-line-thin)] leading-relaxed">
                        Я согласен на обработку персональных данных в&nbsp;соответствии с{" "}
                        <Link to="/privacy" className="text-[var(--drawing-accent)] hover:underline">
                          политикой конфиденциальности
                        </Link>
                      </span>
                    </label>
                    {errors.consent && <p className="font-gost text-[10px] text-[var(--drawing-accent)] mt-1">{errors.consent}</p>}
                  </div>

                  <button type="submit" className="btn-drawing btn-drawing-accent text-xs w-full">
                    Записаться на диагностику
                  </button>
                </form>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="drawing-frame p-6">
              <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-4">
                Каналы связи
              </div>

              <div className="space-y-4">
                <a
                  href={CONTACT.telegramLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 font-gost text-sm text-[var(--drawing-line)] hover:text-[var(--drawing-accent)] transition-colors"
                >
                  <span className="shrink-0 w-9 h-9 border-[1.5px] border-[var(--drawing-line)] flex items-center justify-center">
                    <Icon name="Send" size={16} />
                  </span>
                  Telegram {CONTACT.telegram}
                </a>

                <a
                  href={CONTACT.phoneTel}
                  className="flex items-center gap-3 font-gost text-sm text-[var(--drawing-line)] hover:text-[var(--drawing-accent)] transition-colors"
                >
                  <span className="shrink-0 w-9 h-9 border-[1.5px] border-[var(--drawing-line)] flex items-center justify-center">
                    <Icon name="Phone" size={16} />
                  </span>
                  {CONTACT.phone}
                </a>

                <div className="flex items-center gap-3 font-gost text-sm text-[var(--drawing-line-thin)]">
                  <span className="shrink-0 w-9 h-9 border-[1.5px] border-[var(--drawing-line)] flex items-center justify-center">
                    <Icon name="Clock" size={16} />
                  </span>
                  {CONTACT.workingHoursLabel} ({CONTACT.city}, {CONTACT.timezone})
                </div>
              </div>
            </div>

            <div className="drawing-frame p-6 hatching">
              <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-4">
                Что после заявки
              </div>

              <div className="space-y-4">
                {[
                  "Вы оставляете заявку",
                  "Мы отвечаем в течение 2 часов",
                  "Назначаем диагностику (20\u201330 мин)",
                  "Разбираем план/черновик, подбираем тариф",
                  "Согласуем условия и график",
                  "Начинаем работу через 1\u20133 дня после оплаты",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 border-[1.5px] border-[var(--drawing-line)] flex items-center justify-center font-gost-upright text-[10px] font-bold">
                      {i + 1}
                    </span>
                    <p className="font-gost text-xs text-[var(--drawing-line)] leading-relaxed pt-0.5">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-[1.5px] border-[var(--drawing-line)] p-5">
              <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-3">
                Быстрая связь
              </div>
              <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-relaxed mb-3">
                Если не хотите заполнять форму&nbsp;&mdash; просто напишите в&nbsp;Telegram. Расскажите тему, сколько времени до защиты и&nbsp;что уже готово.
              </p>
              <a
                href={CONTACT.telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-drawing text-xs inline-block"
              >
                Написать в Telegram&nbsp;&rarr;
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Contacts;