/**
 * Структура научно-исследовательской работы (НИР) по ГОСТ 7.32-2017.
 *
 * НИР хранится как набор разделов (титул, реферат, содержание, введение,
 * главы, заключение, список литературы, приложения) + метаданные титульного
 * листа + настройки оформления (DocFormat). Структура универсальна и заточена
 * под механико-машиностроительный институт, но оставляет место под смежные
 * сферы науки (любые главы/подразделы добавляются вручную).
 *
 * Здесь же — модель «дорожной карты» написания: наглядные этапы с прогрессом,
 * чтобы студенту было понятно, что и в каком порядке делать.
 */
import { type DocFormat, defaultDocFormat } from "@/lib/docFormat";

/** Тип раздела. Системные нельзя удалить, можно скрыть. */
export type SectionKind =
  | "title" // титульный лист (особый — метаданные)
  | "abstract" // реферат
  | "toc" // содержание (генерируется)
  | "intro" // введение
  | "chapter" // основная глава (можно много)
  | "conclusion" // заключение
  | "references" // список литературы
  | "appendix"; // приложения

export interface NirSection {
  id: string;
  kind: SectionKind;
  /** Заголовок раздела (для глав — редактируемый). */
  heading: string;
  /** Содержимое (markdown-подобный простой текст). */
  body: string;
  /** Включён в работу (для системных разделов — можно временно выключить). */
  enabled: boolean;
  /** Подсказка-методичка под полем. */
  hint?: string;
}

/** Метаданные титульного листа. */
export interface NirTitleMeta {
  ministry: string;
  university: string;
  institute: string; // институт
  department: string; // кафедра
  workType: string; // «Отчёт по научно-исследовательской работе»
  topic: string; // тема
  discipline: string; // дисциплина/практика
  studentName: string;
  studentGroup: string;
  supervisorName: string;
  supervisorPosition: string;
  city: string;
  year: string;
}

/** Полный документ НИР, который хранится в content (JSON). */
export interface NirDocument {
  schema: 1;
  titleMeta: NirTitleMeta;
  sections: NirSection[];
  format: DocFormat;
  /** Привязка к пресету вуза (id из docFormat.UNIVERSITY_PRESETS). */
  presetId: string;
}

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultTitleMeta(): NirTitleMeta {
  return {
    ministry: "Министерство науки и высшего образования Российской Федерации",
    university:
      "Федеральное государственное автономное образовательное учреждение высшего образования «Уральский федеральный университет имени первого Президента России Б.Н. Ельцина»",
    institute: "Институт новых материалов и технологий",
    department: "Кафедра",
    workType: "ОТЧЁТ\nо научно-исследовательской работе",
    topic: "",
    discipline: "Научно-исследовательская работа",
    studentName: "",
    studentGroup: "",
    supervisorName: "",
    supervisorPosition: "",
    city: "Екатеринбург",
    year: String(new Date().getFullYear()),
  };
}

/** Стартовый набор разделов с методическими подсказками. */
export function defaultSections(): NirSection[] {
  return [
    {
      id: uid("sec"),
      kind: "abstract",
      heading: "РЕФЕРАТ",
      body: "",
      enabled: true,
      hint: "Объём отчёта, кол-во рисунков, таблиц, источников, приложений. Перечень ключевых слов (5–15) прописными через запятую. Краткая характеристика: объект, цель, методы, результаты, область применения.",
    },
    {
      id: uid("sec"),
      kind: "intro",
      heading: "ВВЕДЕНИЕ",
      body: "",
      enabled: true,
      hint: "Актуальность темы, степень разработанности, цель и задачи НИР, объект и предмет исследования, методы, научная новизна и практическая значимость.",
    },
    {
      id: uid("sec"),
      kind: "chapter",
      heading: "1 Аналитический обзор (состояние вопроса)",
      body: "",
      enabled: true,
      hint: "Обзор литературы и существующих решений по теме. Для машиностроения: конструкции, материалы, технологии, патенты. Выявите проблему и обоснуйте направление исследования.",
    },
    {
      id: uid("sec"),
      kind: "chapter",
      heading: "2 Теоретическая (расчётная) часть",
      body: "",
      enabled: true,
      hint: "Методика, расчётные схемы, формулы, математическая или КЭ-модель. Допущения, исходные данные, граничные условия. Здесь уместны расчёты прочности, кинематики, динамики.",
    },
    {
      id: uid("sec"),
      kind: "chapter",
      heading: "3 Экспериментальная (практическая) часть",
      body: "",
      enabled: true,
      hint: "Описание эксперимента/моделирования, оборудование, результаты, таблицы, графики, анализ. Сравнение с теорией, оценка погрешности.",
    },
    {
      id: uid("sec"),
      kind: "conclusion",
      heading: "ЗАКЛЮЧЕНИЕ",
      body: "",
      enabled: true,
      hint: "Краткие выводы по каждой задаче, основные результаты, их новизна и практическая значимость, рекомендации и направления дальнейшей работы.",
    },
    {
      id: uid("sec"),
      kind: "references",
      heading: "СПИСОК ИСПОЛЬЗОВАННЫХ ИСТОЧНИКОВ",
      body: "",
      enabled: true,
      hint: "Оформление по ГОСТ Р 7.0.5-2008. Каждый источник с новой строки, нумерация сквозная. Порядок — по появлению в тексте или по алфавиту (по требованию кафедры).",
    },
    {
      id: uid("sec"),
      kind: "appendix",
      heading: "ПРИЛОЖЕНИЯ",
      body: "",
      enabled: false,
      hint: "Вспомогательный материал: листинги, чертежи, спецификации, протоколы испытаний. Обозначаются буквами А, Б, В…",
    },
  ];
}

