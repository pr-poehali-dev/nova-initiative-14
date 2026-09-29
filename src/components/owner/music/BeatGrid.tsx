/**
 * Индикатор ритмической сетки (/owner/music).
 *
 * Показывает 16 шагов текущего рисунка: какие доли занимает бочка и малый
 * барабан и где сейчас находится воспроизведение. Рисуется на canvas и читает
 * телеметрию напрямую, поэтому бегущая доля не вызывает перерисовку React.
 */
import { useEffect, useRef } from "react";
import type { EngineTelemetry } from "@/lib/ambient-music/engine";

interface Props {
  telemetryRef: React.MutableRefObject<EngineTelemetry | null>;
  running: boolean;
}

export default function BeatGrid({ telemetryRef, running }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;

    const cssVar = (name: string, fallback: string) => {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    };

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const line = cssVar("--drawing-line", "#1a1a2e");
      const thin = cssVar("--drawing-line-thin", "#3a3a5e");
      const accent = cssVar("--drawing-accent", "#c0392b");
      const blue = cssVar("--drawing-blue", "#2c3e80");
      const paper = cssVar("--drawing-paper", "#f5f3e8");

      ctx.fillStyle = paper;
      ctx.fillRect(0, 0, w, h);

      const t = telemetryRef.current;
      const steps = 16;
      const gap = 3;
      const cw = (w - gap * (steps - 1)) / steps;
      const rowH = (h - gap) / 2;

      for (let i = 0; i < steps; i++) {
        const x = i * (cw + gap);
        const isDownbeat = i % 4 === 0;
        const active = running && t ? t.step === i : false;

        // Верхний ряд — бочка, нижний — малый барабан.
        const kick = t && t.kickSteps.length === steps ? t.kickSteps[i] : 0;
        const snare = t && t.snareSteps.length === steps ? t.snareSteps[i] : 0;

        [kick, snare].forEach((hit, row) => {
          const y = row * (rowH + gap);
          ctx.fillStyle = hit ? (row === 0 ? accent : blue) : paper;
          ctx.globalAlpha = hit ? (active ? 1 : 0.72) : 1;
          ctx.fillRect(x, y, cw, rowH);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = isDownbeat ? line : thin;
          ctx.globalAlpha = isDownbeat ? 0.65 : 0.3;
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, rowH - 1);
          ctx.globalAlpha = 1;
        });

        // Бегущая доля — вертикальная подсветка поверх колонки.
        if (active) {
          ctx.strokeStyle = line;
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, 1, cw - 2, h - 2);
        }
      }
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [telemetryRef, running]);

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="w-full h-[46px] block border-[1.5px] border-[var(--drawing-line)]"
        aria-label="Сетка ритма: бочка и малый барабан по долям"
      />
      <div className="flex items-center gap-3 mt-1">
        <span className="inline-flex items-center gap-1 font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
          <span className="w-2.5 h-2.5 bg-[var(--drawing-accent)] inline-block" />бочка
        </span>
        <span className="inline-flex items-center gap-1 font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
          <span className="w-2.5 h-2.5 bg-[var(--drawing-blue)] inline-block" />малый барабан
        </span>
      </div>
    </div>
  );
}
