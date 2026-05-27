import { Link } from "react-router-dom";

/**
 * Робот-манипулятор в минималистичном контурном стиле (line-icon).
 * Все элементы — только обводка одной толщины, без заливки.
 * Композиция: плита основания → трапециевидная станина → большой плечевой шарнир (J1)
 * → плечо (link 1) ↗ → локоть (J2) → предплечье (link 2) ↗ → запястье (J3) → угловой схват.
 */
const RobotArmDrawing = () => {
  const STROKE = 5.5;
  return (
    <svg
      viewBox="0 0 120 140"
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 w-full h-full"
      aria-hidden="true"
    >
      <g
        fill="none"
        stroke="var(--drawing-line)"
        strokeWidth={STROKE}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {/* Плита основания */}
        <rect x="18" y="124" width="68" height="10" rx="1.5" />

        {/* Трапециевидная станина */}
        <path d="M 28 124 L 38 92 L 66 92 L 76 124 Z" />

        {/* Плечевой шарнир J1 — большая двойная окружность */}
        <circle cx="52" cy="86" r="16" />
        <circle cx="52" cy="86" r="6" />
        <circle cx="52" cy="86" r="1.6" fill="var(--drawing-line)" stroke="none" />

        {/* Звено 1 (плечо) — контурный прямоугольник от J1 (52,86) к J2 (88,40).
            Длина ≈ 58, угол ≈ -52°. Поворачиваем прямоугольник вокруг центра J1. */}
        <g transform="rotate(-52 52 86)">
          <rect x="52" y="76" width="58" height="20" rx="2" />
        </g>

        {/* Локтевой шарнир J2 — двойная окружность поменьше */}
        <circle cx="88" cy="40" r="10" />
        <circle cx="88" cy="40" r="3.5" />

        {/* Звено 2 (предплечье) — короче и тоньше, от J2 (88,40) к запястью (110,22).
            Длина ≈ 28, угол ≈ -39°. */}
        <g transform="rotate(-39 88 40)">
          <rect x="88" y="33" width="30" height="14" rx="2" />
        </g>

        {/* Запястье + угловой схват из двух «галочек», как на референсе.
            База схвата на конце предплечья ≈ (115, 18). Локально оси: x — вдоль предплечья,
            y — поперёк. Поворачиваем всё на угол предплечья (-39°). */}
        <g transform="translate(115 18) rotate(-39)">
          {/* монтажный фланец */}
          <rect x="-4" y="-9" width="8" height="18" rx="1" />
          {/* верхний палец-«галочка» */}
          <path d="M 4 -8 L 14 -14 L 22 -10 L 16 -4" />
          {/* нижний палец-«галочка» */}
          <path d="M 4 8 L 14 14 L 22 10 L 16 4" />
        </g>
      </g>
    </svg>
  );
};

const HeroSection = () => {
  return (
    <section className="pt-28 pb-16 px-4 md:px-8 max-w-[1200px] mx-auto">
      <div className="drawing-frame p-6 md:p-10 relative">
        <div className="zone-marker top-2 left-3">A1</div>
        <div className="zone-marker top-2 right-3">Зона I</div>
        <div className="zone-marker bottom-2 left-3">A2</div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10">
          <div className="md:col-span-7">
            <div className="font-gost text-[10px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-3">
              Наставничество по ВКР&nbsp;&middot; Раздел 01
            </div>
            <div className="extension-line-h w-full mb-6" />

            <h1 className="font-gost-upright text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.95] mb-6 text-[var(--drawing-line)] break-words">
              Доведём ваш
              <br />
              диплом до
              <br />
              <span className="text-[var(--drawing-accent)]">осознанной</span>
              <br />
              защиты
            </h1>

            <div className="extension-line-h w-3/4 my-5" />

            <p className="font-gost text-sm md:text-base max-w-lg text-[var(--drawing-line-thin)] leading-relaxed mb-8">
              Практикующие инженеры&#8209;конструкторы Екатеринбурга помогут разобраться в&nbsp;материале, закрыть замечания научрука и&nbsp;подготовиться к&nbsp;комиссии. Вы&nbsp;&mdash;&nbsp;автор. Мы&nbsp;&mdash;&nbsp;наставники.
            </p>

            <div className="flex flex-wrap gap-4 mb-4">
              <Link to="/contacts" className="btn-drawing btn-drawing-accent text-xs">
                Записаться на диагностику ВКР
              </Link>
              <Link to="/program" className="btn-drawing text-xs">
                Посмотреть программу&nbsp;&rarr;
              </Link>
            </div>
            <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] opacity-70 max-w-md">
              Без обязательств. Разберём ваш план или черновик и&nbsp;подскажем следующие шаги.
            </p>
          </div>

          <div className="md:col-span-5 flex items-center justify-center">
            <div className="relative w-full aspect-square border-[2px] border-[var(--drawing-line)] hatching-blue flex items-end p-6 overflow-hidden">
              <RobotArmDrawing />

              <div className="relative z-20 w-full">
                <div className="inline-block bg-[var(--drawing-paper)]/85 backdrop-blur-[1px] px-3 py-2 border-l-2 border-[var(--drawing-accent)]">
                  <p className="font-gost text-[10px] uppercase tracking-[0.15em] text-[var(--drawing-line-thin)] mb-1">
                    Екатеринбург&nbsp;&middot; Машиностроение и&nbsp;механика
                  </p>
                  <p className="font-gost-upright text-2xl md:text-3xl font-bold tracking-tight leading-tight text-[var(--drawing-line)]">
                    Инженеры
                    <br />
                    обучают
                    <br />
                    инженеров
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <table className="stamp-table">
            <tbody>
              <tr>
                <td className="thick-border" rowSpan={3}>Диплом-Инж.рф</td>
                <td>Лит.</td>
                <td>Масса</td>
                <td>Масштаб</td>
              </tr>
              <tr>
                <td>У</td>
                <td>&mdash;</td>
                <td>1:1</td>
              </tr>
              <tr>
                <td colSpan={3} className="text-[9px]">Наставничество по дипломному проекту</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;