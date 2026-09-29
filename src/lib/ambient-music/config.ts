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
  { id: "blues", title: "Блюзовая", steps: [0, 3, 5, 6, 7, 10], mood: "Грязный грув, бар, рок-н-ролл" },
  { id: "mixolydian", title: "Миксолидийский", steps: [0, 2, 4, 5, 7, 9, 10], mood: "Фанк и соул, мажор с характером" },
  { id: "dorian", title: "Дорийский", steps: [0, 2, 3, 5, 7, 9, 10], mood: "Классика фанка и хауса" },
  { id: "pentaMinor", title: "Минорная пентатоника", steps: [0, 3, 5, 7, 10], mood: "Никогда не звучит фальшиво" },
  { id: "pentaMajor", title: "Мажорная пентатоника", steps: [0, 2, 4, 7, 9], mood: "Светло и открыто" },
  { id: "phrygianDom", title: "Фригийский доминантовый", steps: [0, 1, 4, 5, 7, 8, 10], mood: "Пряный южный колорит" },
  { id: "aeolian", title: "Натуральный минор", steps: [0, 2, 3, 5, 7, 8, 10], mood: "Спокойно и сумеречно" },
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
  /** Форма волны басовой линии. */
  bassWave: OscillatorType;
  /** Длительность басовой ноты в долях шага (0.3 — короткий отрывистый, 1 — залигованный). */
  bassLength: number;
  /** Насыщение (перегруз) тембра, 0..1 — даёт «мясо» и громкость без потери динамики. */
  drive: number;
  /** Характер барабанов: сухой клуб / тёплый винтаж / электронный. */
  drumKit: "club" | "vintage" | "electro";
}

