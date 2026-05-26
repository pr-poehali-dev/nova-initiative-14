/**
 * Диалог настроек расчёта.
 * Управляет model.analysis_settings: отрасль, теория прочности, коэф. запаса,
 * включение/отключение проверок.
 *
 * Изменения мгновенно применяются к модели и сохраняются вместе с проектом.
 */
import Icon from "@/components/ui/icon";
import {
  type AnalysisSettings,
  type StrengthTheory,
  type IndustryKind,
  DEFAULT_ANALYSIS_SETTINGS,
} from "@/lib/cae-model";
import { INDUSTRIES } from "@/lib/cae-industry";

interface Props {
  open: boolean;
  onClose: () => void;
  settings: AnalysisSettings;
  onChange: (s: AnalysisSettings) => void;
}

const THEORIES: { key: StrengthTheory; label: string; formula: string; description: string }[] = [
  {
    key: "mises",
    label: "4-я (Мизес)",
    formula: "σ_экв = √(σ² + 3τ²)",
    description: "Энергетическая теория. Подходит для пластичных металлов: сталь, алюминий, медь. По умолчанию.",
  },
  {
    key: "tresca",
    label: "3-я (Треска)",
    formula: "σ_экв = √(σ² + 4τ²)",
    description: "Максимальных касательных. Чуть консервативнее Мизеса (~15%). Также для пластичных материалов.",
  },
  {
    key: "normal",
    label: "1-я (нормальные)",
    formula: "σ_экв = |σ_max|",
    description: "Для хрупких материалов: чугун, керамика. В машиностроении применяется редко.",
  },
];

