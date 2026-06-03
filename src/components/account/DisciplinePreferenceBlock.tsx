/**
 * Блок «Инженерная школа» в личном кабинете (тикет №37).
 *
 * Взаимосвязанный переключатель между машиностроением и строительным
 * проектированием. Значение — глобальная пользовательская настройка
 * (localStorage), которая становится школой по умолчанию для новых проектов
 * CAE. Тот же переключатель есть в настройках расчёта конкретного проекта.
 */
import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import type { DisciplineKind } from "@/lib/cae-model";
import {
  getDisciplinePreference,
  setDisciplinePreference,
  onDisciplineChange,
} from "@/lib/cae/discipline-preference";

const OPTIONS: { key: DisciplineKind; label: string; hint: string; icon: string }[] = [
  {
    key: "mechanical",
    label: "Машиностроение",
    hint: "Эпюра момента — по знаку величины (сопромат, детали машин).",
    icon: "Cog",
  },
  {
    key: "construction",
    label: "Строительство",
    hint: "Эпюра момента — со стороны растянутого волокна (СП/СНиП).",
    icon: "Building2",
  },
];

export default function DisciplinePreferenceBlock() {
  const [value, setValue] = useState<DisciplineKind>(getDisciplinePreference);

  // Синхронизируем, если школу сменили в другой вкладке или в редакторе.
  useEffect(() => onDisciplineChange(setValue), []);

  const choose = (v: DisciplineKind) => {
    setValue(v);
    setDisciplinePreference(v);
  };

  return (
    <section className="drawing-frame p-6 bg-[var(--drawing-bg)] mb-6">
      <div className="flex items-center gap-2 mb-1">
        <Icon name="Compass" size={18} />
        <h2 className="font-gost-upright text-sm uppercase tracking-widest">
          Инженерная школа
        </h2>
      </div>
      <p className="font-gost text-xs text-[var(--drawing-line-thin)] mb-4 leading-snug">
        Определяет соглашение построения эпюры момента и&nbsp;применяется как&nbsp;школа
        по&nbsp;умолчанию для новых проектов CAE.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {OPTIONS.map((o) => {
          const selected = value === o.key;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => choose(o.key)}
              className={`text-left border p-3 transition ${
                selected
                  ? "border-[var(--drawing-accent)] bg-[var(--drawing-accent)]/5"
                  : "border-[var(--drawing-line)] hover:bg-[var(--drawing-line)]/5"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon
                  name={o.icon}
                  size={16}
                  className={selected ? "text-[var(--drawing-accent)]" : ""}
                />
                <span className="font-gost-upright text-sm font-bold">{o.label}</span>
                {selected && (
                  <Icon
                    name="Check"
                    size={14}
                    className="text-[var(--drawing-accent)] ml-auto"
                  />
                )}
              </div>
              <p className="font-gost text-[11px] text-[var(--drawing-line-thin)] leading-snug">
                {o.hint}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
