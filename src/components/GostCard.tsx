/**
 * Боковая панель-карточка ГОСТа.
 *
 * Выезжает справа при клике на стандарт в каталоге. Показывает описание,
 * область применения, статус/год, подводные камни применения, связанные ГОСТы
 * (кликабельны — переключают карточку) и ссылку на официальный полный текст.
 */
import { useEffect } from "react";
import Icon from "@/components/ui/icon";
import {
  type GostItem,
  officialUrl,
  statusLabel,
} from "@/data/gostCatalog";

interface GostCardProps {
  item: GostItem | null;
  /** Поиск связанного ГОСТа по обозначению для перехода между карточками */
  resolve: (code: string) => GostItem | undefined;
  onSelect: (item: GostItem) => void;
  onClose: () => void;
}

const STATUS_STYLE: Record<string, string> = {
  active: "text-green-600 border-green-600/50",
  replaced: "text-amber-600 border-amber-600/50",
  restricted: "text-amber-600 border-amber-600/50",
};

const GostCard = ({ item, resolve, onSelect, onClose }: GostCardProps) => {
  // Закрытие по Esc.
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  const open = !!item;
  const status = item?.status ?? "active";

  return (
    <>
      {/* Затемнение фона */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden
      />

      {/* Панель */}
      <aside
        className={`fixed top-0 right-0 z-[70] h-full w-full max-w-[440px] bg-[var(--drawing-bg)] border-l-[2.5px] border-[var(--drawing-line)] shadow-2xl transition-transform duration-300 overflow-y-auto ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label={item ? `Стандарт ${item.code}` : undefined}
      >
        {item && (
          <div className="p-5 md:p-7">
            {/* Шапка */}
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)]">
                Нормативный документ
              </div>
              <button
                onClick={onClose}
                className="shrink-0 text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)]"
                aria-label="Закрыть"
              >
                <Icon name="X" size={20} />
              </button>
            </div>

            <h2 className="font-gost-upright text-2xl font-bold tracking-tight text-[var(--drawing-accent)] mb-1">
              {item.code}
            </h2>
            <p className="font-gost text-sm text-[var(--drawing-line)] leading-snug mb-4">
              {item.title}
            </p>

            {/* Статус и год */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <span
                className={`font-gost text-[10px] uppercase tracking-wider border px-2 py-0.5 inline-flex items-center gap-1 ${
                  STATUS_STYLE[status] ?? STATUS_STYLE.active
                }`}
              >
                <Icon
                  name={status === "active" ? "CircleCheck" : "CircleAlert"}
                  size={12}
                />
                {statusLabel(status)}
              </span>
              {item.year && (
                <span className="font-gost text-[10px] uppercase tracking-wider border border-[var(--drawing-line-thin)] px-2 py-0.5 text-[var(--drawing-line-thin)]">
                  Ред. {item.year}
                </span>
              )}
            </div>

            <div className="extension-line-h w-full mb-5" />

            {/* Описание */}
            {item.desc && (
              <section className="mb-5">
                <h3 className="section-callout font-gost-upright text-sm font-bold uppercase tracking-wide mb-2">
                  Описание
                </h3>
                <p className="font-gost text-[13px] text-[var(--drawing-line-thin)] leading-relaxed">
                  {item.desc}
                </p>
              </section>
            )}

            {/* Область применения */}
            {item.scope && (
              <section className="mb-5">
                <h3 className="section-callout font-gost-upright text-sm font-bold uppercase tracking-wide mb-2">
                  Область применения
                </h3>
                <p className="font-gost text-[13px] text-[var(--drawing-line-thin)] leading-relaxed">
                  {item.scope}
                </p>
              </section>
            )}

            {/* Подводные камни */}
            {item.pitfalls && item.pitfalls.length > 0 && (
              <section className="mb-5 border-[1.5px] border-amber-600/40 bg-amber-500/5 p-3">
                <h3 className="font-gost-upright text-sm font-bold uppercase tracking-wide mb-2 inline-flex items-center gap-1.5 text-amber-700">
                  <Icon name="TriangleAlert" size={14} />
                  Подводные камни
                </h3>
                <ul className="space-y-1.5">
                  {item.pitfalls.map((p, i) => (
                    <li
                      key={i}
                      className="font-gost text-[12px] text-[var(--drawing-line-thin)] leading-relaxed flex gap-2"
                    >
                      <span className="text-amber-600 shrink-0">—</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Связанные ГОСТы */}
            {item.related && item.related.length > 0 && (
              <section className="mb-5">
                <h3 className="section-callout font-gost-upright text-sm font-bold uppercase tracking-wide mb-2">
                  Связанные стандарты
                </h3>
                <div className="flex flex-wrap gap-2">
                  {item.related.map((code) => {
                    const rel = resolve(code);
                    if (rel) {
                      return (
                        <button
                          key={code}
                          onClick={() => onSelect(rel)}
                          className="font-gost-upright text-[11px] font-bold border border-[var(--drawing-line)] px-2 py-1 text-[var(--drawing-line)] hover:bg-[var(--drawing-accent)] hover:text-white hover:border-[var(--drawing-accent)] transition-colors"
                        >
                          {code}
                        </button>
                      );
                    }
                    return (
                      <span
                        key={code}
                        className="font-gost-upright text-[11px] font-bold border border-[var(--drawing-line-thin)] px-2 py-1 text-[var(--drawing-line-thin)]"
                      >
                        {code}
                      </span>
                    );
                  })}
                </div>
              </section>
            )}

            <div className="extension-line-h w-full mb-5" />

            {/* Ссылка на полный текст */}
            <a
              href={officialUrl(item.code)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-drawing btn-drawing-accent text-sm w-full inline-flex items-center justify-center gap-2"
            >
              <Icon name="ExternalLink" size={15} />
              Открыть полный текст
            </a>
            <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] mt-2 text-center">
              Официальный поиск стандарта на protect.gost.ru
            </p>
          </div>
        )}
      </aside>
    </>
  );
};

export default GostCard;
