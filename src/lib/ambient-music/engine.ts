/**
 * Звуковой движок генеративного синтезатора (/owner/music).
 *
 * Строит граф Web Audio: дрон из трёх расстроенных голосов → фильтр → задержка
 * с обратной связью → лимитер → выход. Поверх дрона играются короткие ноты от
 * событий (клавиши, клики, всплески звука) и автоматические ноты по сетке темпа.
 * Каждый кадр движок читает SensorState и переводит показания сенсоров в
 * параметры звука: время суток — тональность и темп, освещённость — яркость
 * фильтра, микрофон — громкость и плотность, мышь — панорама и высота.
 *
 * Синтез идёт полностью в браузере, аудиофайлы не загружаются.
 */
import {
  type MusicSettings,
  type SourceId,
  getScale,
  getTimbre,
  midiToFreq,
} from "./config";
import { SensorHub, type SensorState, type Trigger } from "./sensors";

/** Показатели, которые страница рисует в реальном времени. */
export interface EngineTelemetry {
  /** Текущая тоника (MIDI). */
  rootMidi: number;
  /** Фактический темп, BPM. */
  bpm: number;
  /** Частота среза фильтра, Гц. */
  cutoff: number;
  /** Уровень выхода 0..1 (пик). */
  outLevel: number;
  /** Число активных голосов. */
  voices: number;
  /** Нот проиграно с момента запуска. */
  notesPlayed: number;
  /** Последние сыгранные ноты (названия), новые в конце. */
  lastNotes: Array<{ name: string; source: SourceId | "auto"; at: number }>;
  /** Спектр выхода для визуализации. */
  spectrum: Uint8Array;
  /** Осциллограмма выхода. */
  waveform: Uint8Array;
}

const MAX_VOICES = 24;

function clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}

/** Ступень лада → MIDI-нота относительно тоники. */
function scaleNote(steps: number[], root: number, degree: number): number {
  const octave = Math.floor(degree / steps.length);
  const idx = ((degree % steps.length) + steps.length) % steps.length;
  return root + steps[idx] + octave * 12;
}

export class MusicEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private delay: DelayNode | null = null;
  private delayGain: GainNode | null = null;
  private delayFilter: BiquadFilterNode | null = null;
  private analyser: AnalyserNode | null = null;
  private noteBus: GainNode | null = null;
  private droneBus: GainNode | null = null;

  private droneVoices: Array<{ osc: OscillatorNode; gain: GainNode; pan: StereoPannerNode; detune: number }> = [];
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;

  private settings: MusicSettings;
  private hub: SensorHub;
  private raf = 0;
  private activeVoices = 0;
  private notesPlayed = 0;
  private lastNotes: EngineTelemetry["lastNotes"] = [];
  private nextStepAt = 0;
  private stepIndex = 0;
  private telemetry: EngineTelemetry;
  private running = false;
  private onTelemetry: ((t: EngineTelemetry) => void) | null = null;
  private lastEmit = 0;

  constructor(
    settings: MusicSettings,
    onStatus: (id: SourceId, status: import("./sensors").SourceStatus) => void,
  ) {
    this.settings = settings;
    this.hub = new SensorHub({
      onTrigger: (t) => this.handleTrigger(t),
      onStatus,
    });
    this.telemetry = {
      rootMidi: settings.rootMidi,
      bpm: settings.bpm,
      cutoff: 800,
      outLevel: 0,
      voices: 0,
      notesPlayed: 0,
      lastNotes: [],
      spectrum: new Uint8Array(64),
      waveform: new Uint8Array(128),
    };
  }

  get sensorState(): SensorState {
    return this.hub.state;
  }

  get isRunning() {
    return this.running;
  }

  setTelemetryListener(fn: ((t: EngineTelemetry) => void) | null) {
    this.onTelemetry = fn;
  }

  /** Запуск: создаёт граф, подписывает сенсоры, стартует цикл. */
  async start() {
    if (this.running) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    this.ctx = ctx;
    await ctx.resume();

    const master = ctx.createGain();
    master.gain.value = 0;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.knee.value = 8;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.004;
    limiter.release.value = 0.2;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    filter.Q.value = 1.1;

    const delay = ctx.createDelay(2.5);
    delay.delayTime.value = 0.42;
    const delayGain = ctx.createGain();
    delayGain.gain.value = 0.3;
    const delayFilter = ctx.createBiquadFilter();
    delayFilter.type = "lowpass";
    delayFilter.frequency.value = 2400;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.75;

    const noteBus = ctx.createGain();
    noteBus.gain.value = 0.9;
    const droneBus = ctx.createGain();
    droneBus.gain.value = 0.7;

    // Граф: шины → фильтр → (эхо-петля) → лимитер → мастер → выход.
    noteBus.connect(filter);
    droneBus.connect(filter);
    filter.connect(limiter);
    filter.connect(delay);
    delay.connect(delayFilter);
    delayFilter.connect(delayGain);
    delayGain.connect(delay); // обратная связь
    delayGain.connect(limiter);
    limiter.connect(master);
    master.connect(analyser);
    master.connect(ctx.destination);

    this.master = master;
    this.limiter = limiter;
    this.filter = filter;
    this.delay = delay;
    this.delayGain = delayGain;
    this.delayFilter = delayFilter;
    this.analyser = analyser;
    this.noteBus = noteBus;
    this.droneBus = droneBus;

    this.telemetry.spectrum = new Uint8Array(analyser.frequencyBinCount);
    this.telemetry.waveform = new Uint8Array(analyser.fftSize);

    this.buildDrone();
    this.buildNoise();

    this.running = true;
    // Плавный вход, чтобы не щёлкало.
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(this.settings.volume, ctx.currentTime + 1.2);

    await this.hub.applySources(this.settings.sources, ctx);
    this.nextStepAt = ctx.currentTime + 0.5;
    this.loop();
  }

  /** Остановка: гасит звук, снимает подписки, закрывает контекст. */
  async stop() {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.raf);
    const ctx = this.ctx;
    this.hub.dispose();
    if (ctx && this.master) {
      const t = ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(this.master.gain.value, t);
      this.master.gain.linearRampToValueAtTime(0, t + 0.5);
      await new Promise((r) => setTimeout(r, 600));
      this.droneVoices.forEach((v) => {
        try {
          v.osc.stop();
        } catch {
          /* уже остановлен */
        }
      });
      try {
        this.noiseSource?.stop();
      } catch {
        /* уже остановлен */
      }
      await ctx.close();
    }
    this.droneVoices = [];
    this.noiseSource = null;
    this.ctx = null;
    this.activeVoices = 0;
    this.telemetry.outLevel = 0;
    this.telemetry.voices = 0;
    this.onTelemetry?.({ ...this.telemetry });
  }

  /** Обновление настроек на ходу — без перезапуска звука. */
  async updateSettings(next: MusicSettings) {
    const prevTimbre = this.settings.timbreId;
    const prevDrone = this.settings.droneEnabled;
    this.settings = next;
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t = ctx.currentTime;
    this.master.gain.setTargetAtTime(next.volume, t, 0.15);
    if (this.limiter) this.limiter.threshold.setTargetAtTime(next.limiter ? -12 : 0, t, 0.2);
    if (this.delayGain) this.delayGain.gain.setTargetAtTime(getTimbre(next.timbreId).feedback * next.space, t, 0.2);
    if (prevTimbre !== next.timbreId) this.rebuildDroneWaves();
    if (prevDrone !== next.droneEnabled && this.droneBus) {
      this.droneBus.gain.setTargetAtTime(next.droneEnabled ? 0.7 : 0, t, 0.4);
    }
    await this.hub.applySources(next.sources, ctx);
  }

  /* ---------------- Построение графа ---------------- */

  private buildDrone() {
    const ctx = this.ctx;
    if (!ctx || !this.droneBus) return;
    const timbre = getTimbre(this.settings.timbreId);
    const detunes = [-7, 0, 5];
    timbre.droneWaves.forEach((wave, i) => {
      const osc = ctx.createOscillator();
      osc.type = wave;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      const pan = ctx.createStereoPanner();
      pan.pan.value = (i - 1) * 0.6;
      osc.connect(gain);
      gain.connect(pan);
      pan.connect(this.droneBus!);
      osc.start();
      gain.gain.setTargetAtTime(0.2 / timbre.droneWaves.length, ctx.currentTime, 1.5);
      this.droneVoices.push({ osc, gain, pan, detune: detunes[i] ?? 0 });
    });
    if (!this.settings.droneEnabled) this.droneBus.gain.value = 0;
  }

  private rebuildDroneWaves() {
    const waves = getTimbre(this.settings.timbreId).droneWaves;
    this.droneVoices.forEach((v, i) => {
      v.osc.type = waves[i % waves.length];
    });
  }

  /** Шумовой слой: розовый шум через полосовой фильтр. */
  private buildNoise() {
    const ctx = this.ctx;
    if (!ctx || !this.filter) return;
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    // Простая аппроксимация розового шума (фильтр Пола Кельвина-Босли).
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.963 * b1 + white * 0.2965164;
      b2 = 0.57555 * b2 + white * 1.0526913;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.12;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const nf = ctx.createBiquadFilter();
    nf.type = "bandpass";
    nf.frequency.value = 900;
    nf.Q.value = 0.8;
    const ng = ctx.createGain();
    ng.gain.value = 0;
    src.connect(nf);
    nf.connect(ng);
    ng.connect(this.filter);
    src.start();
    this.noiseSource = src;
    this.noiseFilter = nf;
    this.noiseGain = ng;
  }

  /* ---------------- Сопоставление сенсоров и звука ---------------- */

  /** Текущая тоника: базовая нота плюс сдвиг от времени суток. */
  private currentRoot(s: SensorState): number {
    const authority = this.settings.sources.clock.enabled ? this.settings.clockAuthority : 0;
    // Ночью (0–6 ч) опускаем на октаву, днём поднимаем до +5 полутонов.
    const dayCurve = Math.sin(((s.hourFloat - 6) / 24) * Math.PI * 2);
    const shift = Math.round(dayCurve * 7 * authority);
    // Минуты дают мягкий дрейф на кварту за час.
    const minuteShift = Math.round((s.minute / 60) * 5 * authority);
    return clamp(this.settings.rootMidi + shift + minuteShift, 21, 84);
  }

  /** Фактический темп: базовый BPM с поправкой на время суток и активность. */
  private currentBpm(s: SensorState): number {
    const authority = this.settings.sources.clock.enabled ? this.settings.clockAuthority : 0;
    const dayCurve = Math.sin(((s.hourFloat - 6) / 24) * Math.PI * 2); // -1 ночь … +1 день
    const clockFactor = 1 + dayCurve * 0.35 * authority;
    const activityFactor = 1 + s.activity * 0.3;
    return clamp(this.settings.bpm * clockFactor * activityFactor, 24, 180);
  }

  /** Частота среза фильтра: свет, микрофон, мышь. */
  private currentCutoff(s: SensorState): number {
    const src = this.settings.sources;
    let base = 500 + this.settings.density * 800;
    if (src.light.enabled) {
      base *= 0.5 + s.lightNorm * 2.4 * src.light.intensity;
    }
    if (src.mic.enabled) {
      base *= 1 + s.micSmooth * 2.5 * src.mic.intensity;
    }
    if (src.mouseMove.enabled) {
      base *= 0.6 + s.mouseX * 1.6 * src.mouseMove.intensity;
    }
    // Дыхание фильтра по секундной стрелке.
    if (src.clock.enabled) {
      const breath = Math.sin((s.second / 60) * Math.PI * 2);
      base *= 1 + breath * 0.25 * src.clock.intensity;
    }
    return clamp(base, 140, 9000);
  }

  /* ---------------- Ноты ---------------- */

  private handleTrigger(t: Trigger) {
    if (!this.running || !this.ctx || t.velocity <= 0.01) return;
    const s = this.hub.state;
    const scale = getScale(this.settings.scaleId);
    const root = this.currentRoot(s);
    // Высоту события переводим в ступень лада в диапазоне трёх октав.
    const degree = Math.round(t.pitch * (scale.steps.length * 3));
    let midi = scaleNote(scale.steps, root + 12, degree);
    if (this.settings.sources.mouseMove.enabled) {
      // Вертикаль курсора сдвигает слой на октаву вверх/вниз.
      midi += Math.round((0.5 - s.mouseY) * 12 * this.settings.sources.mouseMove.intensity);
    }
    this.playNote(clamp(midi, 24, 100), t.velocity, t.pan, t.source);
  }

  /** Автоматические ноты по сетке темпа — «дыхание» композиции. */
  private scheduleAuto(now: number, s: SensorState) {
    const ctx = this.ctx;
    if (!ctx) return;
    const bpm = this.currentBpm(s);
    const step = 60 / bpm / 2;
    while (this.nextStepAt < now + 0.15) {
      const beat = this.stepIndex;
      const scale = getScale(this.settings.scaleId);
      const root = this.currentRoot(s);
      // Плотность: сколько шагов сетки озвучивается.
      const density = this.settings.density * (0.5 + s.activity * 0.8);
      const gate = beat % 8 === 0 ? 0.55 : beat % 4 === 0 ? 0.35 : 0.18;
      if (Math.random() < density * gate + (beat % 16 === 0 ? 0.25 : 0)) {
        const degree = Math.floor(Math.random() * scale.steps.length * 2);
        const midi = scaleNote(scale.steps, root + 12, degree);
        const vel = 0.25 + Math.random() * 0.25;
        this.playNote(clamp(midi, 24, 100), vel, (Math.random() - 0.5) * 1.5, "auto", this.nextStepAt);
      }
      this.nextStepAt += step;
      this.stepIndex = (this.stepIndex + 1) % 64;
    }
  }

  /** Короткая нота: осциллятор + огибающая, самоочищается после затухания. */
  private playNote(midi: number, velocity: number, pan: number, source: SourceId | "auto", at?: number) {
    const ctx = this.ctx;
    if (!ctx || !this.noteBus) return;
    if (this.activeVoices >= MAX_VOICES) return;
    const timbre = getTimbre(this.settings.timbreId);
    const s = this.hub.state;
    const t0 = at ?? ctx.currentTime;
    const freq = midiToFreq(midi);

    const osc = ctx.createOscillator();
    osc.type = timbre.noteWave;
    osc.frequency.value = freq;

    // Батарея расстраивает строй: чем меньше заряд, тем сильнее плывёт.
    if (this.settings.sources.battery.enabled && s.battery !== null) {
      const drift = (1 - s.battery) * 28 * this.settings.sources.battery.intensity;
      osc.detune.value = (Math.random() - 0.5) * drift;
    }

    const gain = ctx.createGain();
    const panner = ctx.createStereoPanner();
    panner.pan.value = clamp(pan, -1, 1);

    const release = timbre.noteRelease * (0.6 + this.settings.space * 0.9);
    const attack = source === "auto" ? 0.12 : 0.008;
    const peak = clamp(velocity, 0, 1) * 0.22;

    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0008, t0 + attack + release);

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.noteBus);
    osc.start(t0);
    osc.stop(t0 + attack + release + 0.05);
    this.activeVoices++;
    osc.onended = () => {
      this.activeVoices--;
      osc.disconnect();
      gain.disconnect();
      panner.disconnect();
    };

    this.notesPlayed++;
    this.lastNotes.push({ name: noteName(midi), source, at: Date.now() });
    if (this.lastNotes.length > 14) this.lastNotes.shift();
  }

  /* ---------------- Основной цикл ---------------- */

  private loop = () => {
    if (!this.running || !this.ctx) return;
    this.raf = requestAnimationFrame(this.loop);
    const ctx = this.ctx;
    const now = ctx.currentTime;
    this.hub.tick();
    const s = this.hub.state;
    const src = this.settings.sources;
    const timbre = getTimbre(this.settings.timbreId);

    // Фильтр.
    const cutoff = this.currentCutoff(s);
    this.filter?.frequency.setTargetAtTime(cutoff, now, 0.08);
    const q = 0.7 + (src.scroll.enabled ? s.scrollEnergy * 6 * src.scroll.intensity : 0);
    this.filter?.Q.setTargetAtTime(clamp(q, 0.4, 10), now, 0.1);

    // Дрон: тоника и расстройка.
    const root = this.currentRoot(s);
    const rootFreq = midiToFreq(root);
    const tiltDetune = src.motion.enabled ? s.tiltX * 25 * src.motion.intensity : 0;
    const scrollDetune = src.scroll.enabled ? s.scrollEnergy * 40 * src.scroll.intensity : 0;
    this.droneVoices.forEach((v, i) => {
      const f = rootFreq * Math.pow(2, (v.detune + (i === 2 ? 12 : 0)) / 12);
      v.osc.frequency.setTargetAtTime(f, now, 0.6);
      v.osc.detune.setTargetAtTime((i - 1) * 6 + tiltDetune + scrollDetune, now, 0.3);
      // Стерео качает наклон устройства и движение мыши.
      const panBase = (i - 1) * 0.6;
      const sway = (src.motion.enabled ? s.tiltY * 0.4 * src.motion.intensity : 0)
        + (src.mouseMove.enabled ? (s.mouseX - 0.5) * 0.6 * src.mouseMove.intensity : 0);
      v.pan.pan.setTargetAtTime(clamp(panBase + sway, -1, 1), now, 0.2);
      // Микрофон и свет подкачивают громкость голосов.
      const lvl = (0.14 + (src.mic.enabled ? s.micSmooth * 0.18 * src.mic.intensity : 0))
        / this.droneVoices.length
        * (src.light.enabled ? 0.7 + s.lightNorm * 0.6 : 1);
      v.gain.gain.setTargetAtTime(lvl, now, 0.5);
    });

    // Шумовой слой: скролл, микрофон, встряска.
    if (this.noiseGain && this.noiseFilter) {
      const noiseAmt = timbre.noise
        + (src.scroll.enabled ? s.scrollEnergy * 0.35 * src.scroll.intensity : 0)
        + (src.mouseMove.enabled ? s.mouseSpeed * 0.2 * src.mouseMove.intensity : 0)
        + (src.motion.enabled ? s.shake * 0.4 * src.motion.intensity : 0);
      this.noiseGain.gain.setTargetAtTime(clamp(noiseAmt * 0.3, 0, 0.35), now, 0.15);
      this.noiseFilter.frequency.setTargetAtTime(clamp(cutoff * 1.4, 200, 11000), now, 0.2);
    }

    // Эхо: глубина от настройки «простор», время — от темпа.
    const bpm = this.currentBpm(s);
    this.delay?.delayTime.setTargetAtTime(clamp((60 / bpm) * 0.75, 0.05, 2.4), now, 0.5);
    this.delayGain?.gain.setTargetAtTime(clamp(timbre.feedback * this.settings.space, 0, 0.82), now, 0.3);
    this.delayFilter?.frequency.setTargetAtTime(clamp(cutoff * 2, 400, 12000), now, 0.3);

    // Заряд батареи в зарядке добавляет светлый обертон через фильтр эха.
    if (src.battery.enabled && s.charging && this.delayFilter) {
      this.delayFilter.frequency.setTargetAtTime(clamp(cutoff * 3.2, 600, 14000), now, 0.4);
    }

    this.scheduleAuto(now, s);

    // Телеметрия — не чаще 20 раз в секунду, чтобы не грузить React.
    const nowMs = performance.now();
    if (this.analyser && nowMs - this.lastEmit > 50) {
      this.lastEmit = nowMs;
      const spectrum = new Uint8Array(this.analyser.frequencyBinCount);
      const waveform = new Uint8Array(this.analyser.fftSize);
      this.analyser.getByteFrequencyData(spectrum);
      this.analyser.getByteTimeDomainData(waveform);
      let peak = 0;
      for (let i = 0; i < waveform.length; i++) {
        const v = Math.abs((waveform[i] - 128) / 128);
        if (v > peak) peak = v;
      }
      this.telemetry = {
        rootMidi: root,
        bpm,
        cutoff,
        outLevel: peak,
        voices: this.activeVoices,
        notesPlayed: this.notesPlayed,
        lastNotes: [...this.lastNotes],
        spectrum,
        waveform,
      };
      this.onTelemetry?.(this.telemetry);
    }
  };
}

function noteName(midi: number): string {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  return `${names[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}