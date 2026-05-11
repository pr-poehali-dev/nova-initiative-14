import { useState, FormEvent } from "react";
import Icon from "@/components/ui/icon";
import { getVisitorData } from "@/hooks/useVisitorTracking";
import { markFormSubmitted } from "@/App";
import func2url from "../../backend/func2url.json";

interface VacancyForm {
  name: string;
  contact: string;
  education: string;
  experience: string;
  about: string;
  resumeLink: string;
  specialization: string;
  consent: boolean;
}

const initial: VacancyForm = {
  name: "",
  contact: "",
  education: "",
  experience: "",
  about: "",
  resumeLink: "",
  specialization: "",
  consent: false,
};

const Vacancies = () => {
  const [form, setForm] = useState<VacancyForm>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof VacancyForm, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (field: keyof VacancyForm, value: string | boolean) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: undefined }));
  };

  const validate = () => {
    const errs: Partial<Record<keyof VacancyForm, string>> = {};
    if (!form.name.trim()) errs.name = "Укажите имя";
    if (!form.contact.trim()) errs.contact = "Укажите контакт";
    if (!form.education.trim()) errs.education = "Укажите образование";
    if (!form.experience.trim()) errs.experience = "Опишите опыт";
    if (!form.about.trim()) errs.about = "Кратко расскажите о себе";
    if (!form.consent) errs.consent = "Необходимо согласие";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      markFormSubmitted();
      await fetch(func2url["create-vacancy"], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, visitor: getVisitorData() }),
      });
    } catch (_) {
      console.error(_);
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <main className="min-h-screen grid-bg">
      <section className="pt-28 pb-16 px-4 md:px-8 max-w-[1200px] mx-auto">
        <div className="drawing-frame p-6 md:p-10 relative">
          <div className="zone-marker top-2 left-3">В1</div>
          <div className="zone-marker top-2 right-3">Зона X</div>

          <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-3">
            Вакансии&nbsp;&middot; Диплом-Инж.рф
          </div>
          <div className="extension-line-h w-full mb-6" />

          <h1 className="font-gost-upright text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[0.95] mb-6 text-[var(--drawing-line)]">
            Стать
            <br />
            <span className="text-[var(--drawing-accent)]">наставником</span>
          </h1>

          <div className="extension-line-h w-3/4 my-5" />

          <p className="font-gost text-sm md:text-base max-w-2xl text-[var(--drawing-line-thin)] leading-relaxed">
            Ищем практикующих инженеров с&nbsp;опытом проектирования и&nbsp;желанием делиться знаниями. Профиль: машиностроение и&nbsp;механика.
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
                  Спасибо за&nbsp;интерес. Мы рассмотрим заявку и&nbsp;свяжемся с&nbsp;вами в&nbsp;течение нескольких рабочих дней.
                </p>
                <button
                  className="btn-drawing text-xs"
                  onClick={() => { setSubmitted(false); setForm(initial); setErrors({}); }}
                >
                  Отправить ещё одну заявку
                </button>
              </div>
            ) : (
              <div className="drawing-frame p-6 md:p-8">
                <h2 className="font-gost-upright text-lg md:text-xl font-bold tracking-tight mb-1 text-[var(--drawing-line)]">
                  Заявка на вакансию наставника
                </h2>
                <p className="font-gost text-xs text-[var(--drawing-line-thin)] mb-6">
                  Все поля кроме «Резюме» и&nbsp;«Специализация» обязательны.
                </p>

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  <div>
                    <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1 block">
                      Имя <span className="text-[var(--drawing-accent)]">*</span>
                    </label>
                    <input type="text" className="drawing-input" placeholder="Как к вам обращаться" value={form.name} onChange={(e) => update("name", e.target.value)} />
                    {errors.name && <p className="font-gost text-[10px] text-[var(--drawing-accent)] mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1 block">
                      Контакт (телефон / Telegram / email) <span className="text-[var(--drawing-accent)]">*</span>
                    </label>
                    <input type="text" className="drawing-input" placeholder="+7 (___) ___-__-__ или @username или email" value={form.contact} onChange={(e) => update("contact", e.target.value)} />
                    {errors.contact && <p className="font-gost text-[10px] text-[var(--drawing-accent)] mt-1">{errors.contact}</p>}
                  </div>

                  <div>
                    <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1 block">
                      Образование / вуз <span className="text-[var(--drawing-accent)]">*</span>
                    </label>
                    <input type="text" className="drawing-input" placeholder="Например: УрФУ, машиностроение, 2018" value={form.education} onChange={(e) => update("education", e.target.value)} />
                    {errors.education && <p className="font-gost text-[10px] text-[var(--drawing-accent)] mt-1">{errors.education}</p>}
                  </div>

                  <div>
                    <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1 block">
                      Опыт в преподавании / наставничестве <span className="text-[var(--drawing-accent)]">*</span>
                    </label>
                    <textarea className="drawing-input resize-none" rows={2} placeholder="Сколько лет, кому преподавали, есть ли опыт работы со студентами" value={form.experience} onChange={(e) => update("experience", e.target.value)} />
                    {errors.experience && <p className="font-gost text-[10px] text-[var(--drawing-accent)] mt-1">{errors.experience}</p>}
                  </div>

                  <div>
                    <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1 block">
                      Специализация / темы ВКР
                    </label>
                    <textarea className="drawing-input resize-none" rows={2} placeholder="Какие темы можете вести: детали машин, технология, CAD/CAE и т.д." value={form.specialization} onChange={(e) => update("specialization", e.target.value)} />
                  </div>

                  <div>
                    <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1 block">
                      Ссылка на резюме / портфолио
                    </label>
                    <input type="text" className="drawing-input" placeholder="hh.ru, LinkedIn, Google Drive, личный сайт" value={form.resumeLink} onChange={(e) => update("resumeLink", e.target.value)} />
                  </div>

                  <div>
                    <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1 block">
                      О себе / почему хотите к нам <span className="text-[var(--drawing-accent)]">*</span>
                    </label>
                    <textarea className="drawing-input resize-none" rows={4} placeholder="Расскажите о себе и почему вам близка идея наставничества" value={form.about} onChange={(e) => update("about", e.target.value)} />
                    {errors.about && <p className="font-gost text-[10px] text-[var(--drawing-accent)] mt-1">{errors.about}</p>}
                  </div>

                  <div className="extension-line-h w-full" />

                  <div>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={form.consent} onChange={(e) => update("consent", e.target.checked)} className="accent-[var(--drawing-accent)] mt-1 shrink-0" />
                      <span className="font-gost text-[10px] text-[var(--drawing-line-thin)] leading-relaxed">
                        Я согласен на&nbsp;обработку персональных данных
                      </span>
                    </label>
                    {errors.consent && <p className="font-gost text-[10px] text-[var(--drawing-accent)] mt-1">{errors.consent}</p>}
                  </div>

                  <button type="submit" disabled={loading} className="btn-drawing btn-drawing-accent text-xs w-full disabled:opacity-60">
                    {loading ? "Отправляем..." : "Отправить заявку"}
                  </button>
                </form>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="drawing-frame p-6">
              <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-4">
                Кого мы ищем
              </div>
              <ul className="space-y-3">
                {[
                  "Действующих инженеров-конструкторов и технологов",
                  "С опытом проектирования и работы по ЕСКД",
                  "Знание CAD/CAE: КОМПАС-3D, SolidWorks, AutoCAD",
                  "Готовых терпеливо объяснять и работать со студентами",
                  "С желанием быть наставником, а не «писать за студента»",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 font-gost text-xs text-[var(--drawing-line)] leading-relaxed">
                    <span className="w-3 h-[2px] bg-[var(--drawing-accent)] mt-2 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="drawing-frame p-6 hatching">
              <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-4">
                Что предлагаем
              </div>
              <ul className="space-y-3">
                {[
                  "Гибкий график, формат работы — удалённо или гибрид",
                  "Прозрачная оплата за занятие или фиксированная за проект",
                  "Сопровождение организационной частью с нашей стороны",
                  "Возможность работать с темами, которые вам интересны",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 font-gost text-xs text-[var(--drawing-line)] leading-relaxed">
                    <span className="w-3 h-[2px] bg-[var(--drawing-accent)] mt-2 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Vacancies;
