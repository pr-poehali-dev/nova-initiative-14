import Icon from "@/components/ui/icon";

export interface MethodFormula {
  /** Краткое название величины, например «Изгибающий момент» */
  label: string;
  /** Формула в текстовом виде, например «σ = M / W» */
  formula: string;
  /** Расшифровка обозначений */
  legend: string;
}

export interface MethodNorm {
  /** Обозначение норматива, например «ГОСТ 8239-89» */
  code: string;
  /** Что регламентирует */
  about: string;
}

export interface CaeMethodologyProps {
  /** Заголовок секции, например «Как считается расчёт балки» */
  title: string;
  /** Вводный абзац: какая модель и метод используются */
  intro: string;
  /** Допущения расчётной модели */
  assumptions: string[];
  /** Ключевые формулы прочности и жёсткости */
  formulas: MethodFormula[];
  /** Нормативные документы (ГОСТ / СП), по которым ведётся проверка */
  norms: MethodNorm[];
  /** Что именно проверяет сервис (критерии) */
  checks: string[];
}

/**
 * Блок «Как считается?» для CAE-посадочных страниц.
 *
 * GEO-назначение: даёт ИИ-поиску (Алиса, Google AI Overviews, Gemini)
 * явные фактические утверждения — метод, допущения, формулы и нормы ГОСТ.
 * Такой структурированный методический контент ИИ цитирует дословно и
 * повышает доверие к сервису у инженеров и студентов.
 */
const CaeMethodology = ({
  title,
  intro,
  assumptions,
  formulas,
  norms,
  checks,
}: CaeMethodologyProps) => {
  return (
    <section className="mb-12">
      <h2 className="font-gost-upright text-2xl font-black uppercase tracking-wide mb-4">
        {title}
      </h2>
      <p className="text-base text-[var(--drawing-line)] leading-relaxed mb-6">
        {intro}
      </p>

      {/* Допущения модели */}
      <h3 className="font-gost-upright font-bold text-lg mb-3 flex items-center gap-2">
        <Icon name="Ruler" size={18} className="text-[var(--drawing-accent)]" />
        Допущения расчётной модели
      </h3>
      <ul className="space-y-2 text-[var(--drawing-line)] mb-7">
        {assumptions.map((a) => (
          <li key={a} className="flex items-start gap-2">
            <Icon name="Dot" size={18} className="text-[var(--drawing-accent)] mt-0.5 shrink-0" />
            <span>{a}</span>
          </li>
        ))}
      </ul>

      {/* Формулы */}
      <h3 className="font-gost-upright font-bold text-lg mb-3 flex items-center gap-2">
        <Icon name="Sigma" size={18} className="text-[var(--drawing-accent)]" />
        Основные формулы
      </h3>
      <div className="space-y-3 mb-7">
        {formulas.map((f) => (
          <div
            key={f.label}
            className="border-[1.5px] border-[var(--drawing-line)]/40 p-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3 mb-1">
              <span className="font-gost-upright font-bold text-base">{f.label}</span>
              <code className="font-mono text-[var(--drawing-accent)] text-base">
                {f.formula}
              </code>
            </div>
            <p className="text-sm text-[var(--drawing-line-thin)] leading-relaxed">
              {f.legend}
            </p>
          </div>
        ))}
      </div>

      {/* Что проверяет сервис */}
      <h3 className="font-gost-upright font-bold text-lg mb-3 flex items-center gap-2">
        <Icon name="ShieldCheck" size={18} className="text-[var(--drawing-accent)]" />
        Что проверяет сервис
      </h3>
      <ul className="space-y-2 text-[var(--drawing-line)] mb-7">
        {checks.map((c) => (
          <li key={c} className="flex items-start gap-2">
            <Icon name="Check" size={16} className="text-[var(--drawing-accent)] mt-0.5 shrink-0" />
            <span>{c}</span>
          </li>
        ))}
      </ul>

      {/* Нормативная база */}
      <h3 className="font-gost-upright font-bold text-lg mb-3 flex items-center gap-2">
        <Icon name="BookMarked" size={18} className="text-[var(--drawing-accent)]" />
        Нормативная база
      </h3>
      <ul className="space-y-2 text-[var(--drawing-line)]">
        {norms.map((n) => (
          <li key={n.code} className="flex items-start gap-2">
            <Icon name="FileText" size={16} className="text-[var(--drawing-accent)] mt-0.5 shrink-0" />
            <span>
              <strong className="font-gost-upright">{n.code}</strong> — {n.about}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default CaeMethodology;