export function createNirDocument(): NirDocument {
  return {
    schema: 1,
    titleMeta: defaultTitleMeta(),
    sections: defaultSections(),
    format: defaultDocFormat(),
    presetId: "urfu-inmt",
  };
}

/** Безопасный парсинг content из БД (строка JSON или старый plain-текст). */
export function parseNirDocument(raw: string | null | undefined): NirDocument {
  if (!raw) return createNirDocument();
  try {
    const obj = JSON.parse(raw);
    if (obj && obj.schema === 1 && Array.isArray(obj.sections)) {
      const base = createNirDocument();
      return {
        schema: 1,
        titleMeta: { ...base.titleMeta, ...(obj.titleMeta || {}) },
        sections: obj.sections.length ? obj.sections : base.sections,
        format: { ...base.format, ...(obj.format || {}) },
        presetId: obj.presetId || "urfu-inmt",
      };
    }
  } catch {
    // Старый формат — простой текст. Кладём в одну главу.
    const doc = createNirDocument();
    doc.sections = [
      {
        id: uid("sec"),
        kind: "chapter",
        heading: "Основной текст",
        body: String(raw),
        enabled: true,
      },
    ];
    return doc;
  }
  return createNirDocument();
}

export function serializeNirDocument(doc: NirDocument): string {
  return JSON.stringify(doc);
}

export function makeChapter(heading = "Новая глава"): NirSection {
  return { id: uid("sec"), kind: "chapter", heading, body: "", enabled: true };
}

// ===== Дорожная карта написания НИР =====

export interface NirRoadmapStep {
  id: string;
  title: string;
  desc: string;
  icon: string;
  /** Как проверить выполнение по документу. */
  check: (doc: NirDocument) => boolean;
}

const filled = (s?: string) => !!s && s.trim().length > 30;

export const NIR_ROADMAP: NirRoadmapStep[] = [
  {
    id: "title",
    title: "Титульный лист",
    desc: "Вуз, институт, кафедра, тема, автор, руководитель, год",
    icon: "FileSignature",
    check: (d) => !!d.titleMeta.topic.trim() && !!d.titleMeta.studentName.trim(),
  },
  {
    id: "intro",
    title: "Введение",
    desc: "Актуальность, цель, задачи, объект и предмет",
    icon: "Flag",
    check: (d) => filled(d.sections.find((s) => s.kind === "intro")?.body),
  },
  {
    id: "review",
    title: "Аналитический обзор",
    desc: "Состояние вопроса, литература, постановка проблемы",
    icon: "BookOpen",
    check: (d) => d.sections.filter((s) => s.kind === "chapter").some((s) => filled(s.body)),
  },
  {
    id: "theory",
    title: "Расчётная часть",
    desc: "Методика, модель, формулы, исходные данные",
    icon: "Calculator",
    check: (d) => d.sections.filter((s) => s.kind === "chapter" && filled(s.body)).length >= 2,
  },
  {
    id: "experiment",
    title: "Результаты",
    desc: "Эксперимент / моделирование, анализ данных",
    icon: "FlaskConical",
    check: (d) => d.sections.filter((s) => s.kind === "chapter" && filled(s.body)).length >= 3,
  },
  {
    id: "conclusion",
    title: "Заключение",
    desc: "Выводы по задачам, новизна, значимость",
    icon: "CheckCircle2",
    check: (d) => filled(d.sections.find((s) => s.kind === "conclusion")?.body),
  },
  {
    id: "references",
    title: "Список источников",
    desc: "Литература по ГОСТ Р 7.0.5-2008",
    icon: "List",
    check: (d) => filled(d.sections.find((s) => s.kind === "references")?.body),
  },
  {
    id: "format",
    title: "Оформление и экспорт",
    desc: "Настройки кафедры, выгрузка в Word/PDF",
    icon: "Download",
    check: (d) => !!d.format.fontFamily,
  },
];

export interface NirProgress {
  done: number;
  total: number;
  percent: number;
  steps: { step: NirRoadmapStep; done: boolean }[];
}

export function computeNirProgress(doc: NirDocument): NirProgress {
  const steps = NIR_ROADMAP.map((step) => ({ step, done: step.check(doc) }));
  const done = steps.filter((s) => s.done).length;
  return { done, total: steps.length, percent: Math.round((done / steps.length) * 100), steps };
}

/** Метрики документа: знаки, слова, страницы (≈1800 знаков/стр). */
export function docStats(doc: NirDocument): { chars: number; words: number; pages: number } {
  const text = doc.sections
    .filter((s) => s.enabled)
    .map((s) => s.body)
    .join(" ");
  const chars = text.length;
  const words = (text.match(/[\p{L}\p{N}]+/gu) || []).length;
  const pages = Math.max(1, Math.round(chars / 1800));
  return { chars, words, pages };
}
