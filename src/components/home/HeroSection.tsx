import { Link } from "react-router-dom";

/**
 * Робот-манипулятор в минималистичном стиле — сплошной чёрный силуэт.
 * Композиция: основание на платформе → плечо (link 1) → локоть → предплечье (link 2)
 * → запястье → схват (gripper) с двумя пальцами. Никаких размерных линий и выносок.
 */
const RobotArmDrawing = () => {
  return (
    <svg
      viewBox="0 0 120 120"
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 w-full h-full"
      aria-hidden="true"
    >
      <g fill="var(--drawing-line)" stroke="var(--drawing-line)" strokeLinejoin="round" strokeLinecap="round">
        {/* Платформа-основание */}
        <rect x="14" y="100" width="56" height="8" rx="1.5" />
        {/* Тумба (станина) с трапециевидным сужением */}
        <path d="M 24 100 L 30 78 L 54 78 L 60 100 Z" />
        {/* Шарнир-плечо (J1) — крупный круг */}
        <circle cx="42" cy="78" r="9" fill="var(--drawing-paper)" strokeWidth="3.5" />
        <circle cx="42" cy="78" r="2.4" />

        {/* Звено 1 (плечо) — толстый прямоугольник от J1 к J2.
            J1 = (42, 78). J2 = (78, 38). Длина L1 ≈ 54, угол ~ -48° от оси X. */}
        <g transform="rotate(-48 42 78)">
          <rect x="42" y="71" width="56" height="14" rx="3" />
        </g>

        {/* Шарнир-локоть (J2) */}
        <circle cx="78" cy="38" r="7.5" fill="var(--drawing-paper)" strokeWidth="3" />
        <circle cx="78" cy="38" r="2" />

        {/* Звено 2 (предплечье) — от J2 (78, 38) к запястью J3 (104, 26).
            Длина ≈ 28.6, угол ~ -25°. */}
        <g transform="rotate(-25 78 38)">
          <rect x="78" y="33" width="30" height="10" rx="2.5" />
        </g>

        {/* Запястье (J3) */}
        <circle cx="104" cy="26" r="5" fill="var(--drawing-paper)" strokeWidth="2.4" />

        {/* Кисть — короткий шток до схвата */}
        <g transform="rotate(-25 104 26)">
          <rect x="104" y="23.5" width="9" height="5" />
        </g>

        {/* Схват (gripper) с двумя пальцами на конце предплечья.
            База схвата — на конце штока ~ (112, 22). */}
        <g transform="translate(112 22) rotate(-25)">
          {/* монтажная пластина схвата */}
          <rect x="-1" y="-6" width="4" height="12" rx="0.8" />
          {/* верхний палец */}
          <path d="M 3 -6 L 13 -7 L 13 -4 L 5 -3 Z" />
          {/* нижний палец */}
          <path d="M 3 6 L 13 7 L 13 4 L 5 3 Z" />
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