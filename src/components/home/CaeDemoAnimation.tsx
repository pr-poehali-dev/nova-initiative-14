/**
 * Лёгкое анимированное демо CAE: балка на двух опорах под распределённой
 * нагрузкой, реакции опор, прогиб и эпюра изгибающего момента.
 * Стиль повторяет реальный редактор Диплом-Инж.CAE (узлы, опоры по ГОСТ,
 * реакции R, эпюра-заливка с точкой максимума).
 * Чистый SVG + CSS-анимации (без решателя). Бесконечный цикл 6 с.
 * Все значения — по системе СИ (кН, кН·м).
 */
export default function CaeDemoAnimation() {
  const NL = 92;
  const NR = 388;
  const BY = 150; // уровень балки
  // Стрелки распределённой нагрузки — внутри пролёта
  const arrows = Array.from({ length: 7 }, (_, i) => NL + 24 + i * ((NR - NL - 48) / 6));

  const blue = "var(--drawing-blue)";
  const accent = "var(--drawing-accent)";
  const green = "#1a8a5a";

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
        viewBox="0 0 480 320"
        className="w-full h-auto block"
        role="img"
        aria-label="Расчётная схема балки: распределённая нагрузка, реакции опор и эпюра момента"
      >
        <defs>
          <pattern id="caeGrid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M24 0H0V24" fill="none" stroke="var(--drawing-line-thin)" strokeWidth="0.4" opacity="0.22" />
          </pattern>
          <marker id="caeDown" markerWidth="7" markerHeight="7" refX="3.5" refY="6" orient="auto">
            <path d="M0 0 L3.5 6 L7 0 Z" fill={accent} />
          </marker>
          <marker id="caeUp" markerWidth="9" markerHeight="9" refX="4.5" refY="0" orient="auto">
            <path d="M0 9 L4.5 0 L9 9 Z" fill={green} />
          </marker>
        </defs>
        <rect width="480" height="320" fill="url(#caeGrid)" />

        {/* Реакции опор R (зелёные стрелки вверх) */}
        <g className="cae-demo-loop" style={{ animationName: "caeResultBadge" }}>
          {[NL, NR].map((x) => (
            <line key={x} x1={x} y1={BY - 18} x2={x} y2={BY - 78} stroke={green} strokeWidth="2.2" markerEnd="url(#caeUp)" />
          ))}
          <text x={NL} y={BY - 86} textAnchor="middle" fill={green} fontFamily="'Roboto Mono', monospace" fontSize="12">
            R = 20.0 кН
          </text>
          <text x={NR} y={BY - 86} textAnchor="middle" fill={green} fontFamily="'Roboto Mono', monospace" fontSize="12">
            R = 20.0 кН
          </text>
        </g>

        {/* Распределённая нагрузка q */}
        <g className="cae-demo-loop" style={{ animationName: "caeLoadArrows" }}>
          <line x1={NL} y1={BY - 50} x2={NR} y2={BY - 50} stroke={accent} strokeWidth="1.5" />
          {arrows.map((x) => (
            <line key={x} x1={x} y1={BY - 50} x2={x} y2={BY - 8} stroke={accent} strokeWidth="1.5" markerEnd="url(#caeDown)" />
          ))}
          <text x={240} y={BY - 58} textAnchor="middle" fill={accent} fontFamily="'Roboto Mono', monospace" fontSize="12">
            q = 10.0 кН/м
          </text>
        </g>

        {/* Балка */}
        <line x1={NL} y1={BY} x2={NR} y2={BY} stroke="var(--drawing-line)" strokeWidth="3.5" />

        {/* Метки узлов */}
        <text x={NL + 8} y={BY - 8} fill="var(--drawing-line-thin)" fontFamily="'Roboto Mono', monospace" fontSize="12">n2</text>
        <text x={NR - 24} y={BY - 8} fill="var(--drawing-line-thin)" fontFamily="'Roboto Mono', monospace" fontSize="12">n3</text>

        {/* Узлы (кружки) */}
        <circle cx={NL} cy={BY} r="6" fill="var(--drawing-bg)" stroke="var(--drawing-line)" strokeWidth="2.2" />
        <circle cx={NR} cy={BY} r="6" fill="var(--drawing-bg)" stroke="var(--drawing-line)" strokeWidth="2.2" />

        {/* Левая опора — шарнирно-неподвижная (треугольник + штриховка) */}
        <g stroke="var(--drawing-line)" strokeWidth="1.6">
          <path d={`M${NL} ${BY + 6} L${NL - 11} ${BY + 24} L${NL + 11} ${BY + 24} Z`} fill="none" />
          <line x1={NL - 14} y1={BY + 24} x2={NL + 14} y2={BY + 24} />
          {[-9, -2, 5, 12].map((d) => (
            <line key={d} x1={NL + d} y1={BY + 24} x2={NL + d - 6} y2={BY + 32} strokeWidth="1.2" />
          ))}
        </g>

        {/* Правая опора — шарнирно-подвижная (треугольник + катки) */}
        <g stroke="var(--drawing-line)" strokeWidth="1.6">
          <path d={`M${NR} ${BY + 6} L${NR - 11} ${BY + 22} L${NR + 11} ${BY + 22} Z`} fill="none" />
          <circle cx={NR - 8} cy={BY + 27} r="3.5" fill="var(--drawing-bg)" />
          <circle cx={NR} cy={BY + 27} r="3.5" fill="var(--drawing-bg)" />
          <circle cx={NR + 8} cy={BY + 27} r="3.5" fill="var(--drawing-bg)" />
          <line x1={NR - 14} y1={BY + 32} x2={NR + 14} y2={BY + 32} />
        </g>

        {/* Размерная линия пролёта */}
        <g className="cae-demo-loop" style={{ animationName: "caeDeflect" }}>
          <line x1={NL} y1={BY + 46} x2={NR} y2={BY + 46} stroke="var(--drawing-line-thin)" strokeWidth="0.8" />
          <text x={240} y={BY + 42} textAnchor="middle" fill="var(--drawing-line-thin)" fontFamily="'Roboto Mono', monospace" fontSize="11">
            4 м
          </text>
        </g>

        {/* Эпюра изгибающего момента M (заливка + точка максимума) */}
        <g className="cae-demo-loop" style={{ animationName: "caeDiagram" }} opacity="0">
          <path
            d={`M${NL} ${BY + 16} Q240 ${BY + 110} ${NR} ${BY + 16} Z`}
            fill={accent}
            fillOpacity="0.12"
            stroke="none"
          />
          <path
            d={`M${NL} ${BY + 16} Q240 ${BY + 110} ${NR} ${BY + 16}`}
            fill="none"
            stroke={accent}
            strokeWidth="2"
          />
          <line x1={NL} y1={BY + 16} x2={NR} y2={BY + 16} stroke="var(--drawing-line-thin)" strokeWidth="0.8" />
          {/* Точка максимума момента */}
          <circle cx={240} cy={BY + 79} r="4.5" fill={accent} />
          <text x={240} y={BY + 96} textAnchor="middle" fill={accent} fontFamily="'Roboto Mono', monospace" fontSize="12" fontWeight="bold">
            20.0 кН·м
          </text>
        </g>
      </svg>

      {/* Бейдж результата */}
      <div
        className="cae-demo-loop absolute top-9 right-3 border border-[var(--drawing-blue)] bg-[var(--drawing-bg)] px-3 py-1.5"
        style={{ animationName: "caeResultBadge", opacity: 0, color: blue }}
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
