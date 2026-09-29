/**
 * Конфигурация генеративного синтезатора «Живой звук устройства» (/owner/music).
 *
 * Здесь описаны источники сигналов (сенсоры), музыкальные лады, пресеты тембров
 * и структура настроек, которую страница сохраняет в localStorage. Ядро синтеза
 * (engine.ts) и сбор сигналов (sensors.ts) опираются на эти типы.
 */

/** Идентификаторы источников сигнала. */
export type SourceId =
  | "clock"
  | "mic"
  | "light"
  | "keyboard"
  | "mouseClick"
  | "mouseMove"
  | "scroll"
  | "battery"
  | "motion"
  | "network";

export interface SourceMeta {
  id: SourceId;
  /** Название для интерфейса. */
  title: string;
  /** Что именно источник делает со звуком. */
  effect: string;
  icon: string;
  /** Требуется разрешение браузера (микрофон, датчики движения). */
  needsPermission: boolean;
  /** Поддерживается не везде — показываем предупреждение. */
  limited?: boolean;
}

export const SOURCES: SourceMeta[] = [
  {
    id: "clock",
    title: "Время устройства",
    effect:
      "Часы задают тональность и лад: ночью — низкий регистр и медленный темп, днём — выше и живее. Минуты сдвигают высоту дрона, секунды управляют дыханием фильтра.",
    icon: "Clock",
    needsPermission: false,
  },
  {
    id: "mic",
    title: "Окружающий звук",
    effect:
      "Громкость комнаты поднимает общий уровень и открывает фильтр, резкие всплески (хлопок, речь) запускают ноты. Звук только анализируется, запись не ведётся.",
    icon: "Mic",
    needsPermission: true,
  },
  {
    id: "light",
    title: "Освещённость",
    effect:
      "Датчик освещённости (AmbientLightSensor) управляет яркостью тембра: темнота — глухой войлочный звук, яркий свет — открытый и звонкий.",
    icon: "Sun",
    needsPermission: true,
    limited: true,
  },
  {
    id: "keyboard",
    title: "Клавиатура",
    effect:
      "Каждое нажатие клавиши берёт ноту из текущего лада: код символа выбирает ступень, скорость набора наращивает плотность арпеджио.",
    icon: "Keyboard",
    needsPermission: false,
  },
  {
    id: "mouseClick",
    title: "Клики мыши",
    effect:
      "Клик — перкуссия: левая кнопка даёт низкий удар, правая и колесо — высокий щелчок с задержкой эха.",
    icon: "MousePointerClick",
    needsPermission: false,
  },
  {
    id: "mouseMove",
    title: "Движение мыши",
    effect:
      "Координата X ведёт панораму и частоту фильтра, Y — высоту слоя, скорость курсора добавляет шумовую текстуру.",
    icon: "Move",
    needsPermission: false,
  },
  {
    id: "scroll",
    title: "Прокрутка страницы",
    effect:
      "Скролл подмешивает шумовой свип: чем быстрее прокрутка, тем сильнее «ветер» и выше расстройка голосов.",
    icon: "MouseWheel",
    needsPermission: false,
  },
  {
    id: "battery",
    title: "Заряд батареи",
    effect:
      "Уровень заряда задаёт устойчивость строя: полный заряд — чистый строй, низкий — плавающая расстройка. Зарядка добавляет светлый обертон.",
    icon: "BatteryCharging",
    needsPermission: false,
    limited: true,
  },
  {
    id: "motion",
    title: "Движение устройства",
    effect:
      "Акселерометр и наклон качают стереополе и добавляют тремоло — заметно на ноутбуке в руках и на телефоне.",
    icon: "Smartphone",
    needsPermission: true,
    limited: true,
  },
  {
    id: "network",
    title: "Сеть",
    effect:
      "Тип соединения и задержка подмешивают ритмический пульс: медленная сеть — редкие глухие импульсы, быстрая — частые светлые.",
    icon: "Wifi",
    needsPermission: false,
    limited: true,
  },
];

/** Музыкальные лады: полутона от тоники. */
export interface ScaleMeta {
  id: string;
  title: string;
  steps: number[];
  mood: string;
}

export const SCALES: ScaleMeta[] = [
  { id: "aeolian", title: "Натуральный минор", steps: [0, 2, 3, 5, 7, 8, 10], mood: "Спокойно и сумеречно" },
  { id: "dorian", title: "Дорийский", steps: [0, 2, 3, 5, 7, 9, 10], mood: "Задумчиво, но не мрачно" },
  { id: "pentaMinor", title: "Минорная пентатоника", steps: [0, 3, 5, 7, 10], mood: "Никогда не звучит фальшиво" },
  { id: "pentaMajor", title: "Мажорная пентатоника", steps: [0, 2, 4, 7, 9], mood: "Светло и открыто" },
  { id: "lydian", title: "Лидийский", steps: [0, 2, 4, 6, 7, 9, 11], mood: "Парящий, киношный" },
  { id: "hirajoshi", title: "Хирадзёси (Япония)", steps: [0, 2, 3, 7, 8], mood: "Строгий, медитативный" },
  { id: "wholeTone", title: "Целотонный", steps: [0, 2, 4, 6, 8, 10], mood: "Зыбкий, без опоры" },
];

