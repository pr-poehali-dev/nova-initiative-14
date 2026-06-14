/**
 * Баннер демо-режима CAE со счётчиком пробных расчётов.
 *
 * Вынесен из CaeDemoEditor.tsx без изменения разметки и логики — рендерится
 * как bannerSlot в общей раскладке редактора. Значения и колбэки приходят
 * через пропсы (вся логика остаётся в CaeDemoEditor.tsx).
 */
import { Link } from "react-router-dom";

interface Props {
  solveBlocked: boolean;
  solveCount: number;
  solveLimit: number;
  onReset: () => void;
}

const CaeDemoBanner = ({ solveBlocked, solveCount, solveLimit, onReset }: Props) => (
  <div className="bg-[var(--drawing-accent)] text-white">
    <div className="max-w-[1400px] mx-auto px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-gost uppercase tracking-wider">
        <span className="font-bold">Демо без регистрации</span>
        <span className={`inline-flex items-center gap-1 ${solveBlocked ? "bg-red-700" : "bg-white/15"} px-2 py-0.5`}>
          Пробных расчётов: <span className="font-bold">{solveCount}/{solveLimit}</span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onReset}
          className="font-gost uppercase tracking-wider underline underline-offset-2 hover:no-underline"
        >
          Сбросить
        </button>
        <Link
          to="/register"
          className="font-gost-upright font-bold uppercase tracking-wider bg-white text-[var(--drawing-accent)] px-3 py-1 hover:bg-white/90"
        >
          Регистрация · безлимит
        </Link>
      </div>
    </div>
  </div>
);

export default CaeDemoBanner;
