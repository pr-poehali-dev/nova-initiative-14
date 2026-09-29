/**
 * Визуализация звука синтезатора (/owner/music): осциллограмма и спектр на
 * canvas в стиле чертежа. Рисует напрямую из телеметрии движка, минуя состояние
 * React, поэтому кадры не вызывают перерисовку страницы.
 */
import { useEffect, useRef } from "react";
import type { EngineTelemetry } from "@/lib/ambient-music/engine";

interface Props {
  /** Ссылка на актуальную телеметрию: движок пишет в .current каждый кадр. */
  telemetryRef: React.MutableRefObject<EngineTelemetry | null>;
  running: boolean;
}

export default function MusicVisualizer({ telemetryRef, running }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;

    const read = (name: string, fallback: string) => {
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

      const line = read("--drawing-line", "#1a1a2e");
      const thin = read("--drawing-line-thin", "#3a3a5e");
      const accent = read("--drawing-accent", "#c0392b");
      const paper = read("--drawing-paper", "#f5f3e8");

      ctx.fillStyle = paper;
      ctx.fillRect(0, 0, w, h);

      // Сетка миллиметровки.
      ctx.strokeStyle = thin;
      ctx.globalAlpha = 0.12;
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      const t = telemetryRef.current;
      const mid = h * 0.5;

      if (!running || !t) {
        ctx.strokeStyle = thin;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.moveTo(0, mid);
        ctx.lineTo(w, mid);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = thin;
        ctx.font = "11px monospace";
        ctx.textAlign = "center";
        ctx.fillText("СИНТЕЗ ОСТАНОВЛЕН", w / 2, mid - 12);
        return;
      }

      // Спектр — столбики снизу.
      const bins = Math.min(72, t.spectrum.length);
      const bw = w / bins;
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.28;
      for (let i = 0; i < bins; i++) {
        const v = t.spectrum[i] / 255;
        const bh = v * h * 0.8;
        ctx.fillRect(i * bw, h - bh, Math.max(1, bw - 1.5), bh);
      }
      ctx.globalAlpha = 1;

      // Осциллограмма.
      ctx.strokeStyle = line;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      const n = t.waveform.length;
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * w;
        const y = mid + ((t.waveform[i] - 128) / 128) * (h * 0.42);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Метка среза фильтра по логарифмической шкале (20 Гц … 20 кГц).
      const fx = (Math.log10(Math.max(20, t.cutoff) / 20) / Math.log10(1000)) * w;
      ctx.strokeStyle = accent;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(fx, 0);
      ctx.lineTo(fx, h);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = accent;
      ctx.font = "9px monospace";
      ctx.textAlign = fx > w - 60 ? "right" : "left";
      ctx.fillText(`${Math.round(t.cutoff)} Гц`, fx > w - 60 ? fx - 4 : fx + 4, 12);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [telemetryRef, running]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-[180px] border-[1.5px] border-[var(--drawing-line)] block"
      aria-label="Осциллограмма и спектр генеративного звука"
    />
  );
}