/** Тембровые пресеты — набор параметров осцилляторов и огибающих. */
export interface TimbreMeta {
  id: string;
  title: string;
  description: string;
  /** Формы волн голосов дрона. */
  droneWaves: OscillatorType[];
  /** Форма волны нот. */
  noteWave: OscillatorType;
  /** Время затухания ноты, с. */
  noteRelease: number;
  /** Доля шума в миксе, 0..1. */
  noise: number;
  /** Обратная связь задержки, 0..0.9. */
  feedback: number;
}

export const TIMBRES: TimbreMeta[] = [
  {
    id: "glass",
    title: "Стекло",
    description: "Чистые синусы, длинные хвосты, много эха. Подходит для фоновой работы.",
    droneWaves: ["sine", "sine", "triangle"],
    noteWave: "sine",
    noteRelease: 3.2,
    noise: 0.06,
    feedback: 0.55,
  },
  {
    id: "felt",
    title: "Войлок",
    description: "Тёплый приглушённый звук с воздухом — как приглушённое пианино в соседней комнате.",
    droneWaves: ["triangle", "sine", "sine"],
    noteWave: "triangle",
    noteRelease: 2.1,
    noise: 0.14,
    feedback: 0.4,
  },
  {
    id: "metal",
    title: "Металл",
    description: "Пилообразные голоса и жёсткий фильтр: заметно реагирует на каждое нажатие.",
    droneWaves: ["sawtooth", "triangle", "sawtooth"],
    noteWave: "sawtooth",
    noteRelease: 1.2,
    noise: 0.1,
    feedback: 0.3,
  },
  {
    id: "machine",
    title: "Машинный зал",
    description: "Низкий гул, шумовой слой и редкие импульсы — производственная атмосфера.",
    droneWaves: ["square", "sawtooth", "sine"],
    noteWave: "square",
    noteRelease: 0.8,
    noise: 0.28,
    feedback: 0.25,
  },
  {
    id: "choir",
    title: "Хор",
    description: "Расстроенные треугольники в широком стерео, медленная атака — почти вокальный слой.",
    droneWaves: ["triangle", "triangle", "triangle"],
    noteWave: "triangle",
    noteRelease: 4.5,
    noise: 0.04,
    feedback: 0.6,
  },
];

/** Настройка одного источника. */
export interface SourceSetting {
  enabled: boolean;
  /** Интенсивность влияния, 0..1. */
  intensity: number;
}

export interface MusicSettings {
  /** Общая громкость, 0..1. */
  volume: number;
  /** Тоника: MIDI-нота (48 = C3). */
  rootMidi: number;
  scaleId: string;
  timbreId: string;
  /** Базовый темп, удары в минуту (30..140). */
  bpm: number;
  /** Насколько время суток само правит тональность и темп, 0..1. */
  clockAuthority: number;
  /** Плотность нот от взаимодействия, 0..1. */
  density: number;
  /** Глубина эха, 0..1. */
  space: number;
  /** Автоматический дрон без взаимодействия. */
  droneEnabled: boolean;
  /** Ограничение пика громкости лимитером. */
  limiter: boolean;
  sources: Record<SourceId, SourceSetting>;
}

export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function midiToName(midi: number): string {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export const DEFAULT_SETTINGS: MusicSettings = {
  volume: 0.5,
  rootMidi: 45, // A2
  scaleId: "pentaMinor",
  timbreId: "glass",
  bpm: 62,
  clockAuthority: 0.7,
  density: 0.5,
  space: 0.55,
  droneEnabled: true,
  limiter: true,
  sources: {
    clock: { enabled: true, intensity: 0.8 },
    mic: { enabled: false, intensity: 0.5 },
    light: { enabled: false, intensity: 0.5 },
    keyboard: { enabled: true, intensity: 0.7 },
    mouseClick: { enabled: true, intensity: 0.6 },
    mouseMove: { enabled: true, intensity: 0.5 },
    scroll: { enabled: true, intensity: 0.4 },
    battery: { enabled: false, intensity: 0.3 },
    motion: { enabled: false, intensity: 0.4 },
    network: { enabled: false, intensity: 0.3 },
  },
};

const STORAGE_KEY = "owner_music_settings_v1";

export function loadSettings(): MusicSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<MusicSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      sources: { ...DEFAULT_SETTINGS.sources, ...(parsed.sources || {}) },
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: MusicSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* приватный режим — просто не сохраняем */
  }
}

