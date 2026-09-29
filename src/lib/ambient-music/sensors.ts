/**
 * Сбор сигналов с устройства для генеративного синтезатора (/owner/music).
 *
 * Модуль читает время, микрофон, датчик освещённости, батарею, сеть, движение
 * устройства и действия пользователя (клавиатура, мышь, скролл) и сводит их в
 * один объект SensorState, который каждый кадр читает звуковой движок.
 *
 * Принципы: ничего не отправляется на сервер, микрофонный поток только
 * анализируется (getByteTimeDomainData) и не записывается, каждый источник
 * можно выключить — тогда он не подписывается на события вообще.
 */
import type { SourceId } from "./config";

/** Дискретное событие: нажатие, клик, всплеск звука. */
export interface Trigger {
  source: SourceId;
  /** Нормированная «высота» события, 0..1 — движок превращает её в ступень лада. */
  pitch: number;
  /** Сила события, 0..1. */
  velocity: number;
  /** Панорама, -1..1. */
  pan: number;
}

export interface SensorState {
  /** Часы 0..23 + доля часа. */
  hourFloat: number;
  /** Минуты 0..59. */
  minute: number;
  /** Секунды с долей, 0..60. */
  second: number;
  /** Громкость окружения (RMS), 0..1. */
  micLevel: number;
  /** Сглаженная громкость окружения, 0..1. */
  micSmooth: number;
  /** Спектральный центроид микрофона, 0..1 — «яркость» комнаты. */
  micBrightness: number;
  /** Освещённость в люксах или null, если датчик недоступен. */
  lux: number | null;
  /** Нормированная освещённость 0..1 (0 — темнота, 1 — яркий свет). */
  lightNorm: number;
  /** Положение курсора 0..1. */
  mouseX: number;
  mouseY: number;
  /** Скорость курсора 0..1. */
  mouseSpeed: number;
  /** Скорость набора: нажатий в секунду, нормировано 0..1. */
  typingRate: number;
  /** Интенсивность прокрутки 0..1. */
  scrollEnergy: number;
  /** Заряд батареи 0..1 или null. */
  battery: number | null;
  charging: boolean;
  /** Наклон устройства -1..1. */
  tiltX: number;
  tiltY: number;
  /** Ускорение устройства 0..1. */
  shake: number;
  /** Пропускная способность сети, Мбит/с (оценка) или null. */
  downlink: number | null;
  /** Задержка сети, мс, или null. */
  rtt: number | null;
  /** Общая активность пользователя 0..1 — сумма всех взаимодействий. */
  activity: number;
  /** Секунд с последнего действия пользователя. */
  idleSeconds: number;
}

/** Статусы доступа к источникам, которые требуют разрешения. */
export type SourceStatus = "off" | "pending" | "active" | "denied" | "unsupported";

export interface SensorsCallbacks {
  onTrigger: (t: Trigger) => void;
  onStatus: (id: SourceId, status: SourceStatus) => void;
}

