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
import ProgramHero from "@/components/program/ProgramHero";
import ProgramNav from "@/components/program/ProgramNav";
import ProgramModuleCard from "@/components/program/ProgramModuleCard";
import ReviewProcess from "@/components/program/ReviewProcess";
import ProgramCta from "@/components/program/ProgramCta";

const Program = () => {
  return (
    <main className="min-h-screen grid-bg">
      <Seo />
      <ProgramHero />
      <ProgramNav modules={PROGRAM_MODULES} />

      <section className="px-4 md:px-8 max-w-[1200px] mx-auto space-y-10 pb-16">
        {PROGRAM_MODULES.map((m, i) => (
          <ProgramModuleCard key={m.num} module={m} withHatching={i % 2 === 1} />
        ))}
      </section>

      <ReviewProcess />
      <ProgramCta />
    </main>
  );
};

export default Program;
