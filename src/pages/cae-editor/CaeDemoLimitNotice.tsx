/**
 * Уведомление об исчерпании лимита демо-расчётов.
 *
 * Вынесено из CaeDemoEditor.tsx без изменения разметки и логики — рендерится
 * как topSlot в общей раскладке редактора (сразу под верхней панелью), только
 * когда лимит исчерпан (solveBlocked).
 */
import { Link } from "react-router-dom";

interface Props {
  solveLimit: number;
}

const CaeDemoLimitNotice = ({ solveLimit }: Props) => (
  <div className="bg-amber-50 border-b-2 border-amber-700/40">
    <div className="max-w-[1400px] mx-auto px-3 py-2 flex flex-wrap items-center gap-3 text-xs">
      <span className="text-amber-900">
        Лимит демо исчерпан: <strong>{solveLimit} расчётов</strong> использовано.
      </span>
      <Link
        to="/register"
        className="btn-drawing text-[10px] border-amber-700/60 hover:border-amber-700 inline-flex"
      >
        Зарегистрироваться — расчёты без лимита&nbsp;&rarr;
      </Link>
    </div>
  </div>
);

export default CaeDemoLimitNotice;
