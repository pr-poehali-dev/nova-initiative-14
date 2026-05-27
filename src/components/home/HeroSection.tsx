import { Link } from "react-router-dom";

/**
 * Геометрия зубчатого колеса. Для зацепления соседних колёс расстояние
 * между центрами должно равняться сумме делительных радиусов (Rd1 + Rd2).
 * Параметры: Ra (наружный), Rd (делительный, штриховой), Rf (впадин), z (число зубьев).
 */
type Gear = {
  cx: number;
  cy: number;
  Ra: number;
  Rd: number;
  Rf: number;
  z: number;
  /** угол поворота в градусах, чтобы зубья соседних шестерён попадали во впадины */
  phase: number;
};

const gearToothPath = (g: Gear): string => {
  // Профиль строится упрощённо (трапециевидный зуб), но визуально читается
  // как зубчатое колесо в инженерной графике (упрощённый вид по ГОСТ 2.402).
  const step = 360 / g.z;
  const toothHalf = step * 0.22; // полуширина вершины зуба, градусы
  const flank = step * 0.32;     // полуширина основания зуба, градусы
  const toRad = (d: number) => ((d + g.phase) * Math.PI) / 180;
  const pt = (r: number, a: number) =>
    `${(g.cx + r * Math.cos(toRad(a))).toFixed(2)},${(g.cy + r * Math.sin(toRad(a))).toFixed(2)}`;

  let d = "";
  for (let i = 0; i < g.z; i++) {
    const a0 = i * step;            // центр впадины
    const aR1 = a0 + (step / 2) - flank;     // выход из впадины (низ зуба слева)
    const aR2 = a0 + (step / 2) - toothHalf; // вершина зуба слева
    const aR3 = a0 + (step / 2) + toothHalf; // вершина зуба справа
    const aR4 = a0 + (step / 2) + flank;     // основание зуба справа
    const aR5 = a0 + step;                   // центр следующей впадины
    if (i === 0) d += `M ${pt(g.Rf, a0)} `;
    d += `L ${pt(g.Rf, aR1)} `;
    d += `L ${pt(g.Ra, aR2)} `;
    d += `L ${pt(g.Ra, aR3)} `;
    d += `L ${pt(g.Rf, aR4)} `;
    d += `L ${pt(g.Rf, aR5)} `;
  }
  return d + "Z";
};