export function getScale(id: string): ScaleMeta {
  return SCALES.find((s) => s.id === id) || SCALES[0];
}

export function getTimbre(id: string): TimbreMeta {
  return TIMBRES.find((t) => t.id === id) || TIMBRES[0];
}

/** Готовые сценарии настроек под задачу. */
export interface PresetMeta {
  id: string;
  title: string;
  description: string;
  patch: Partial<MusicSettings> & { sources?: Partial<Record<SourceId, SourceSetting>> };
}

export const PRESETS: PresetMeta[] = [
  {
    id: "focus",
    title: "Работа над чертежом",
    description: "Тихий дрон, ноты только от клавиатуры и мыши, без микрофона. Не отвлекает при длинной работе.",
    patch: {
      volume: 0.38,
      timbreId: "felt",
      scaleId: "pentaMinor",
      bpm: 54,
      density: 0.32,
      space: 0.5,
      sources: {
        clock: { enabled: true, intensity: 0.7 },
        mic: { enabled: false, intensity: 0.4 },
        light: { enabled: false, intensity: 0.4 },
        keyboard: { enabled: true, intensity: 0.45 },
        mouseClick: { enabled: true, intensity: 0.35 },
        mouseMove: { enabled: true, intensity: 0.3 },
        scroll: { enabled: true, intensity: 0.25 },
        battery: { enabled: false, intensity: 0.3 },
        motion: { enabled: false, intensity: 0.3 },
        network: { enabled: false, intensity: 0.3 },
      },
    },
  },
  {
    id: "room",
    title: "Звук комнаты",
    description: "Микрофон и освещённость ведут партию: музыка отвечает на голоса и свет вокруг.",
    patch: {
      volume: 0.5,
      timbreId: "glass",
      scaleId: "dorian",
      bpm: 66,
      density: 0.55,
      space: 0.7,
      sources: {
        clock: { enabled: true, intensity: 0.6 },
        mic: { enabled: true, intensity: 0.8 },
        light: { enabled: true, intensity: 0.7 },
        keyboard: { enabled: true, intensity: 0.4 },
        mouseClick: { enabled: true, intensity: 0.4 },
        mouseMove: { enabled: true, intensity: 0.6 },
        scroll: { enabled: false, intensity: 0.3 },
        battery: { enabled: false, intensity: 0.3 },
        motion: { enabled: true, intensity: 0.5 },
        network: { enabled: false, intensity: 0.3 },
      },
    },
  },
  {
    id: "night",
    title: "Ночная смена",
    description: "Низкий регистр, длинные хвосты, минимум событий — фон для работы после полуночи.",
    patch: {
      volume: 0.34,
      rootMidi: 38,
      timbreId: "choir",
      scaleId: "aeolian",
      bpm: 44,
      clockAuthority: 0.95,
      density: 0.25,
      space: 0.85,
      sources: {
        clock: { enabled: true, intensity: 1 },
        mic: { enabled: false, intensity: 0.3 },
        light: { enabled: true, intensity: 0.5 },
        keyboard: { enabled: true, intensity: 0.3 },
        mouseClick: { enabled: true, intensity: 0.25 },
        mouseMove: { enabled: true, intensity: 0.35 },
        scroll: { enabled: true, intensity: 0.2 },
        battery: { enabled: true, intensity: 0.3 },
        motion: { enabled: false, intensity: 0.3 },
        network: { enabled: false, intensity: 0.2 },
      },
    },
  },
  {
    id: "machine",
    title: "Машинный зал",
    description: "Жёсткий индустриальный слой: каждое нажатие слышно, сеть и батарея подмешивают импульсы.",
    patch: {
      volume: 0.45,
      rootMidi: 33,
      timbreId: "machine",
      scaleId: "wholeTone",
      bpm: 92,
      clockAuthority: 0.3,
      density: 0.8,
      space: 0.3,
      sources: {
        clock: { enabled: true, intensity: 0.3 },
        mic: { enabled: false, intensity: 0.4 },
        light: { enabled: false, intensity: 0.4 },
        keyboard: { enabled: true, intensity: 0.95 },
        mouseClick: { enabled: true, intensity: 0.9 },
        mouseMove: { enabled: true, intensity: 0.7 },
        scroll: { enabled: true, intensity: 0.7 },
        battery: { enabled: true, intensity: 0.6 },
        motion: { enabled: false, intensity: 0.4 },
        network: { enabled: true, intensity: 0.7 },
      },
    },
  },
];
