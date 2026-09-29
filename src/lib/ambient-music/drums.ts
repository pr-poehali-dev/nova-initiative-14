/**
 * Синтез ударных для грувового режима (/owner/music).
 *
 * Барабаны считаются осцилляторами и шумом прямо в браузере, без сэмплов:
 *  - бочка (kick) — синус с быстрым падением частоты 120→45 Гц плюс щелчок атаки;
 *  - малый (snare) — полосовой шум с коротким тональным призвуком;
 *  - хэт (hat) — высокочастотный шум с очень коротким затуханием.
 *
 * Характер набора (club / vintage / electro) меняет длительности, высоту и
 * фильтрацию, поэтому один и тот же рисунок звучит по-разному в разных тембрах.
 */
export type DrumKit = "club" | "vintage" | "electro";
export type DrumVoice = "kick" | "snare" | "hat";

interface KitProfile {
  kick: { start: number; end: number; decay: number; click: number };
  snare: { decay: number; tone: number; hp: number };
  hat: { decay: number; hp: number };
}

const PROFILES: Record<DrumKit, KitProfile> = {
  // Сухой современный клуб: короткая плотная бочка, резкий малый.
  club: {
    kick: { start: 132, end: 44, decay: 0.34, click: 0.5 },
    snare: { decay: 0.17, tone: 190, hp: 1400 },
    hat: { decay: 0.045, hp: 7500 },
  },
  // Тёплый винтаж: мягкая атака, более длинные хвосты, приглушённый верх.
  vintage: {
    kick: { start: 110, end: 48, decay: 0.42, click: 0.22 },
    snare: { decay: 0.24, tone: 168, hp: 900 },
    hat: { decay: 0.075, hp: 5200 },
  },
  // Электроника: высокий щелчок, длинная бочка, звонкий металлический хэт.
  electro: {
    kick: { start: 155, end: 40, decay: 0.3, click: 0.72 },
    snare: { decay: 0.14, tone: 220, hp: 1800 },
    hat: { decay: 0.035, hp: 9000 },
  },
};

/** Общий буфер белого шума — создаётся один раз на контекст. */
export function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * 0.5);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

interface HitOptions {
  ctx: AudioContext;
  dest: AudioNode;
  noiseBuffer: AudioBuffer;
  voice: DrumVoice;
  kit: DrumKit;
  /** Время старта в шкале AudioContext. */
  at: number;
  /** Сила удара, 0..1. */
  velocity: number;
  /** Панорама, -1..1. */
  pan?: number;
}

/**
 * Один удар. Все узлы живут ровно столько, сколько звучит удар,
 * и отключаются по onended — утечки голосов нет.
 */
export function triggerDrum({ ctx, dest, noiseBuffer, voice, kit, at, velocity, pan = 0 }: HitOptions) {
  const p = PROFILES[kit];
  const out = ctx.createGain();
  out.gain.value = Math.max(0, Math.min(1, velocity));
  const panner = ctx.createStereoPanner();
  panner.pan.value = Math.max(-1, Math.min(1, pan));
  out.connect(panner);
  panner.connect(dest);

  const cleanup = (node: AudioScheduledSourceNode, end: number) => {
    node.stop(end);
    node.onended = () => {
      node.disconnect();
      out.disconnect();
      panner.disconnect();
    };
  };

  if (voice === "kick") {
    const { start, end, decay, click } = p.kick;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(start, at);
    // Экспоненциальное падение высоты — основа «удара в грудь».
    osc.frequency.exponentialRampToValueAtTime(end, at + decay * 0.55);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(1, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, at + decay);

    osc.connect(g);
    g.connect(out);
    osc.start(at);
    cleanup(osc, at + decay + 0.05);

    // Щелчок атаки — короткий шумовой транзиент, добавляет «клик» в миксе.
    if (click > 0) {
      const n = ctx.createBufferSource();
      n.buffer = noiseBuffer;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 1200;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(click * 0.5, at);
      ng.gain.exponentialRampToValueAtTime(0.001, at + 0.03);
      n.connect(hp);
      hp.connect(ng);
      ng.connect(out);
      n.start(at);
      n.stop(at + 0.05);
      n.onended = () => {
        n.disconnect();
        hp.disconnect();
        ng.disconnect();
      };
    }
    return;
  }

  if (voice === "snare") {
    const { decay, tone, hp: hpFreq } = p.snare;
    const n = ctx.createBufferSource();
    n.buffer = noiseBuffer;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = hpFreq;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0, at);
    ng.gain.linearRampToValueAtTime(0.8, at + 0.003);
    ng.gain.exponentialRampToValueAtTime(0.001, at + decay);
    n.connect(hp);
    hp.connect(ng);
    ng.connect(out);
    n.start(at);
    cleanup(n, at + decay + 0.05);

    // Тональная составляющая — «тело» малого барабана.
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(tone, at);
    osc.frequency.exponentialRampToValueAtTime(tone * 0.7, at + decay * 0.6);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.35, at);
    og.gain.exponentialRampToValueAtTime(0.001, at + decay * 0.7);
    osc.connect(og);
    og.connect(out);
    osc.start(at);
    osc.stop(at + decay + 0.05);
    osc.onended = () => {
      osc.disconnect();
      og.disconnect();
    };
    return;
  }

  // Хэт: короткий высокочастотный шум.
  const { decay, hp: hatHp } = p.hat;
  const n = ctx.createBufferSource();
  n.buffer = noiseBuffer;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = hatHp;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = hatHp * 1.3;
  bp.Q.value = 0.8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(0.5, at + 0.002);
  g.gain.exponentialRampToValueAtTime(0.001, at + decay);
  n.connect(hp);
  hp.connect(bp);
  bp.connect(g);
  g.connect(out);
  n.start(at);
  n.stop(at + decay + 0.03);
  n.onended = () => {
    n.disconnect();
    hp.disconnect();
    bp.disconnect();
    g.disconnect();
    out.disconnect();
    panner.disconnect();
  };
}

/**
 * Кривая мягкого насыщения (soft clip) для узла WaveShaper.
 * Добавляет перегруз и плотность, не превращая звук в цифровой треск.
 */
export function makeDriveCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 1024;
  const curve = new Float32Array(new ArrayBuffer(n * 4));
  // k = 0 — почти линейно, k большое — выраженное насыщение.
  const k = Math.max(0.001, amount) * 40;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return curve;
}