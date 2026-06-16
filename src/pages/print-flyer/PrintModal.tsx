/**
 * Модалка фиксации заказа печати: количество + общая стоимость.
 * Вынесена из PrintFlyer.tsx без изменения логики (1:1).
 */
import { useState } from "react";
import { Field } from "./PrintFlyerControls";

export default function PrintModal({
  campaignName,
  alreadyPrinted,
  onClose,
  onConfirm,
}: {
  campaignName: string;
  alreadyPrinted: number;
  onClose: () => void;
  onConfirm: (quantity: number, totalRub: number) => void;
}) {
  const [qty, setQty] = useState("");
  const [total, setTotal] = useState("");
  const q = Number(qty) || 0;
  const t = Number(total) || 0;
  const perUnit = q > 0 ? (t / q).toFixed(2) : "—";
  const valid = q > 0 && t >= 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--drawing-bg)] border-2 border-[var(--drawing-line)] max-w-[420px] w-full p-5" onClick={(e) => e.stopPropagation()}>
        <p className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] mb-1">Заказ печати</p>
        <h2 className="font-gost-upright text-xl font-bold text-[var(--drawing-line)] mb-1">{campaignName}</h2>
        {alreadyPrinted > 0 && (
          <p className="font-gost text-[11px] text-[var(--drawing-line-thin)] mb-3">
            Уже напечатано: {alreadyPrinted.toLocaleString("ru-RU")} шт. Новый тираж добавится к сумме.
          </p>
        )}
        <p className="font-gost text-[11px] text-[var(--drawing-line-thin)] mb-4">
          После заказа кампания блокируется от редактирования. Повторный заказ можно сделать снова.
        </p>

        <Field label="Количество листовок">
          <input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="например 1000" className="drawing-input w-full" />
        </Field>
        <div className="h-3" />
        <Field label="Общая стоимость, ₽">
          <input type="number" min={0} value={total} onChange={(e) => setTotal(e.target.value)} placeholder="например 4500" className="drawing-input w-full" />
        </Field>
        <p className="font-gost text-[11px] text-[var(--drawing-line-thin)] mt-2">
          Цена за листовку: <span className="text-[var(--drawing-line)] font-bold">{perUnit} ₽</span>
        </p>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="btn-drawing text-xs flex-1">Отмена</button>
          <button
            onClick={() => valid && onConfirm(q, t)}
            disabled={!valid}
            className={`btn-drawing btn-drawing-accent text-xs flex-1 ${!valid ? "opacity-50 pointer-events-none" : ""}`}
          >
            Подтвердить заказ
          </button>
        </div>
      </div>
    </div>
  );
}