export const TIMBRES: TimbreMeta[] = [
  {
    id: "tap",
    title: "Разливной кран",
    description:
      "Фанковый грув для торгового зала: упругий бас, сухой бит, короткие отрывистые ноты. Основной тембр магазина.",
    droneWaves: ["sawtooth", "triangle", "square"],
    noteWave: "square",
    noteRelease: 0.42,
    noise: 0.12,
    feedback: 0.22,
    bassWave: "sawtooth",
    bassLength: 0.42,
    drive: 0.45,
    drumKit: "club",
  },
  {
    id: "smokehouse",
    title: "Коптильня",
    description:
      "Тёплый винтажный соул: ламповый бас, мягкие щётки по барабанам, дымный характер. Для неспешного дня.",
    droneWaves: ["triangle", "sine", "triangle"],
    noteWave: "triangle",
    noteRelease: 0.9,
    noise: 0.16,
    feedback: 0.34,
    bassWave: "triangle",
    bassLength: 0.6,
    drive: 0.3,
    drumKit: "vintage",
  },
  {
    id: "neon",
    title: "Неон",
    description:
      "Электронный диско-хаус: плотный синтезаторный бас, ровная бочка, яркие стабы. Для вечера и выходных.",
    droneWaves: ["sawtooth", "sawtooth", "square"],
    noteWave: "sawtooth",
    noteRelease: 0.55,
    noise: 0.08,
    feedback: 0.4,
    bassWave: "square",
    bassLength: 0.5,
    drive: 0.55,
    drumKit: "electro",
  },
  {
    id: "garage",
    title: "Гараж",
    description:
      "Сырой рок-н-ролльный драйв: перегруженный бас, жёсткий бит, грязные ноты. Максимум энергии.",
    droneWaves: ["sawtooth", "square", "sawtooth"],
    noteWave: "sawtooth",
    noteRelease: 0.35,
    noise: 0.22,
    feedback: 0.18,
    bassWave: "sawtooth",
    bassLength: 0.35,
    drive: 0.8,
    drumKit: "club",
  },
  {
    id: "glass",
    title: "Стекло",
    description: "Чистые синусы, длинные хвосты, много эха. Спокойный фон без ритма — для уборки и закрытия.",
    droneWaves: ["sine", "sine", "triangle"],
    noteWave: "sine",
    noteRelease: 3.2,
    noise: 0.06,
    feedback: 0.55,
    bassWave: "sine",
    bassLength: 0.9,
    drive: 0,
    drumKit: "vintage",
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
    bassWave: "sine",
    bassLength: 0.8,
    drive: 0.1,
    drumKit: "vintage",
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
    bassWave: "square",
    bassLength: 0.5,
    drive: 0.5,
    drumKit: "electro",
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

  /** Ритм-секция: барабаны держат пульс зала. */
  drumsEnabled: boolean;
  /** Громкость барабанов, 0..1. */
  drumsLevel: number;
  /** Рисунок бита. */
  patternId: string;
  /** Басовая линия под грув. */
  bassEnabled: boolean;
  /** Громкость баса, 0..1. */
  bassLevel: number;
  /** Свинг: смещение слабых долей, 0 — ровно, 1 — максимальное качание. */
  swing: number;
  /** Перегруз/насыщение общего микса, 0..1 — добавляет плотность и энергию. */
  drive: number;
  /** Автоматическое усложнение: каждые 8 тактов рисунок меняется. */
  evolve: boolean;

  sources: Record<SourceId, SourceSetting>;
}

/** Рисунки ритма: по 16 шагов (два такта 4/4 по восьмым). */
export interface PatternMeta {
  id: string;
  title: string;
  description: string;
  /** 1 — удар, 0 — пауза. */
  kick: number[];
  snare: number[];
  hat: number[];
  /** Ступени баса по шагам: null — пауза, число — ступень лада. */
  bass: Array<number | null>;
}

export const PATTERNS: PatternMeta[] = [
  {
    id: "fourFloor",
    title: "Ровная бочка",
    description: "Бочка на каждую долю, хэт на слабые. Универсальный танцевальный пульс — держит темп зала.",
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    bass: [0, null, 0, null, 4, null, 0, null, 0, null, 3, null, 4, null, 2, null],
  },
  {
    id: "funk",
    title: "Фанковый",
    description: "Синкопы и призрачные ноты — самый «живой» рисунок. Хорош для дневного зала.",
    kick: [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    hat: [1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0],
    bass: [0, null, 3, 0, null, null, 5, null, 0, null, 3, null, 4, 3, null, 0],
  },
  {
    id: "shuffle",
    title: "Шаффл",
    description: "Ковыляющий блюзовый грув с сильным свингом — атмосфера бара и пивной.",
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1],
    bass: [0, null, null, 4, null, 5, 0, null, 0, null, null, 4, null, 5, 6, null],
  },
  {
    id: "halfTime",
    title: "Полутемп",
    description: "Редкий тяжёлый бит: снейр только на третью долю. Спокойно, но с весом — для утра и вечера.",
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    bass: [0, null, null, null, 3, null, null, null, 0, null, null, null, 4, null, null, null],
  },
  {
    id: "disco",
    title: "Диско",
    description: "Открытый хэт на слабые доли и подвижный бас-октава — вечерний драйв выходного дня.",
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    bass: [0, 7, 0, 7, 3, 7, 3, 7, 0, 7, 0, 7, 4, 7, 4, 7],
  },
];

export function getPattern(id: string): PatternMeta {
  return PATTERNS.find((p) => p.id === id) || PATTERNS[0];
}

export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function midiToName(midi: number): string {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export const DEFAULT_SETTINGS: MusicSettings = {
  volume: 0.55,
  rootMidi: 41, // F2 — низкая опора для баса
  scaleId: "dorian",
  timbreId: "tap",
  bpm: 104,
  clockAuthority: 0.45,
  density: 0.62,
  space: 0.32,
  droneEnabled: true,
  limiter: true,
  drumsEnabled: true,
  drumsLevel: 0.7,
  patternId: "funk",
  bassEnabled: true,
  bassLevel: 0.75,
  swing: 0.35,
  drive: 0.45,
  evolve: true,
  sources: {
    clock: { enabled: true, intensity: 0.5 },
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

// v2: добавлены ритм-секция, бас и грув — старые сохранённые настройки
// (медитативный пресет) намеренно не подхватываем, чтобы сервис сразу звучал бодро.
const STORAGE_KEY = "owner_music_settings_v2";

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


/** Полный набор источников для пресета — чтобы не тянуть хвосты прошлого сценария. */
function srcs(
  on: Partial<Record<SourceId, number>>,
): Record<SourceId, SourceSetting> {
  const all: SourceId[] = [
    "clock", "mic", "light", "keyboard", "mouseClick",
    "mouseMove", "scroll", "battery", "motion", "network",
  ];
  return all.reduce((acc, id) => {
    const v = on[id];
    acc[id] = v === undefined ? { enabled: false, intensity: 0.4 } : { enabled: true, intensity: v };
    return acc;
  }, {} as Record<SourceId, SourceSetting>);
}

export const PRESETS: PresetMeta[] = [
  {
    id: "shopDay",
    title: "Торговый зал · день",
    description:
      "Базовый режим магазина: упругий фанк, живой бас и сухой бит. Бодро, но не давит — покупатель слышит продавца.",
    patch: {
      volume: 0.5,
      rootMidi: 41,
      scaleId: "dorian",
      timbreId: "tap",
      bpm: 104,
      clockAuthority: 0.4,
      density: 0.6,
      space: 0.3,
      drumsEnabled: true,
      drumsLevel: 0.62,
      patternId: "funk",
      bassEnabled: true,
      bassLevel: 0.75,
      swing: 0.38,
      drive: 0.45,
      evolve: true,
      droneEnabled: true,
      sources: srcs({ clock: 0.4, keyboard: 0.6, mouseClick: 0.6, mouseMove: 0.45, scroll: 0.35 }),
    },
  },
  {
    id: "rushHour",
    title: "Час пик · вечер буднего дня",
    description:
      "Люди идут с работы за пивом: темп выше, бочка ровная, бас плотный. Держит поток и поднимает средний чек.",
    patch: {
      volume: 0.58,
      rootMidi: 40,
      scaleId: "mixolydian",
      timbreId: "neon",
      bpm: 118,
      clockAuthority: 0.25,
      density: 0.72,
      space: 0.35,
      drumsEnabled: true,
      drumsLevel: 0.78,
      patternId: "fourFloor",
      bassEnabled: true,
      bassLevel: 0.82,
      swing: 0.18,
      drive: 0.55,
      evolve: true,
      droneEnabled: true,
      sources: srcs({ clock: 0.3, mic: 0.5, keyboard: 0.6, mouseClick: 0.65, mouseMove: 0.5, scroll: 0.4 }),
    },
  },
  {
    id: "beerBar",
    title: "Пивная · шаффл",
    description:
      "Атмосфера бара под разливное: блюзовый шаффл с сильным свингом, ламповый бас. Гости задерживаются у стойки.",
    patch: {
      volume: 0.52,
      rootMidi: 40,
      scaleId: "blues",
      timbreId: "smokehouse",
      bpm: 96,
      clockAuthority: 0.35,
      density: 0.58,
      space: 0.4,
      drumsEnabled: true,
      drumsLevel: 0.66,
      patternId: "shuffle",
      bassEnabled: true,
      bassLevel: 0.78,
      swing: 0.66,
      drive: 0.38,
      evolve: true,
      droneEnabled: true,
      sources: srcs({ clock: 0.45, mic: 0.45, keyboard: 0.55, mouseClick: 0.55, mouseMove: 0.45 }),
    },
  },
  {
    id: "weekend",
    title: "Выходные · диско",
    description:
      "Максимальный драйв для пятницы и субботы: диско-бит, октавный бас, яркий верх. Праздничное настроение зала.",
    patch: {
      volume: 0.6,
      rootMidi: 41,
      scaleId: "mixolydian",
      timbreId: "neon",
      bpm: 124,
      clockAuthority: 0.15,
      density: 0.8,
      space: 0.42,
      drumsEnabled: true,
      drumsLevel: 0.82,
      patternId: "disco",
      bassEnabled: true,
      bassLevel: 0.85,
      swing: 0.12,
      drive: 0.6,
      evolve: true,
      droneEnabled: true,
      sources: srcs({ clock: 0.2, mic: 0.55, keyboard: 0.6, mouseClick: 0.7, mouseMove: 0.55, scroll: 0.45 }),
    },
  },
  {
    id: "opening",
    title: "День открытия",
    description:
      "Громко и празднично: рок-н-ролльный драйв гаража, жёсткий бит. Для дня запуска и акций у входа.",
    patch: {
      volume: 0.65,
      rootMidi: 40,
      scaleId: "blues",
      timbreId: "garage",
      bpm: 128,
      clockAuthority: 0.1,
      density: 0.85,
      space: 0.28,
      drumsEnabled: true,
      drumsLevel: 0.88,
      patternId: "fourFloor",
      bassEnabled: true,
      bassLevel: 0.9,
      swing: 0.2,
      drive: 0.78,
      evolve: true,
      droneEnabled: true,
      sources: srcs({ clock: 0.15, mic: 0.6, keyboard: 0.7, mouseClick: 0.8, mouseMove: 0.6, scroll: 0.5 }),
    },
  },
  {
    id: "morning",
    title: "Утро · выкладка товара",
    description:
      "Магазин ещё не открылся: тёплый полутемп, мягкие щётки, неспешный бас. Приятно работать, не мешает считать.",
    patch: {
      volume: 0.42,
      rootMidi: 41,
      scaleId: "dorian",
      timbreId: "smokehouse",
      bpm: 84,
      clockAuthority: 0.5,
      density: 0.42,
      space: 0.45,
      drumsEnabled: true,
      drumsLevel: 0.48,
      patternId: "halfTime",
      bassEnabled: true,
      bassLevel: 0.6,
      swing: 0.45,
      drive: 0.25,
      evolve: true,
      droneEnabled: true,
      sources: srcs({ clock: 0.6, keyboard: 0.5, mouseClick: 0.45, mouseMove: 0.4 }),
    },
  },
  {
    id: "closing",
    title: "Закрытие · уборка",
    description:
      "Тихий фон без ритма: гости ушли, остаётся мягкий дрон. Сигнал «мы закрываемся» без объявлений.",
    patch: {
      volume: 0.32,
      rootMidi: 45,
      scaleId: "pentaMinor",
      timbreId: "glass",
      bpm: 58,
      clockAuthority: 0.8,
      density: 0.3,
      space: 0.7,
      drumsEnabled: false,
      drumsLevel: 0.4,
      patternId: "halfTime",
      bassEnabled: false,
      bassLevel: 0.5,
      swing: 0.3,
      drive: 0.1,
      evolve: false,
      droneEnabled: true,
      sources: srcs({ clock: 0.8, keyboard: 0.35, mouseClick: 0.3, mouseMove: 0.3 }),
    },
  },
];
