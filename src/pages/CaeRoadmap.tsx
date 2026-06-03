import { Helmet } from "@/lib/helmet-shim";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { SITE_URL } from "@/lib/seo";
import {
  PLM_ROADMAP,
  STATUS_META,
  roadmapStats,
  type RoadmapStatus,
} from "@/lib/plmRoadmap";

/**
 * Публичная дорожная карта развития сервиса в сторону PLM (тикет №43).
 * Показывает этапы от текущего фундамента к «большой затее»: совместная
 * работа, модули, авторасчёт соединений, спецификация/РПЗ, CAD/КЭМ, идеи.
 */
export default function CaeRoadmap() {
  const stats = roadmapStats();

  return (
    <>
      <Helmet>
        <title>Дорожная карта PLM · развитие CAE-сервиса · Диплом-Инж.рф</title>
        <meta
          name="description"
          content="Куда движется Диплом-Инж.рф: от облачного CAE-расчёта рам к полноценной PLM-платформе — совместная работа над проектом, модули конструкции, авторасчёт сварных и болтовых соединений, спецификация и пояснительная записка, расчёт стоимости."
        />
        <link rel="canonical" href={`${SITE_URL}/cae/roadmap`} />
      </Helmet>

      <div className="max-w-[880px] mx-auto px-4 pt-20 md:pt-24 pb-16">
        <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-2">
          CAE → PLM · Дорожная карта
        </p>
        <h1 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide mb-3">
          Куда движется сервис
        </h1>
        <p className="text-sm text-[var(--drawing-line-thin)] mb-6 leading-relaxed max-w-2xl">
          Мы развиваем расчётный CAE-редактор в сторону полноценной
          PLM-платформы: совместная работа над проектом, деление конструкции на
          модули, автоматический расчёт соединений, спецификация и пояснительная
          записка, оценка стоимости. Здесь открыто показано, что уже готово, что
          в работе и что впереди.
        </p>

        {/* Сводка по статусам */}
        <div className="flex flex-wrap gap-3 mb-10 text-xs font-gost">
          <span className="border border-green-700 text-green-700 px-2 py-1 uppercase tracking-wider inline-flex items-center gap-1">
            <Icon name="CheckCircle2" size={12} /> Готово: {stats.done}
          </span>
          <span className="border border-[var(--drawing-line)] text-[var(--drawing-line-thin)] px-2 py-1 uppercase tracking-wider inline-flex items-center gap-1">
            <Icon name="ListChecks" size={12} /> Всего задач: {stats.total}
          </span>
          <Link
            to="/cae/changelog"
            className="border border-[var(--drawing-accent)] text-[var(--drawing-accent)] px-2 py-1 uppercase tracking-wider inline-flex items-center gap-1 hover:bg-[var(--drawing-accent)]/5"
          >
            <Icon name="History" size={12} /> Журнал версий
          </Link>
        </div>

        <div className="space-y-10">
          {PLM_ROADMAP.map((phase, i) => (
            <section key={phase.key} id={phase.key}>
              <div className="flex items-start gap-3 mb-3">
                <div className="shrink-0 w-9 h-9 border-2 border-[var(--drawing-line)] flex items-center justify-center bg-[var(--drawing-bg)]">
                  <Icon name={phase.icon} size={18} fallback="Circle" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-gost-upright font-bold text-base md:text-lg">
                      {phase.title}
                    </h2>
                    <span className="font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)] border border-[var(--drawing-line-thin)] px-1.5 py-0.5">
                      {phase.horizon}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--drawing-line-thin)] leading-relaxed mt-1">
                    {phase.summary}
                  </p>
                </div>
              </div>

              <ul className="ml-12 space-y-2">
                {phase.tasks.map((task, j) => {
                  const meta = STATUS_META[task.status as RoadmapStatus];
                  return (
                    <li
                      key={`${i}-${j}`}
                      className="border-l-2 border-[var(--drawing-line)]/20 pl-3 py-0.5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-gost-upright font-bold text-sm">
                          {task.title}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 font-gost text-[9px] uppercase tracking-wider border px-1.5 py-0.5 ${meta.cls}`}
                        >
                          <Icon name={meta.icon} size={10} fallback="Circle" />
                          {meta.label}
                        </span>
                      </div>
                      {task.note && (
                        <p className="text-[13px] text-[var(--drawing-line-thin)] leading-snug mt-0.5">
                          {task.note}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-12 border-t border-[var(--drawing-line)]/20 pt-6">
          <p className="text-sm text-[var(--drawing-line-thin)] leading-relaxed">
            Есть идея или приоритет? Предложения по развитию принимаем через
            обращения в кабинете — авторам полезных идей начисляем баллы.
          </p>
          <Link
            to="/account"
            className="btn-drawing text-xs inline-flex items-center mt-3 border-[var(--drawing-accent)] text-[var(--drawing-accent)]"
          >
            <Icon name="Lightbulb" size={14} className="mr-1.5" />
            Предложить идею
          </Link>
        </div>
      </div>
    </>
  );
}
