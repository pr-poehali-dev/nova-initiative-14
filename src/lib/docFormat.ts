/**
 * Универсальная модель настроек оформления документа (НИР, ВКР, диплом,
 * диссертация, отчёт, публикация). Спроектирована так, чтобы кафедра любого
 * вуза могла задать свои требования: шрифт, абзац, формат страницы, поля,
 * рамка по ЕСКД, нумерация. Дефолт заточен под Уральский федеральный
 * университет (УрФУ, ИНМТ — механико-машиностроение).
 *
 * Здесь же — встроенная база вузов/кафедр с пресетами оформления.
 */

export type PageSize = "A4" | "A3" | "Letter";
export type PageOrientation = "portrait" | "landscape";
export type AlignMode = "justify" | "left";
export type EskdFrameMode = "none" | "form2" | "form2a";

/** Поля страницы в миллиметрах. */
export interface PageMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** Полный набор требований к оформлению. */
export interface DocFormat {
  /** Гарнитура шрифта. */
  fontFamily: string;
  /** Кегль основного текста, пт. */
  fontSize: number;
  /** Межстрочный интервал (1.0 / 1.15 / 1.5 / 2.0). */
  lineHeight: number;
  /** Абзацный отступ (красная строка), мм. */
  firstLineIndent: number;
  /** Выравнивание основного текста. */
  align: AlignMode;
  /** Формат страницы. */
  pageSize: PageSize;
  /** Ориентация. */
  orientation: PageOrientation;
  /** Поля страницы, мм. */
  margins: PageMargins;
  /** Рамка по ЕСКД. */
  eskdFrame: EskdFrameMode;
  /** Нумеровать страницы. */
  pageNumbers: boolean;
  /** Положение номера страницы. */
  pageNumberPos: "bottom-center" | "bottom-right" | "top-right";
  /** Заголовки разделов прописными буквами. */
  headingUppercase: boolean;
  /** Кегль заголовков, пт. */
  headingSize: number;
}

/** Пресет вуза/кафедры с настройками по умолчанию. */
export interface UniversityPreset {
  id: string;
  university: string;
  short: string;
  department: string; // институт/кафедра
  city: string;
  format: DocFormat;
}

/** Эталонное оформление по ГОСТ 7.32-2017 / ЕСКД (база УрФУ). */
export const URFU_FORMAT: DocFormat = {
  fontFamily: "Times New Roman",
  fontSize: 14,
  lineHeight: 1.5,
  firstLineIndent: 12.5,
  align: "justify",
  pageSize: "A4",
  orientation: "portrait",
  margins: { top: 20, bottom: 20, left: 30, right: 15 },
  eskdFrame: "none",
  pageNumbers: true,
  pageNumberPos: "bottom-center",
  headingUppercase: true,
  headingSize: 16,
};

export function defaultDocFormat(): DocFormat {
  return JSON.parse(JSON.stringify(URFU_FORMAT));
}

/** Доступные гарнитуры (поддерживаются Word/PDF). */
export const FONT_FAMILIES = [
  "Times New Roman",
  "Arial",
  "Calibri",
  "Liberation Serif",
  "PT Astra Serif",
  "GOST Type A",
  "GOST Type B",
];

export const LINE_HEIGHTS = [1.0, 1.15, 1.5, 2.0];
export const PAGE_SIZES: PageSize[] = ["A4", "A3", "Letter"];

/** Размеры страниц в миллиметрах (книжная ориентация). */
export const PAGE_DIMENSIONS_MM: Record<PageSize, { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
  Letter: { w: 216, h: 279 },
};

export const ESKD_FRAME_LABELS: Record<EskdFrameMode, string> = {
  none: "Без рамки",
  form2: "Форма 2 (40 мм, для листа с осн. надписью)",
  form2a: "Форма 2а (15 мм, для последующих листов)",
};

/**
 * Встроенная база вузов. УрФУ — дефолт и базовый эталон. Остальные
 * наследуют формат УрФУ, кафедра может донастроить и сохранить свой вариант.
 */
export const UNIVERSITY_PRESETS: UniversityPreset[] = [
  {
    id: "urfu-inmt",
    university: "Уральский федеральный университет имени первого Президента России Б.Н. Ельцина",
    short: "УрФУ",
    department: "Институт новых материалов и технологий (ИНМТ)",
    city: "Екатеринбург",
    format: URFU_FORMAT,
  },
  {
    id: "urfu-general",
    university: "Уральский федеральный университет имени первого Президента России Б.Н. Ельцина",
    short: "УрФУ",
    department: "Общие требования (ГОСТ 7.32-2017)",
    city: "Екатеринбург",
    format: URFU_FORMAT,
  },
  {
    id: "custom",
    university: "Другой вуз",
    short: "—",
    department: "Настроить вручную",
    city: "",
    format: URFU_FORMAT,
  },
];

export function getPreset(id: string): UniversityPreset | undefined {
  return UNIVERSITY_PRESETS.find((p) => p.id === id);
}

/** Поля по ЕСКД (рамка): слева 20, остальные 5 мм от края до рамки. */
export function applyEskdFrameMargins(fmt: DocFormat): DocFormat {
  if (fmt.eskdFrame === "none") return fmt;
  return { ...fmt, margins: { top: 5, bottom: 5, left: 20, right: 5 } };
}
