import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";

const HIGHLIGHTS = [
  {
    icon: "Box",
    title: "2D и 3D рамы",
    text: "Плоские и пространственные расчётные схемы прямо в браузере.",
  },
  {
    icon: "Calculator",
    title: "КЭ-расчёт на сервере",
    text: "Балочный решатель с учётом сдвиговых деформаций. Эпюры N, Q, M, σ Мизес.",
  },
  {
    icon: "FileText",
    title: "Отчёт по ЕСКД",
    text: "PDF в стиле пояснительной записки, готовый для ВКР или экспертизы.",
  },
];

const CaeTeaserSection = () => {
  return (
    <section className="py-12 md:py-16 bg-[var(--drawing-paper)] border-t-[2.5px] border-b-[2.5px] border-[var(--drawing-line)]">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <p className="font-gost text-[10px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-2">
              Конструкторская часть · Раздел 06 · Скоро
            </p>
            <h2 className="font-gost-upright text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-wide text-[var(--drawing-line)] break-words">
              Облачный CAE для&nbsp;инженеров
            </h2>
            <p className="mt-3 text-sm md:text-base text-[var(--drawing-line-thin)] max-w-2xl leading-relaxed">
              Лёгкий конечно-элементный расчёт балочных рам прямо в браузере.
              Альтернатива APM&nbsp;WinMachine и&nbsp;ANSYS для&nbsp;ВКР и&nbsp;предварительных проверок —
              без установки, с&nbsp;каталогом ГОСТ-профилей и&nbsp;отчётом по&nbsp;ЕСКД.
            </p>
          </div>
          <Link
            to="/cae"
            className="font-gost text-xs uppercase tracking-[0.2em] text-[var(--drawing-accent)] hover:underline shrink-0 self-start md:self-end"
          >
            Открыть страницу&nbsp;&rarr;
          </Link>
        </div>

        <div className="extension-line-h w-full mb-8" />

        <div className="grid gap-5 md:grid-cols-3 mb-8">
          {HIGHLIGHTS.map((h, idx) => (
            <div
              key={h.title}
              className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)] p-5 relative"
            >
              <div className="flex items-center justify-between mb-3">
                <Icon name={h.icon} size={26} className="text-[var(--drawing-accent)]" />
                <span className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)]">
                  Поз. {String(idx + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="font-gost-upright text-base md:text-lg font-bold mb-2 leading-snug">
                {h.title}
              </h3>
              <p className="text-sm text-[var(--drawing-line-thin)] leading-relaxed">{h.text}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-[var(--drawing-line-thin)] pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1">
              Стадия проекта
            </p>
            <p className="text-sm text-[var(--drawing-line)]">
              Решатель уже работает в облаке. 3D-редактор и&nbsp;PDF-отчёт &mdash; на&nbsp;подходе.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/cae" className="btn-drawing btn-drawing-accent text-xs">
              Ранний доступ
            </Link>
            <Link to="/cae/projects" className="btn-drawing text-xs">
              Мои проекты&nbsp;&rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CaeTeaserSection;