const GearTrainDrawing = () => {
  // Три колеса в зацеплении. Центры на одной горизонтали (y=34), расстояния
  // между центрами равны сумме делительных радиусов соседей.
  // G1: Rd=18 + G2: Rd=15 → центр G2 на X=30+33=63
  // G2: Rd=15 + G3: Rd=16 → центр G3 на X=63+31=94
  const G1: Gear = { cx: 30, cy: 34, Ra: 21, Rd: 18, Rf: 15, z: 14, phase: 0 };
  // Для попадания зубьев G2 во впадины G1: фаза = (step/2) от линии центров.
  // У G1 шаг 360/14=25.71°, у G2 шаг 360/12=30°. Линия центров горизонтальна.
  // Зуб G1 на 0° — нужна впадина G2 со стороны 180°.
  const G2: Gear = { cx: 63, cy: 34, Ra: 18, Rd: 15, Rf: 12, z: 12, phase: 15 };
  const G3: Gear = { cx: 94, cy: 34, Ra: 19, Rd: 16, Rf: 13, z: 13, phase: 0 };
  const gears = [G1, G2, G3];

  return (
    <svg
      viewBox="0 0 124 100"
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 w-full h-full"
      aria-hidden="true"
    >
      {/* центральные оси через каждое колесо (штрих-пунктир по ГОСТ 2.303) */}
      {gears.map((g, i) => (
        <g key={`axis-${i}`} stroke="var(--drawing-line-thin)" strokeWidth="0.25" strokeDasharray="3 1.2 0.4 1.2">
          <line x1={g.cx - g.Ra - 3} y1={g.cy} x2={g.cx + g.Ra + 3} y2={g.cy} />
          <line x1={g.cx} y1={g.cy - g.Ra - 3} x2={g.cx} y2={g.cy + g.Ra + 3} />
        </g>
      ))}

      {/* делительные окружности — штриховая тонкая (по ГОСТ — основной признак шестерни) */}
      {gears.map((g, i) => (
        <circle
          key={`pitch-${i}`}
          cx={g.cx}
          cy={g.cy}
          r={g.Rd}
          fill="none"
          stroke="var(--drawing-line-thin)"
          strokeWidth="0.3"
          strokeDasharray="2.2 1.1"
        />
      ))}

      {/* окружности впадин — тонкая сплошная */}
      {gears.map((g, i) => (
        <circle
          key={`root-${i}`}
          cx={g.cx}
          cy={g.cy}
          r={g.Rf}
          fill="none"
          stroke="var(--drawing-line-thin)"
          strokeWidth="0.25"
        />
      ))}

      {/* зубчатые венцы — основная толстая линия */}
      {gears.map((g, i) => (
        <path
          key={`teeth-${i}`}
          d={gearToothPath(g)}
          fill="var(--drawing-paper)"
          stroke="var(--drawing-line)"
          strokeWidth="0.55"
          strokeLinejoin="miter"
        />
      ))}

      {/* ступицы (валы) */}
      {gears.map((g, i) => (
        <g key={`hub-${i}`}>
          <circle
            cx={g.cx}
            cy={g.cy}
            r={g.Rf * 0.35}
            fill="var(--drawing-paper)"
            stroke="var(--drawing-line)"
            strokeWidth="0.4"
          />
          <circle
            cx={g.cx}
            cy={g.cy}
            r={g.Rf * 0.15}
            fill="var(--drawing-line)"
          />
        </g>
      ))}

      {/* размерная линия Ø180 — диаметр центрального колеса */}
      <g stroke="var(--drawing-line)" strokeWidth="0.3" fill="none">
        <line x1={G2.cx - G2.Ra} y1={G2.cy - G2.Ra - 7} x2={G2.cx + G2.Ra} y2={G2.cy - G2.Ra - 7} />
        <line x1={G2.cx - G2.Ra} y1={G2.cy - G2.Ra - 8.5} x2={G2.cx - G2.Ra} y2={G2.cy - G2.Ra - 5.5} />
        <line x1={G2.cx + G2.Ra} y1={G2.cy - G2.Ra - 8.5} x2={G2.cx + G2.Ra} y2={G2.cy - G2.Ra - 5.5} />
        {/* стрелки */}
        <polygon points={`${G2.cx - G2.Ra},${G2.cy - G2.Ra - 7} ${G2.cx - G2.Ra + 1.5},${G2.cy - G2.Ra - 6.4} ${G2.cx - G2.Ra + 1.5},${G2.cy - G2.Ra - 7.6}`} fill="var(--drawing-line)" />
        <polygon points={`${G2.cx + G2.Ra},${G2.cy - G2.Ra - 7} ${G2.cx + G2.Ra - 1.5},${G2.cy - G2.Ra - 6.4} ${G2.cx + G2.Ra - 1.5},${G2.cy - G2.Ra - 7.6}`} fill="var(--drawing-line)" />
      </g>
      <text
        x={G2.cx}
        y={G2.cy - G2.Ra - 8.5}
        textAnchor="middle"
        fontFamily="var(--font-gost, monospace)"
        fontSize="2.6"
        fill="var(--drawing-line)"
      >
        ⌀180
      </text>

      {/* поясняющие позиции деталей (выноски как в спецификации) */}
      <g fontFamily="var(--font-gost, monospace)" fontSize="2.4" fill="var(--drawing-line-thin)">
        <circle cx={G1.cx - G1.Ra - 4} cy={G1.cy - G1.Ra - 4} r="2.2" fill="var(--drawing-paper)" stroke="var(--drawing-line)" strokeWidth="0.3" />
        <text x={G1.cx - G1.Ra - 4} y={G1.cy - G1.Ra - 3.2} textAnchor="middle" fill="var(--drawing-line)">1</text>
        <line x1={G1.cx - G1.Ra - 2.3} y1={G1.cy - G1.Ra - 2.8} x2={G1.cx - G1.Ra * 0.6} y2={G1.cy - G1.Ra * 0.6} stroke="var(--drawing-line-thin)" strokeWidth="0.25" />

        <circle cx={G2.cx} cy={G2.cy + G2.Ra + 5} r="2.2" fill="var(--drawing-paper)" stroke="var(--drawing-line)" strokeWidth="0.3" />
        <text x={G2.cx} y={G2.cy + G2.Ra + 5.8} textAnchor="middle" fill="var(--drawing-line)">2</text>
        <line x1={G2.cx} y1={G2.cy + G2.Ra + 2.8} x2={G2.cx} y2={G2.cy + G2.Ra * 0.5} stroke="var(--drawing-line-thin)" strokeWidth="0.25" />

        <circle cx={G3.cx + G3.Ra + 4} cy={G3.cy - G3.Ra - 4} r="2.2" fill="var(--drawing-paper)" stroke="var(--drawing-line)" strokeWidth="0.3" />
        <text x={G3.cx + G3.Ra + 4} y={G3.cy - G3.Ra - 3.2} textAnchor="middle" fill="var(--drawing-line)">3</text>
        <line x1={G3.cx + G3.Ra + 2.3} y1={G3.cy - G3.Ra - 2.8} x2={G3.cx + G3.Ra * 0.6} y2={G3.cy - G3.Ra * 0.6} stroke="var(--drawing-line-thin)" strokeWidth="0.25" />
      </g>

      {/* модуль зацепления — справочная подпись */}
      <text
        x={G2.cx}
        y={G2.cy + 1}
        textAnchor="middle"
        fontFamily="var(--font-gost, monospace)"
        fontSize="2"
        fill="var(--drawing-line-thin)"
        opacity="0.7"
      >
        m=2.5
      </text>
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
              <GearTrainDrawing />

              <div className="absolute top-3 right-3 roughness-symbol text-[var(--drawing-line-thin)] z-20">
                Ra 3.2
              </div>

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