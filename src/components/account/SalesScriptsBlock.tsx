/**
 * Блок-вход «Скрипты продаж» в личном кабинете.
 * Виден ролям: менеджер по продажам (sales), администратор, владелец.
 * Открывает страницу /sales/scripts со скриптами по направлениям продаж.
 */
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { SALES_SCRIPTS } from "@/lib/sales-scripts";

export default function SalesScriptsBlock() {
  return (
    <section className="drawing-frame p-6 bg-[var(--drawing-bg)] mb-6">
      <div className="flex items-center gap-2 mb-1">
        <Icon name="MessagesSquare" size={18} className="text-[var(--drawing-accent)]" />
        <h2 className="font-gost-upright text-sm uppercase tracking-widest">Скрипты продаж</h2>
        <span className="inline-flex items-center gap-1 bg-[var(--drawing-line)] text-[var(--drawing-bg)] px-1.5 py-0.5 font-gost text-[9px] uppercase tracking-wider ml-1">
          <Icon name="Lock" size={9} /> Отдел продаж
        </span>
      </div>
      <p className="font-gost text-xs text-[var(--drawing-line-thin)] mb-4 leading-snug">
        Готовые речевые модули для презентации компании и продажи по&nbsp;трём
        направлениям&nbsp;— с&nbsp;отработкой возражений и&nbsp;чек-листами.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {SALES_SCRIPTS.map((s) => (
          <span
            key={s.slug}
            className="inline-flex items-center gap-1.5 font-gost text-[11px] border-[1.5px] border-[var(--drawing-line)] px-2 py-1"
          >
            <Icon name={s.icon} size={13} fallback="MessageSquare" className="text-[var(--drawing-accent)]" />
            {s.title}
          </span>
        ))}
      </div>

      <Link to="/sales/scripts" className="btn-drawing btn-drawing-accent text-xs inline-flex items-center">
        <Icon name="ArrowRight" size={13} className="mr-1.5" />
        Открыть скрипты
      </Link>
    </section>
  );
}
