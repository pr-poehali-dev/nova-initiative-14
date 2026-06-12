/**
 * Страница /program — программа наставничества по дипломному проекту.
 *
 * Композиция:
 *   - ProgramHero        — заголовок + краткая характеристика программы
 *   - ProgramNav         — якорная навигация по 10 модулям
 *   - ProgramModuleCard  — карточка одного модуля (×10, чередование штриховки)
 *   - ReviewProcess      — секция «Как мы проверяем материалы»
 *   - ProgramCta         — CTA «Записаться на диагностику»
 *
 * Контент модулей и шагов проверки — в @/data/program-modules.
 */
import Seo from "@/components/Seo";
import { PROGRAM_MODULES } from "@/data/program-modules";
import { absUrl, breadcrumbsLd, courseLd, getPageSeo } from "@/lib/seo";
import ProgramHero from "@/components/program/ProgramHero";
import ProgramNav from "@/components/program/ProgramNav";
import ProgramModuleCard from "@/components/program/ProgramModuleCard";
import ReviewProcess from "@/components/program/ReviewProcess";
import ProgramCta from "@/components/program/ProgramCta";
import RelatedSections from "@/components/RelatedSections";

const Program = () => {
  const seo = getPageSeo("/program");
  const jsonLd = [
    courseLd({
      name: "Наставничество по дипломному проекту (ВКР) — машиностроение",
      description: seo.description,
      url: absUrl("/program"),
      hasParts: PROGRAM_MODULES.map((m) => `${m.num}. ${m.title}`),
    }),
    breadcrumbsLd([["Программа", "/program"]]),
  ];

  return (
    <main className="min-h-screen grid-bg">
      <Seo jsonLd={jsonLd} />
      <ProgramHero />
      <ProgramNav modules={PROGRAM_MODULES} />

      <section className="px-4 md:px-8 max-w-[1200px] mx-auto space-y-10 pb-16">
        {PROGRAM_MODULES.map((m, i) => (
          <ProgramModuleCard key={m.num} module={m} withHatching={i % 2 === 1} />
        ))}
      </section>

      <ReviewProcess />
      <ProgramCta />

      <RelatedSections
        links={[
          { to: "/cae", icon: "Calculator", title: "CAE-сервис", text: "Считайте балки, рамы и фермы онлайн — эпюры N/Q/M и PDF-отчёт по ЕСКД для приложения к ВКР." },
          { to: "/cases", icon: "FileCheck", title: "Кейсы студентов", text: "Реальные истории: с чем приходили и как доводили дипломный проект до защиты." },
          { to: "/pricing", icon: "Tags", title: "Тарифы", text: "Форматы наставничества под ваш срок и бюджет — от экспресса до сопровождения на 3 месяца." },
          { to: "/blog", icon: "BookOpen", title: "Блог", text: "Разборы по расчётам, ЕСКД и подготовке к защите для будущих инженеров." },
        ]}
      />
    </main>
  );
};

export default Program;