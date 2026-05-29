import { useState } from "react";
import Icon from "@/components/ui/icon";
import type { ModelLoad } from "@/lib/cae-model";

/**
 * Элемент списка нагрузок с режимом редактирования.
 *  - Просмотр: краткая подпись + кнопки «изменить» / «удалить».
 *  - Редактирование:
 *      · распределённая q  — одно поле q, Н/м
 *      · точечная сила     — позиция (0…1) и величина Py, Н
 *    Изменения применяются кнопкой «Сохранить» (или Enter).
 */
export default function LoadListItem({
  load,
  length,
  onUpdateDistributed,
  onUpdateInSpan,
  onRemove,
}: {
  load: ModelLoad;
  length: number;
  onUpdateDistributed: (qy: number) => void;
  onUpdateInSpan: (pos: number, py: number) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);

  const isDist = load.type === "distributed_uniform";
  const isPoint = load.type === "in_span_point";

  const q = load.load_local_per_length?.[1] ?? 0;
  const p = load.force?.[1] ?? 0;
  const pos = load.position_ratio ?? 0.5;

  // Локальные строки редактирования
  const [qText, setQText] = useState(String(q));
  const [posText, setPosText] = useState(String(pos));
  const [pText, setPText] = useState(String(p));

  const label = isDist
    ? `q = ${q.toFixed(0)} Н/м (равномерная)`
    : isPoint
      ? `P = ${p.toFixed(0)} Н в x = ${(pos * length).toFixed(2)} м (${(pos * 100).toFixed(0)}%)`
      : load.type;

  const parse = (s: string) => parseFloat(s.replace(/,/g, "."));

  const save = () => {
    if (isDist) {
      const v = parse(qText);
      if (Number.isFinite(v)) onUpdateDistributed(v);
    } else if (isPoint) {
      const vp = parse(pText);
      const vpos = parse(posText);
      if (Number.isFinite(vp) && Number.isFinite(vpos)) onUpdateInSpan(vpos, vp);
    }
    setEditing(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    } else if (e.key === "Escape") {
      setEditing(false);
    }
  };

  if (!editing) {
    return (
      <li className="flex items-center justify-between gap-2 text-[10px] font-mono bg-[var(--drawing-paper)] border border-[var(--drawing-line-thin)] px-2 py-1">
        <span className="truncate">{label}</span>
        <span className="flex items-center gap-1.5 shrink-0">
          {(isDist || isPoint) && (
            <button
              onClick={() => {
                setQText(String(q));
                setPosText(String(pos));
                setPText(String(p));
                setEditing(true);
              }}
              className="text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)]"
              title="Изменить нагрузку"
              aria-label="Изменить"
            >
              <Icon name="Pencil" size={11} />
            </button>
          )}
          <button
            onClick={onRemove}
            className="text-[var(--drawing-accent)] hover:underline"
            title="Удалить"
            aria-label="Удалить"
          >
            <Icon name="X" size={11} />
          </button>
        </span>
      </li>
    );
  }

  return (
    <li className="bg-[var(--drawing-paper)] border border-[var(--drawing-accent)] px-2 py-2 space-y-2">
      {isDist && (
        <label className="block text-[10px] font-gost">
          q, Н/м
          <input
            type="text"
            inputMode="decimal"
            value={qText}
            autoFocus
            onChange={(e) => setQText(e.target.value)}
            onKeyDown={onKey}
            className="drawing-input font-mono text-[11px] mt-0.5"
          />
        </label>
      )}
      {isPoint && (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[10px] font-gost">
            Позиция (0…1)
            <input
              type="text"
              inputMode="decimal"
              value={posText}
              autoFocus
              onChange={(e) => setPosText(e.target.value)}
              onKeyDown={onKey}
              className="drawing-input font-mono text-[11px] mt-0.5"
            />
          </label>
          <label className="text-[10px] font-gost">
            Py, Н
            <input
              type="text"
              inputMode="numeric"
              value={pText}
              onChange={(e) => setPText(e.target.value)}
              onKeyDown={onKey}
              className="drawing-input font-mono text-[11px] mt-0.5"
            />
          </label>
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          className="flex-1 border border-[var(--drawing-accent)] bg-[var(--drawing-accent)] text-white py-1.5 text-[10px] font-gost uppercase tracking-wider min-h-[36px] lg:min-h-0"
        >
          Сохранить
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="flex-1 border border-[var(--drawing-line)] py-1.5 text-[10px] font-gost uppercase tracking-wider hover:bg-[var(--drawing-bg)] min-h-[36px] lg:min-h-0"
        >
          Отмена
        </button>
      </div>
    </li>
  );
}