const MIC_FFT = 1024;

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export class SensorHub {
  state: SensorState = {
    hourFloat: 0,
    minute: 0,
    second: 0,
    micLevel: 0,
    micSmooth: 0,
    micBrightness: 0.5,
    lux: null,
    lightNorm: 0.5,
    mouseX: 0.5,
    mouseY: 0.5,
    mouseSpeed: 0,
    typingRate: 0,
    scrollEnergy: 0,
    battery: null,
    charging: false,
    tiltX: 0,
    tiltY: 0,
    shake: 0,
    downlink: null,
    rtt: null,
    activity: 0,
    idleSeconds: 0,
  };

  private cb: SensorsCallbacks;
  private enabled: Partial<Record<SourceId, boolean>> = {};
  private intensity: Partial<Record<SourceId, number>> = {};

  // Микрофон.
  private micStream: MediaStream | null = null;
  private micAnalyser: AnalyserNode | null = null;
  // Буферы анализатора: явный ArrayBuffer нужен типам Web Audio в TS 5.9.
  private micTime: Uint8Array<ArrayBuffer> | null = null;
  private micFreq: Uint8Array<ArrayBuffer> | null = null;
  private micPrevLevel = 0;
  private micLastTrigger = 0;

  // Освещённость.
  private lightSensor: { stop: () => void } | null = null;

  // Мышь / клавиатура.
  private lastMouse = { x: 0.5, y: 0.5, t: 0 };
  private keyTimes: number[] = [];
  private lastInputAt = Date.now();

  // Сеть.
  private netTimer: number | null = null;
  private netPhase = 0;

  /** Отписки от событий ввода (клавиатура, мышь, скролл). */
  private inputListeners: Array<() => void> = [];
  /** Отписки от датчиков движения устройства — снимаются отдельно от ввода. */
  private motionListeners: Array<() => void> = [];

  constructor(cb: SensorsCallbacks) {
    this.cb = cb;
  }

  /** Интенсивность источника, 0..1 (0, если выключен). */
  private amt(id: SourceId) {
    return this.enabled[id] ? (this.intensity[id] ?? 0.5) : 0;
  }

  /** Обновляет набор активных источников. Вызывается при смене настроек. */
  async applySources(
    conf: Record<SourceId, { enabled: boolean; intensity: number }>,
    audioCtx: AudioContext | null,
  ) {
    const prevMic = !!this.enabled.mic;
    const prevLight = !!this.enabled.light;
    const prevMotion = !!this.enabled.motion;
    const prevBattery = !!this.enabled.battery;
    const prevNetwork = !!this.enabled.network;
    const prevPointer = !!(this.enabled.keyboard || this.enabled.mouseClick || this.enabled.mouseMove || this.enabled.scroll);

    (Object.keys(conf) as SourceId[]).forEach((id) => {
      this.enabled[id] = conf[id].enabled;
      this.intensity[id] = conf[id].intensity;
      if (!conf[id].enabled) this.cb.onStatus(id, "off");
    });

    const pointerNeeded = !!(this.enabled.keyboard || this.enabled.mouseClick || this.enabled.mouseMove || this.enabled.scroll);
    if (pointerNeeded && !prevPointer) this.attachInput();
    if (!pointerNeeded && prevPointer) this.detachInput();
    if (pointerNeeded) {
      (["keyboard", "mouseClick", "mouseMove", "scroll"] as SourceId[]).forEach((id) => {
        if (this.enabled[id]) this.cb.onStatus(id, "active");
      });
    }

    if (this.enabled.clock) this.cb.onStatus("clock", "active");

    if (this.enabled.mic && !prevMic && audioCtx) await this.startMic(audioCtx);
    if (!this.enabled.mic && prevMic) this.stopMic();

    if (this.enabled.light && !prevLight) await this.startLight();
    if (!this.enabled.light && prevLight) this.stopLight();

    if (this.enabled.motion && !prevMotion) await this.startMotion();
    if (!this.enabled.motion && prevMotion) this.stopMotion();

    if (this.enabled.battery && !prevBattery) await this.startBattery();

    if (this.enabled.network && !prevNetwork) this.startNetwork();
    if (!this.enabled.network && prevNetwork) this.stopNetwork();
  }

  /* ---------------- Микрофон ---------------- */

  private async startMic(ctx: AudioContext) {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.cb.onStatus("mic", "unsupported");
      return;
    }
    this.cb.onStatus("mic", "pending");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      this.micStream = stream;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = MIC_FFT;
      analyser.smoothingTimeConstant = 0.6;
      src.connect(analyser);
      // Analyser никуда не выводим — микрофон не попадает в динамики, обратной связи нет.
      this.micAnalyser = analyser;
      this.micTime = new Uint8Array(analyser.fftSize);
      this.micFreq = new Uint8Array(analyser.frequencyBinCount);
      this.cb.onStatus("mic", "active");
    } catch {
      this.cb.onStatus("mic", "denied");
      this.enabled.mic = false;
    }
  }

  private stopMic() {
    this.micStream?.getTracks().forEach((t) => t.stop());
    this.micStream = null;
    this.micAnalyser = null;
    this.micTime = null;
    this.micFreq = null;
    this.state.micLevel = 0;
    this.state.micSmooth = 0;
    this.cb.onStatus("mic", "off");
  }

  private readMic(now: number) {
    const a = this.micAnalyser;
    if (!a || !this.micTime || !this.micFreq) return;
    a.getByteTimeDomainData(this.micTime);
    let sum = 0;
    for (let i = 0; i < this.micTime.length; i++) {
      const v = (this.micTime[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / this.micTime.length);
    // Логарифмическая шкала: тихая комната ≈ 0.1, разговор ≈ 0.5, хлопок ≈ 1.
    const level = clamp01(Math.log10(1 + rms * 40) / Math.log10(41));
    this.state.micLevel = level;
    this.state.micSmooth += (level - this.state.micSmooth) * 0.08;

    a.getByteFrequencyData(this.micFreq);
    let weighted = 0;
    let total = 0;
    for (let i = 0; i < this.micFreq.length; i++) {
      weighted += i * this.micFreq[i];
      total += this.micFreq[i];
    }
    if (total > 0) {
      const centroid = weighted / total / this.micFreq.length;
      this.state.micBrightness += (clamp01(centroid * 3) - this.state.micBrightness) * 0.05;
    }

    // Всплеск громкости — событие (хлопок, слово, стук).
    const jump = level - this.micPrevLevel;
    const gate = 0.16 - this.amt("mic") * 0.1;
    if (jump > gate && level > 0.12 && now - this.micLastTrigger > 140) {
      this.micLastTrigger = now;
      this.cb.onTrigger({
        source: "mic",
        pitch: clamp01(this.state.micBrightness),
        velocity: clamp01(0.3 + jump * 2) * this.amt("mic"),
        pan: (Math.random() - 0.5) * 1.2,
      });
    }
    this.micPrevLevel = this.micPrevLevel + (level - this.micPrevLevel) * 0.35;
  }

  /* ---------------- Освещённость ---------------- */

  private async startLight() {
    this.cb.onStatus("light", "pending");
    const W = window as unknown as {
      AmbientLightSensor?: new (opts?: { frequency?: number }) => EventTarget & {
        illuminance: number;
        start: () => void;
        stop: () => void;
      };
    };
    if (W.AmbientLightSensor) {
      try {
        const perm = (navigator as unknown as { permissions?: { query: (d: { name: string }) => Promise<{ state: string }> } }).permissions;
        if (perm) {
          const res = await perm.query({ name: "ambient-light-sensor" }).catch(() => null);
          if (res && res.state === "denied") {
            this.cb.onStatus("light", "denied");
            this.enabled.light = false;
            return;
          }
        }
        const sensor = new W.AmbientLightSensor({ frequency: 4 });
        sensor.addEventListener("reading", () => {
          const lux = sensor.illuminance;
          this.state.lux = lux;
          // 0 лк — темнота, 1000 лк — офисный свет, 10000+ — улица.
          this.state.lightNorm = clamp01(Math.log10(1 + lux) / 4);
        });
        sensor.addEventListener("error", () => {
          this.cb.onStatus("light", "denied");
          this.enabled.light = false;
        });
        sensor.start();
        this.lightSensor = { stop: () => sensor.stop() };
        this.cb.onStatus("light", "active");
        return;
      } catch {
        /* падаем в запасной вариант ниже */
      }
    }
    // Запасной вариант: системная тема как грубая оценка освещения помещения.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      this.state.lightNorm = mq.matches ? 0.2 : 0.75;
      this.state.lux = null;
    };
    apply();
    mq.addEventListener("change", apply);
    this.lightSensor = { stop: () => mq.removeEventListener("change", apply) };
    this.cb.onStatus("light", "unsupported");
  }

  private stopLight() {
    this.lightSensor?.stop();
    this.lightSensor = null;
    this.cb.onStatus("light", "off");
  }

  /* ---------------- Клавиатура, мышь, скролл ---------------- */

  private attachInput() {
    const onKey = (e: KeyboardEvent) => {
      this.lastInputAt = Date.now();
      if (!this.enabled.keyboard || e.repeat) return;
      const now = performance.now();
      this.keyTimes.push(now);
      if (this.keyTimes.length > 12) this.keyTimes.shift();
      // Код символа выбирает ступень лада: буквы дают устойчивый «мелодический рисунок» текста.
      const code = e.key.length === 1 ? e.key.toLowerCase().charCodeAt(0) : e.keyCode || 32;
      const pitch = ((code % 24) / 24 + (e.shiftKey ? 0.3 : 0)) % 1;
      const isSpace = e.key === " ";
      this.cb.onTrigger({
        source: "keyboard",
        pitch,
        velocity: (isSpace ? 0.45 : 0.6) * this.amt("keyboard"),
        pan: (((code % 7) / 7) - 0.5) * 1.4,
      });
    };

    const onDown = (e: MouseEvent) => {
      this.lastInputAt = Date.now();
      if (!this.enabled.mouseClick) return;
      // Левая кнопка — низкий удар, правая/средняя — высокий щелчок.
      const low = e.button === 0;
      this.cb.onTrigger({
        source: "mouseClick",
        pitch: low ? 0.05 : 0.85,
        velocity: (low ? 0.85 : 0.6) * this.amt("mouseClick"),
        pan: (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 1.6,
      });
    };

    const onMove = (e: MouseEvent) => {
      this.lastInputAt = Date.now();
      const x = e.clientX / Math.max(1, window.innerWidth);
      const y = e.clientY / Math.max(1, window.innerHeight);
      const now = performance.now();
      const dt = Math.max(16, now - this.lastMouse.t);
      const dist = Math.hypot(x - this.lastMouse.x, y - this.lastMouse.y);
      this.lastMouse = { x, y, t: now };
      if (!this.enabled.mouseMove) return;
      this.state.mouseX = x;
      this.state.mouseY = y;
      const speed = clamp01((dist / dt) * 900);
      this.state.mouseSpeed = Math.max(this.state.mouseSpeed * 0.7, speed);
    };

    const onWheel = (e: WheelEvent) => {
      this.lastInputAt = Date.now();
      if (!this.enabled.scroll) return;
      const energy = clamp01(Math.abs(e.deltaY) / 400);
      this.state.scrollEnergy = clamp01(this.state.scrollEnergy * 0.6 + energy);
    };

    const onTouch = (e: TouchEvent) => {
      this.lastInputAt = Date.now();
      if (!this.enabled.mouseClick || !e.touches.length) return;
      const t = e.touches[0];
      this.cb.onTrigger({
        source: "mouseClick",
        pitch: clamp01(1 - t.clientY / Math.max(1, window.innerHeight)),
        velocity: 0.7 * this.amt("mouseClick"),
        pan: (t.clientX / Math.max(1, window.innerWidth) - 0.5) * 1.6,
      });
    };

    // Скролл страницы (не только колесо): тач-свайп и клавиши тоже двигают документ.
    const onScroll = () => {
      this.lastInputAt = Date.now();
      if (this.enabled.scroll) this.state.scrollEnergy = clamp01(this.state.scrollEnergy * 0.7 + 0.25);
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    this.inputListeners.push(() => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("scroll", onScroll);
    });
  }

  private detachInput() {
    this.inputListeners.forEach((off) => off());
    this.inputListeners = [];
  }

  /* ---------------- Батарея ---------------- */

  private async startBattery() {
    this.cb.onStatus("battery", "pending");
    const nav = navigator as unknown as {
      getBattery?: () => Promise<EventTarget & { level: number; charging: boolean }>;
    };
    if (!nav.getBattery) {
      this.cb.onStatus("battery", "unsupported");
      return;
    }
    try {
      const b = await nav.getBattery();
      const read = () => {
        this.state.battery = b.level;
        this.state.charging = b.charging;
      };
      read();
      b.addEventListener("levelchange", read);
      b.addEventListener("chargingchange", read);
      this.cb.onStatus("battery", "active");
    } catch {
      this.cb.onStatus("battery", "unsupported");
    }
  }

  /* ---------------- Движение устройства ---------------- */

  private async startMotion() {
    this.cb.onStatus("motion", "pending");
    const DOE = (window as unknown as {
      DeviceOrientationEvent?: { requestPermission?: () => Promise<string> };
    }).DeviceOrientationEvent;
    if (!DOE) {
      this.cb.onStatus("motion", "unsupported");
      this.enabled.motion = false;
      return;
    }
    if (typeof DOE.requestPermission === "function") {
      try {
        const res = await DOE.requestPermission();
        if (res !== "granted") {
          this.cb.onStatus("motion", "denied");
          this.enabled.motion = false;
          return;
        }
      } catch {
        this.cb.onStatus("motion", "denied");
        this.enabled.motion = false;
        return;
      }
    }
    const onOrient = (e: DeviceOrientationEvent) => {
      this.state.tiltX = clamp01(((e.gamma ?? 0) + 90) / 180) * 2 - 1;
      this.state.tiltY = clamp01(((e.beta ?? 0) + 180) / 360) * 2 - 1;
    };
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const mag = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0);
      // 9.8 — покой, всё выше — встряска.
      this.state.shake = clamp01(Math.abs(mag - 9.8) / 12);
    };
    window.addEventListener("deviceorientation", onOrient);
    window.addEventListener("devicemotion", onMotion);
    this.motionListeners.push(() => {
      window.removeEventListener("deviceorientation", onOrient);
      window.removeEventListener("devicemotion", onMotion);
    });
    this.cb.onStatus("motion", "active");
  }

  private stopMotion() {
    this.motionListeners.forEach((off) => off());
    this.motionListeners = [];
    this.state.tiltX = 0;
    this.state.tiltY = 0;
    this.state.shake = 0;
    this.cb.onStatus("motion", "off");
  }

  /* ---------------- Сеть ---------------- */

  private startNetwork() {
    const conn = (navigator as unknown as {
      connection?: EventTarget & { downlink?: number; rtt?: number; effectiveType?: string };
    }).connection;
    if (!conn) {
      this.cb.onStatus("network", "unsupported");
      return;
    }
    const read = () => {
      this.state.downlink = conn.downlink ?? null;
      this.state.rtt = conn.rtt ?? null;
    };
    read();
    conn.addEventListener("change", read);
    this.netTimer = window.setInterval(read, 5000);
    this.cb.onStatus("network", "active");

    // Пульс от сети: интервал зависит от задержки, тембр — от скорости.
    const tick = () => {
      if (!this.enabled.network) return;
      const rtt = this.state.rtt ?? 80;
      const down = this.state.downlink ?? 5;
      this.netPhase = (this.netPhase + 1) % 8;
      this.cb.onTrigger({
        source: "network",
        pitch: clamp01(down / 20),
        velocity: 0.35 * this.amt("network"),
        pan: this.netPhase % 2 === 0 ? -0.5 : 0.5,
      });
      this.netPulseTimer = window.setTimeout(tick, Math.max(400, Math.min(4000, rtt * 12)));
    };
    this.netPulseTimer = window.setTimeout(tick, 1200);
  }

  private netPulseTimer: number | null = null;

  private stopNetwork() {
    if (this.netTimer) window.clearInterval(this.netTimer);
    if (this.netPulseTimer) window.clearTimeout(this.netPulseTimer);
    this.netTimer = null;
    this.netPulseTimer = null;
    this.cb.onStatus("network", "off");
  }

  /* ---------------- Кадр ---------------- */

  /** Вызывается каждый кадр звуковым движком: обновляет время и затухания. */
  tick() {
    const now = performance.now();
    const d = new Date();
    this.state.hourFloat = d.getHours() + d.getMinutes() / 60;
    this.state.minute = d.getMinutes();
    this.state.second = d.getSeconds() + d.getMilliseconds() / 1000;

    if (this.enabled.mic) this.readMic(now);

    // Скорость набора: нажатий в секунду за последние 3 с.
    this.keyTimes = this.keyTimes.filter((t) => now - t < 3000);
    this.state.typingRate = clamp01(this.keyTimes.length / 15);

    this.state.mouseSpeed *= 0.92;
    this.state.scrollEnergy *= 0.94;
    this.state.idleSeconds = (Date.now() - this.lastInputAt) / 1000;
    this.state.activity = clamp01(
      this.state.typingRate * 0.5 + this.state.mouseSpeed * 0.3 + this.state.scrollEnergy * 0.2 + this.state.micSmooth * 0.3,
    );
  }

  /** Полная остановка: снимаем все подписки и отпускаем микрофон. */
  dispose() {
    this.detachInput();
    this.stopMotion();
    this.stopMic();
    this.stopLight();
    this.stopNetwork();
  }
}