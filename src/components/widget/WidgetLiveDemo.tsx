/**
 * Живое демо виджета «как на сайте клиента».
 *
 * Рисует мокап браузера с сайтом условного завода металлоконструкций, а в
 * правую колонку встраивает НАСТОЯЩИЙ работающий iframe калькулятора балки
 * (тот же, что получают партнёры). Посетитель лендинга сразу видит и трогает
 * виджет в «боевом» окружении — это и есть главный продающий аргумент.
 */
import Icon from "@/components/ui/icon";
import { SITE_URL } from "@/lib/seo";

const DEMO_KEY = "demo_pk_8f3a9c2e1b7d4056";

export default function WidgetLiveDemo() {
  return (
    <div className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-paper)] overflow-hidden rounded-md shadow-lg">
      {/* Шапка браузера */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[var(--drawing-line)]/10 border-b-2 border-[var(--drawing-line)]">
        <span className="w-3 h-3 rounded-full bg-red-400" />
        <span className="w-3 h-3 rounded-full bg-yellow-400" />
        <span className="w-3 h-3 rounded-full bg-green-400" />
        <div className="flex-1 ml-2">
          <div className="bg-[var(--drawing-bg)] border border-[var(--drawing-line)] rounded px-3 py-1 font-mono text-[11px] text-[var(--drawing-line-thin)] inline-flex items-center gap-1">
            <Icon name="Lock" size={10} /> zavod-metallokonstrukcii.ru
          </div>
        </div>
      </div>

      {/* Контент «сайта клиента» */}
      <div className="grid md:grid-cols-2 gap-0">
        {/* Левая колонка — контент завода */}
        <div className="p-5 bg-[var(--drawing-bg)] border-b-2 md:border-b-0 md:border-r-2 border-[var(--drawing-line)]">
          <div className="font-gost text-[10px] uppercase tracking-[0.25em] text-[var(--drawing-accent)] mb-2">
            Завод металлоконструкций
          </div>
          <h3 className="font-gost-upright text-xl font-black uppercase leading-tight mb-3">
            Балки, фермы, каркасы<br />на заказ
          </h3>
          <p className="font-gost text-sm text-[var(--drawing-line-thin)] leading-snug mb-4">
            Изготовим металлоконструкции по чертежам и ГОСТ. Собственное
            производство, доставка по России. Рассчитайте балку прямо сейчас —
            и мы пришлём коммерческое предложение.
          </p>
          <ul className="space-y-1.5 mb-4">
            {["Двутавры, швеллеры, профильная труба", "Расчёт и проектирование", "Сварка по ГОСТ, контроль качества"].map(
              (li) => (
                <li key={li} className="flex items-start gap-2 font-gost text-xs">
                  <Icon name="Check" size={14} className="text-green-600 shrink-0 mt-0.5" />
                  {li}
                </li>
              ),
            )}
          </ul>
          <div className="inline-flex items-center gap-2 font-gost text-xs text-[var(--drawing-line-thin)] border border-dashed border-[var(--drawing-line-thin)] px-2 py-1">
            <Icon name="ArrowRight" size={13} className="text-[var(--drawing-accent)]" />
            Это калькулятор от Диплом-Инж.рф →
          </div>
        </div>

        {/* Правая колонка — настоящий iframe виджета */}
        <div className="bg-[var(--drawing-paper)]">
          <iframe
            src={`${SITE_URL}/widget/beam?key=${DEMO_KEY}`}
            title="Живое демо калькулятора балки"
            className="w-full"
            style={{ height: 640, border: "none", display: "block" }}
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}
