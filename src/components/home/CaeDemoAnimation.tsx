/**
 * Лёгкое анимированное демо CAE: балка на двух опорах под распределённой
 * нагрузкой, её прогиб и эпюра изгибающего момента.
 * Чистый SVG + CSS-анимации (без решателя) — показывает продукт «в движении».
 * Бесконечный цикл 6 с: схема → нагрузка → деформация → эпюра → результат.
 */
export default function CaeDemoAnimation() {
  // Стрелки распределённой нагрузки
  const arrows = Array.from({ length: 9 }, (_, i) => 60 + i * 40);

  return (
    <div className="relative w-full border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)] overflow-hidden">
      {/* Заголовок-«вкладка» как в редакторе */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--drawing-line)] bg-[var(--drawing-paper)]">
        <span className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)]">
          Балка · двутавр 20Б1
        </span>
        <span className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--drawing-accent)] animate-pulse" />
          Расчёт
        </span>
      </div>

      <svg
        viewBox="0 0 460 300"
        className="w-full h-auto block"
        role="img"
        aria-label="Анимация расчёта балки под распределённой нагрузкой"
      >
        {/* Сетка */}
        <defs>
          <pattern id="caeGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path
              d="M20 0H0V20"
              fill="none"
              stroke="var(--drawing-line-thin)"
              strokeWidth="0.4"
              opacity="0.25"
            />
          </pattern>
        </defs>
        <rect width="460" height="300" fill="url(#caeGrid)" />

        {/* Распределённая нагрузка q (стрелки) */}
        <g
          className="cae-demo-loop"
          style={{ animationName: "caeLoadArrows" }}
        >
          <line x1="60" y1="70" x2="420" y2="70" stroke="var(--drawing-accent)" strokeWidth="1.5" />
          {arrows.map((x) => (
            <line
              key={x}
              x1={x}
              y1="70"
              x2={x}
              y2="108"
              stroke="var(--drawing-accent)"
              strokeWidth="1.5"
              markerEnd="url(#caeArrow)"
            />
          ))}
          <text
            x="240"
            y="60"
            textAnchor="middle"
            fill="var(--drawing-accent)"
            fontFamily="'Roboto Mono', monospace"
            fontSize="12"
            fontStyle="italic"
          >
            q = 12 кН/м
          </text>
          <defs>
            <marker id="caeArrow" markerWidth="6" markerHeight="6" refX="3" refY="5" orient="auto">
              <path d="M0 0 L3 5 L6 0 Z" fill="var(--drawing-accent)" />
            </marker>
          </defs>
        </g>

        {/* Исходная балка */}
        <line x1="60" y1="120" x2="420" y2="120" stroke="var(--drawing-line)" strokeWidth="3" />

        {/* Прогиб балки (проявляется) */}
        <path
          className="cae-demo-loop"
          style={{ animationName: "caeDeflect" }}
          d="M60 120 Q240 165 420 120"
          fill="none"
          stroke="var(--drawing-line)"
          strokeWidth="2"
          strokeDasharray="5 4"
          opacity="0"
        />

        {/* Опоры (шарнирные треугольники) */}
        <g fill="none" stroke="var(--drawing-line)" strokeWidth="2">
          <path d="M60 120 L48 142 L72 142 Z" />
          <line x1="44" y1="148" x2="76" y2="148" />
          <path d="M420 120 L408 142 L432 142 Z" />
          <line x1="404" y1="148" x2="436" y2="148" />
          <circle cx="420" cy="142" r="3" fill="var(--drawing-bg)" />
        </g>

        {/* Эпюра изгибающего момента M (рисуется) */}
        <text
          className="cae-demo-loop"
          style={{ animationName: "caeDiagram" }}
          x="68"
          y="205"
          fill="var(--drawing-blue)"
          fontFamily="'Roboto Mono', monospace"
          fontSize="11"
          fontStyle="italic"
          opacity="0"
        >
          Эпюра M, кН·м
        </text>
        <path
          className="cae-demo-loop"
          style={{ animationName: "caeDiagram" }}
          d="M60 215 Q240 290 420 215"
          fill="none"
          stroke="var(--drawing-blue)"
          strokeWidth="2"
          strokeDasharray="480"
          opacity="0"
        />
        <line x1="60" y1="215" x2="420" y2="215" stroke="var(--drawing-line-thin)" strokeWidth="1" />
      </svg>

      {/* Бейдж результата */}
      <div
        className="cae-demo-loop absolute bottom-3 right-3 border border-[var(--drawing-blue)] bg-[var(--drawing-bg)] px-3 py-1.5"
        style={{ animationName: "caeResultBadge", opacity: 0 }}
      >
        <p className="font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)] leading-none mb-1">
          σ max
        </p>
        <p className="font-gost-upright text-sm font-bold text-[var(--drawing-blue)] leading-none">
          184 МПа
        </p>
      </div>
    </div>
  );
}