const EditorAnalysisSettingsDialog = ({ open, onClose, settings, onChange }: Props) => {
  if (!open) return null;

  const update = (patch: Partial<AnalysisSettings>) => {
    onChange({ ...settings, ...patch });
  };

  return (
    <div className="fixed inset-0 z-[95] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-[var(--drawing-bg)] border-2 border-[var(--drawing-line)] max-w-[720px] w-full max-h-[90vh] overflow-auto shadow-2xl">
        <div className="border-b-2 border-[var(--drawing-line)] px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-gost-upright text-[18px] font-bold text-[var(--drawing-ink)]">
              Настройки расчёта
            </h2>
            <p className="font-gost text-[11px] text-[var(--drawing-line-thin)] mt-1">
              Отрасль, теория прочности, коэффициент запаса — влияют на проверки и итоговый коэф. использования η
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[var(--drawing-paper)]" title="Закрыть">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* ОТРАСЛЬ */}
          <section>
            <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-2">
              Отрасль применения · [f] = L / k
            </p>
            <div className="space-y-1.5">
              {INDUSTRIES.map((ind) => {
                const selected = settings.industry === ind.key;
                return (
                  <button
                    key={ind.key}
                    onClick={() => update({ industry: ind.key as IndustryKind })}
                    className={`w-full text-left border p-2.5 transition ${
                      selected
                        ? "border-[var(--drawing-accent)] bg-[var(--drawing-accent)]/5"
                        : "border-[var(--drawing-line)] hover:bg-[var(--drawing-paper)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-gost-upright text-[13px] font-bold text-[var(--drawing-ink)]">
                          {ind.label}
                        </p>
                        <p className="font-gost text-[11px] text-[var(--drawing-line-thin)] mt-0.5 leading-snug">
                          {ind.description}
                        </p>
                        <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] mt-1 italic">
                          {ind.source}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono text-[11px] text-[var(--drawing-accent)] font-bold">
                          {ind.deflection_label}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {settings.industry === "custom" && (
              <div className="mt-3 p-3 border border-dashed border-[var(--drawing-line)]">
                <label className="font-gost text-[11px] text-[var(--drawing-ink)]">
                  Свой делитель k (формула [f] = L / k)
                  <input
                    type="number"
                    min={10}
                    step={10}
                    value={settings.custom_deflection_divisor ?? 250}
                    onChange={(e) =>
                      update({ custom_deflection_divisor: parseFloat(e.target.value) || null })
                    }
                    className="block w-32 mt-1 border border-[var(--drawing-line)] bg-[var(--drawing-bg)] px-2 py-1 font-mono text-[12px]"
                  />
                  <span className="block mt-1 text-[10px] text-[var(--drawing-line-thin)]">
                    Например: 300 → [f] = L/300. Чем больше k, тем строже требование.
                  </span>
                </label>
              </div>
            )}
          </section>

          {/* ТЕОРИЯ ПРОЧНОСТИ */}
          <section>
            <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-2">
              Теория прочности
            </p>
            <div className="grid md:grid-cols-3 gap-2">
              {THEORIES.map((th) => {
                const selected = settings.strength_theory === th.key;
                return (
                  <button
                    key={th.key}
                    onClick={() => update({ strength_theory: th.key })}
                    className={`text-left border p-2.5 transition ${
                      selected
                        ? "border-[var(--drawing-accent)] bg-[var(--drawing-accent)]/5"
                        : "border-[var(--drawing-line)] hover:bg-[var(--drawing-paper)]"
                    }`}
                  >
                    <p className="font-gost-upright text-[12px] font-bold text-[var(--drawing-ink)]">
                      {th.label}
                    </p>
                    <p className="font-mono text-[10px] text-[var(--drawing-accent)] mt-1">
                      {th.formula}
                    </p>
                    <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] mt-1 leading-snug">
                      {th.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* КОЭФ. ЗАПАСА */}
          <section>
            <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-2">
              Коэффициент запаса прочности n
            </p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1.0}
                max={5.0}
                step={0.1}
                value={settings.safety_factor}
                onChange={(e) => update({ safety_factor: parseFloat(e.target.value) })}
                className="flex-1"
              />
              <input
                type="number"
                min={1.0}
                max={10}
                step={0.1}
                value={settings.safety_factor}
                onChange={(e) => update({ safety_factor: parseFloat(e.target.value) || 1.5 })}
                className="w-20 border border-[var(--drawing-line)] bg-[var(--drawing-bg)] px-2 py-1 font-mono text-[12px]"
              />
            </div>
            <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] mt-1.5 leading-snug">
              [σ] = σ_т / n. Типовые значения: 1.2–1.5 для статической нагрузки на проверенных материалах,
              2–3 для пульсирующих нагрузок, 3–5 для ударных и неизвестных условий.
            </p>
          </section>

          {/* ВКЛ/ВЫКЛ ПРОВЕРОК */}
          <section>
            <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-2">
              Какие проверки выполнять
            </p>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.check_deflection}
                  onChange={(e) => update({ check_deflection: e.target.checked })}
                />
                <span className="font-gost text-[12px]">Проверка прогибов f ≤ [f]</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.check_strength}
                  onChange={(e) => update({ check_strength: e.target.checked })}
                />
                <span className="font-gost text-[12px]">Проверка прочности σ_экв ≤ [σ]</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.check_buckling !== false}
                  onChange={(e) => update({ check_buckling: e.target.checked })}
                />
                <span className="font-gost text-[12px]">
                  Проверка устойчивости σ ≤ φ·[σ] (сжатые стержни, Эйлер/Ясинский)
                </span>
              </label>
            </div>
            <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] mt-2 leading-snug">
              Устойчивость считается только для элементов со сжатием (N&nbsp;&lt;&nbsp;0).
              Коэффициент μ выбирается автоматически по закреплениям узлов и шарнирам стержня:
              μ&nbsp;=&nbsp;0.5 (защ.–защ.), 0.7 (защ.–шарн.), 1.0 (шарн.–шарн.), 2.0 (консоль).
              φ&nbsp;— по таблице СП&nbsp;16.13330 для стали Ст3.
            </p>
          </section>

          <div className="flex items-center justify-between pt-2 border-t border-dashed border-[var(--drawing-line)]">
            <button
              onClick={() => onChange({ ...DEFAULT_ANALYSIS_SETTINGS })}
              className="text-[11px] font-gost text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)]"
            >
              Сбросить к значениям по умолчанию
            </button>
            <button onClick={onClose} className="btn-drawing btn-drawing-accent text-[11px]">
              Готово
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorAnalysisSettingsDialog;