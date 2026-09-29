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
  getPattern,
  getScale,
  getTimbre,
  midiToFreq,
} from "./config";
import { createNoiseBuffer, makeDriveCurve, triggerDrum } from "./drums";
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
  /** Текущий шаг ритмической сетки, 0..15 — для индикатора долей. */
  step: number;
  /** Доли, на которых бьёт бочка в текущем рисунке. */
  kickSteps: number[];
  /** Доли малого барабана. */
  snareSteps: number[];
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

  // Ритм-секция.
  /** Шина барабанов — идёт мимо главного фильтра, чтобы бит всегда был чётким. */
  private drumBus: GainNode | null = null;
  /** Шина баса — тоже мимо фильтра: низ не должен пропадать при закрытом срезе. */
  private bassBus: GainNode | null = null;
  /** Насыщение микса: даёт плотность и «мясо». */
  private driveShaper: WaveShaperNode | null = null;
  private drivePre: GainNode | null = null;
  private drivePost: GainNode | null = null;
  /** Буфер шума для ударных — создаётся один раз. */
  private noiseBuffer: AudioBuffer | null = null;
  /** Номер такта для автоматического усложнения рисунка. */
  private barCount = 0;
  /** Текущий шаг сетки для телеметрии. */
  private currentStep = 0;

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
      step: 0,
      kickSteps: [],
      snareSteps: [],
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

    // Насыщение микса: pre-gain → мягкий клиппер → post-gain.
    // Даёт плотность и энергию, характерные для «живого» звука в зале.
    const drivePre = ctx.createGain();
    drivePre.gain.value = 1;
    const driveShaper = ctx.createWaveShaper();
    driveShaper.curve = makeDriveCurve(this.settings.drive);
    driveShaper.oversample = "2x";
    const drivePost = ctx.createGain();
    drivePost.gain.value = 1;

    // Шина барабанов и баса идут МИМО главного фильтра: когда фильтр закрыт
    // (темнота, тихая комната), бит и низ всё равно остаются читаемыми.
    const drumBus = ctx.createGain();
    drumBus.gain.value = this.settings.drumsEnabled ? this.settings.drumsLevel : 0;
    const bassBus = ctx.createGain();
    bassBus.gain.value = this.settings.bassEnabled ? this.settings.bassLevel : 0;

    // Компрессор на бас — ровный, «упругий» низ без провалов.
    const bassComp = ctx.createDynamicsCompressor();
    bassComp.threshold.value = -20;
    bassComp.knee.value = 10;
    bassComp.ratio.value = 6;
    bassComp.attack.value = 0.008;
    bassComp.release.value = 0.12;

    // Граф: мелодические шины → фильтр → эхо; ритм-секция → сразу в drive.
    noteBus.connect(filter);
    droneBus.connect(filter);
    filter.connect(drivePre);
    filter.connect(delay);
    delay.connect(delayFilter);
    delayFilter.connect(delayGain);
    delayGain.connect(delay); // обратная связь
    delayGain.connect(drivePre);

    bassBus.connect(bassComp);
    bassComp.connect(drivePre);
    drumBus.connect(drivePre);

    drivePre.connect(driveShaper);
    driveShaper.connect(drivePost);
    drivePost.connect(limiter);
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
    this.drumBus = drumBus;
    this.bassBus = bassBus;
    this.drivePre = drivePre;
    this.driveShaper = driveShaper;
    this.drivePost = drivePost;
    this.noiseBuffer = createNoiseBuffer(ctx);

    this.telemetry.spectrum = new Uint8Array(analyser.frequencyBinCount);
    this.telemetry.waveform = new Uint8Array(analyser.fftSize);

    this.buildDrone();
    this.buildNoise();
    this.applyDrive();

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
    // Ритм-секция: уровни меняются плавно, чтобы бит не обрывался щелчком.
    this.drumBus?.gain.setTargetAtTime(next.drumsEnabled ? next.drumsLevel : 0, t, 0.12);
    this.bassBus?.gain.setTargetAtTime(next.bassEnabled ? next.bassLevel : 0, t, 0.12);
    this.applyDrive();
    await this.hub.applySources(next.sources, ctx);
  }

  /** Пересчитывает кривую насыщения и компенсирует прирост громкости. */
  private applyDrive() {
    if (!this.driveShaper || !this.drivePre || !this.drivePost || !this.ctx) return;
    const timbre = getTimbre(this.settings.timbreId);
    // Общий драйв — настройка пользователя плюс характер тембра.
    const amount = clamp(this.settings.drive * 0.7 + timbre.drive * 0.5, 0, 1);
    this.driveShaper.curve = makeDriveCurve(amount);
    const t = this.ctx.currentTime;
    // Чем сильнее насыщение, тем тише вход и выход — иначе микс «раздувает».
    this.drivePre.gain.setTargetAtTime(1 + amount * 0.8, t, 0.2);
    this.drivePost.gain.setTargetAtTime(1 / (1 + amount * 1.1), t, 0.2);
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

  /**
   * Текущая тоника: базовая нота плюс сдвиг от времени суток.
   * Сдвиг ступенчатый (квинта/кварта), а не произвольный, чтобы бас и мелодия
   * оставались в ладу и переход звучал как смена тональности, а не как расстройка.
   */
  private currentRoot(s: SensorState): number {
    const authority = this.settings.sources.clock.enabled ? this.settings.clockAuthority : 0;
    if (authority <= 0.01) return clamp(this.settings.rootMidi, 21, 84);
    // Ночью ниже, днём выше: -5 (кварта вниз) … +7 (квинта вверх).
    const dayCurve = Math.sin(((s.hourFloat - 6) / 24) * Math.PI * 2);
    const musicalSteps = [-5, -3, 0, 3, 5, 7];
    const idx = Math.round(((dayCurve + 1) / 2) * (musicalSteps.length - 1));
    const shift = Math.round(musicalSteps[idx] * authority);
    return clamp(this.settings.rootMidi + shift, 21, 84);
  }

  /**
   * Фактический темп: базовый BPM с поправкой на время суток и активность.
   * В грувовом режиме поправка мягче — танцевальный бит не должен «вязнуть»
   * вечером и разгоняться до неразборчивого утром.
   */
  private currentBpm(s: SensorState): number {
    const authority = this.settings.sources.clock.enabled ? this.settings.clockAuthority : 0;
    const groove = this.settings.drumsEnabled || this.settings.bassEnabled;
    const dayCurve = Math.sin(((s.hourFloat - 6) / 24) * Math.PI * 2); // -1 ночь … +1 день
    const clockFactor = 1 + dayCurve * (groove ? 0.12 : 0.35) * authority;
    const activityFactor = 1 + s.activity * (groove ? 0.12 : 0.3);
    const min = groove ? 60 : 24;
    return clamp(this.settings.bpm * clockFactor * activityFactor, min, 180);
  }

  /** Частота среза фильтра: свет, микрофон, мышь. */
  private currentCutoff(s: SensorState): number {
    const src = this.settings.sources;
    // В грувовом режиме (есть ритм-секция) держим фильтр заметно открытее:
    // закрытый срез «съедает» атаку нот и превращает драйв в вату.
    const groove = this.settings.drumsEnabled || this.settings.bassEnabled;
    let base = (groove ? 1400 : 500) + this.settings.density * (groove ? 1800 : 800);
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

  /**
   * Секвенсор грува: планирует барабаны, бас и мелодические ноты по сетке
   * шестнадцатых с опережением. Планирование идёт по часам AudioContext,
   * поэтому ритм не плывёт даже при просадках кадров у браузера.
   */
  private scheduleAuto(now: number, s: SensorState) {
    const ctx = this.ctx;
    if (!ctx) return;
    const bpm = this.currentBpm(s);
    // Шаг сетки — шестнадцатая нота.
    const step = 60 / bpm / 4;
    const pattern = getPattern(this.settings.patternId);
    const timbre = getTimbre(this.settings.timbreId);
    const scale = getScale(this.settings.scaleId);

    while (this.nextStepAt < now + 0.2) {
      const i = this.stepIndex % 16;
      const root = this.currentRoot(s);
      // Свинг: нечётные шестнадцатые сдвигаются позже — грув начинает «качать».
      const swingShift = i % 2 === 1 ? step * this.settings.swing * 0.5 : 0;
      const at = this.nextStepAt + swingShift;

      // Энергия зала: микрофон и активность делают удары сильнее.
      const energy = 0.75 + s.activity * 0.35;

      if (this.settings.drumsEnabled && this.noiseBuffer && this.drumBus) {
        // Каждые 8 тактов рисунок слегка усложняется — музыка не «залипает».
        const variation = this.settings.evolve ? (this.barCount % 8) / 8 : 0;

        if (pattern.kick[i]) {
          triggerDrum({
            ctx, dest: this.drumBus, noiseBuffer: this.noiseBuffer,
            voice: "kick", kit: timbre.drumKit, at,
            velocity: clamp(0.95 * energy, 0, 1),
          });
        }
        if (pattern.snare[i]) {
          triggerDrum({
            ctx, dest: this.drumBus, noiseBuffer: this.noiseBuffer,
            voice: "snare", kit: timbre.drumKit, at,
            velocity: clamp(0.8 * energy, 0, 1), pan: 0.12,
          });
        }
        if (pattern.hat[i]) {
          // Хэт чуть тише на слабых долях — так рисунок дышит.
          const accent = i % 4 === 0 ? 1 : 0.62;
          triggerDrum({
            ctx, dest: this.drumBus, noiseBuffer: this.noiseBuffer,
            voice: "hat", kit: timbre.drumKit, at,
            velocity: clamp(0.5 * accent * energy, 0, 1),
            pan: i % 2 === 0 ? -0.25 : 0.3,
          });
        }
        // Призрачный малый в вариации — добавляет фанковую непредсказуемость.
        if (variation > 0.5 && !pattern.snare[i] && i % 2 === 1 && Math.random() < 0.14) {
          triggerDrum({
            ctx, dest: this.drumBus, noiseBuffer: this.noiseBuffer,
            voice: "snare", kit: timbre.drumKit, at,
            velocity: 0.22 * energy, pan: -0.2,
          });
        }
      }

      // Басовая линия по рисунку: ведёт гармонию и держит грув.
      if (this.settings.bassEnabled && this.bassBus) {
        const deg = pattern.bass[i];
        if (deg !== null && deg !== undefined) {
          const midi = scaleNote(scale.steps, root, deg);
          this.playBass(clamp(midi, 24, 60), 0.9 * energy, at, step * timbre.bassLength * (1 + this.settings.swing * 0.3));
        }
      }

      // Мелодические ноты: реже баса, на сильных долях и синкопах.
      const density = this.settings.density * (0.45 + s.activity * 0.9);
      const gate = i % 4 === 0 ? 0.5 : i % 2 === 0 ? 0.3 : 0.16;
      if (Math.random() < density * gate) {
        const degree = Math.floor(Math.random() * scale.steps.length) + (Math.random() < 0.3 ? scale.steps.length : 0);
        const midi = scaleNote(scale.steps, root + 12, degree);
        const vel = 0.3 + Math.random() * 0.3;
        this.playNote(clamp(midi, 24, 100), vel, (Math.random() - 0.5) * 1.4, "auto", at);
      }

      this.currentStep = i;
      this.nextStepAt += step;
      this.stepIndex++;
      if (this.stepIndex % 16 === 0) this.barCount++;
    }
  }

  /**
   * Басовая нота: осциллятор + низкочастотный фильтр с быстрой огибающей.
   * Именно бас даёт ощущение «драйва» и держит танцевальный пульс.
   */
  private playBass(midi: number, velocity: number, at: number, length: number) {
    const ctx = this.ctx;
    if (!ctx || !this.bassBus) return;
    const timbre = getTimbre(this.settings.timbreId);
    const freq = midiToFreq(midi);

    const osc = ctx.createOscillator();
    osc.type = timbre.bassWave;
    osc.frequency.value = freq;

    // Подоктава синусом — «вес» в нижней части спектра, слышно на любой акустике.
    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.value = freq / 2;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.55;

    // Фильтр с огибающей: щелчок атаки, затем закрытие — классический «пружинистый» бас.
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 6;
    const openTo = clamp(freq * 7 + 320, 260, 2600);
    lp.frequency.setValueAtTime(openTo, at);
    lp.frequency.exponentialRampToValueAtTime(clamp(freq * 2.2, 90, 900), at + Math.min(0.16, length * 0.7));

    const g = ctx.createGain();
    const dur = Math.max(0.09, length);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(clamp(velocity, 0, 1) * 0.5, at + 0.006);
    g.gain.setTargetAtTime(0.0001, at + dur * 0.55, dur * 0.28);

    osc.connect(lp);
    sub.connect(subGain);
    subGain.connect(lp);
    lp.connect(g);
    g.connect(this.bassBus);

    osc.start(at);
    sub.start(at);
    const end = at + dur + 0.2;
    osc.stop(end);
    sub.stop(end);
    osc.onended = () => {
      osc.disconnect();
      sub.disconnect();
      subGain.disconnect();
      lp.disconnect();
      g.disconnect();
    };
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
      const pat = getPattern(this.settings.patternId);
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
        step: this.currentStep,
        kickSteps: pat.kick,
        snareSteps: pat.snare,
      };
      this.onTelemetry?.(this.telemetry);
    }
  };
}

function noteName(midi: number): string {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  return `${names[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}