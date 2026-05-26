/**
 * Каталог стандартных сечений CAE — ГОСТ 8239-89 (двутавры),
 * ГОСТ 8240-97 (швеллеры), ГОСТ 8509-93 (уголки), ГОСТ 10704-91 (трубы).
 *
 * Все величины в СИ: A [м²], I [м⁴], W [м³], h [м].
 *
 * Также — параметрические конструкторы сечений (прямоугольник, круг,
 * прямоугольная труба), считающие геометрические характеристики «на лету».
 */
import type { SectionCatalogEntry } from "./cae-catalog-types";

/**
 * Двутавры по ГОСТ 8239-89 (типовые номера).
 * h — высота, b — ширина полки, t_w — толщина стенки, t_f — средняя толщина полки.
 */
export const I_BEAMS_8239: SectionCatalogEntry[] = [
  { id: "I10",  name: "Двутавр I10 ГОСТ 8239-89",  type: "i_beam", category: "i_8239", gost: "ГОСТ 8239-89",
    h: 0.100, A: 12.0e-4, I_z: 198e-8, W_z: 39.7e-6, I_y: 17.9e-8, W_y: 6.49e-6, I_t: 0.4e-8,
    shear_area_y: 6.0e-4, shear_area_z: 8.4e-4 },
  { id: "I12",  name: "Двутавр I12 ГОСТ 8239-89",  type: "i_beam", category: "i_8239", gost: "ГОСТ 8239-89",
    h: 0.120, A: 14.7e-4, I_z: 350e-8, W_z: 58.4e-6, I_y: 27.9e-8, W_y: 8.72e-6, I_t: 0.6e-8,
    shear_area_y: 7.35e-4, shear_area_z: 10.3e-4 },
  { id: "I14",  name: "Двутавр I14 ГОСТ 8239-89",  type: "i_beam", category: "i_8239", gost: "ГОСТ 8239-89",
    h: 0.140, A: 17.4e-4, I_z: 572e-8, W_z: 81.7e-6, I_y: 41.9e-8, W_y: 11.5e-6, I_t: 0.8e-8,
    shear_area_y: 8.7e-4, shear_area_z: 12.2e-4 },
  { id: "I16",  name: "Двутавр I16 ГОСТ 8239-89",  type: "i_beam", category: "i_8239", gost: "ГОСТ 8239-89",
    h: 0.160, A: 20.2e-4, I_z: 873e-8, W_z: 109e-6, I_y: 58.6e-8, W_y: 14.5e-6, I_t: 1.0e-8,
    shear_area_y: 10.1e-4, shear_area_z: 14.1e-4 },
  { id: "I18",  name: "Двутавр I18 ГОСТ 8239-89",  type: "i_beam", category: "i_8239", gost: "ГОСТ 8239-89",
    h: 0.180, A: 23.4e-4, I_z: 1290e-8, W_z: 143e-6, I_y: 82.6e-8, W_y: 18.4e-6, I_t: 1.4e-8,
    shear_area_y: 11.7e-4, shear_area_z: 16.4e-4 },
  { id: "I20",  name: "Двутавр I20 ГОСТ 8239-89",  type: "i_beam", category: "i_8239", gost: "ГОСТ 8239-89",
    h: 0.200, A: 26.8e-4, I_z: 1840e-8, W_z: 184e-6, I_y: 115e-8, W_y: 23.1e-6, I_t: 1.8e-8,
    shear_area_y: 13.4e-4, shear_area_z: 18.7e-4 },
  { id: "I22",  name: "Двутавр I22 ГОСТ 8239-89",  type: "i_beam", category: "i_8239", gost: "ГОСТ 8239-89",
    h: 0.220, A: 30.6e-4, I_z: 2550e-8, W_z: 232e-6, I_y: 157e-8, W_y: 28.6e-6, I_t: 2.3e-8,
    shear_area_y: 15.3e-4, shear_area_z: 21.4e-4 },
  { id: "I24",  name: "Двутавр I24 ГОСТ 8239-89",  type: "i_beam", category: "i_8239", gost: "ГОСТ 8239-89",
    h: 0.240, A: 34.8e-4, I_z: 3460e-8, W_z: 289e-6, I_y: 198e-8, W_y: 34.5e-6, I_t: 2.8e-8,
    shear_area_y: 17.4e-4, shear_area_z: 24.4e-4 },
  { id: "I27",  name: "Двутавр I27 ГОСТ 8239-89",  type: "i_beam", category: "i_8239", gost: "ГОСТ 8239-89",
    h: 0.270, A: 40.2e-4, I_z: 5010e-8, W_z: 371e-6, I_y: 260e-8, W_y: 41.5e-6, I_t: 3.7e-8,
    shear_area_y: 20.1e-4, shear_area_z: 28.1e-4 },
  { id: "I30",  name: "Двутавр I30 ГОСТ 8239-89",  type: "i_beam", category: "i_8239", gost: "ГОСТ 8239-89",
    h: 0.300, A: 46.5e-4, I_z: 7080e-8, W_z: 472e-6, I_y: 337e-8, W_y: 49.9e-6, I_t: 4.9e-8,
    shear_area_y: 23.3e-4, shear_area_z: 32.6e-4 },
  { id: "I36",  name: "Двутавр I36 ГОСТ 8239-89",  type: "i_beam", category: "i_8239", gost: "ГОСТ 8239-89",
    h: 0.360, A: 61.9e-4, I_z: 13380e-8, W_z: 743e-6, I_y: 516e-8, W_y: 71.1e-6, I_t: 8.6e-8,
    shear_area_y: 31.0e-4, shear_area_z: 43.3e-4 },
  { id: "I40",  name: "Двутавр I40 ГОСТ 8239-89",  type: "i_beam", category: "i_8239", gost: "ГОСТ 8239-89",
    h: 0.400, A: 72.6e-4, I_z: 19062e-8, W_z: 953e-6, I_y: 667e-8, W_y: 86.1e-6, I_t: 11.2e-8,
    shear_area_y: 36.3e-4, shear_area_z: 50.8e-4 },
  { id: "I45",  name: "Двутавр I45 ГОСТ 8239-89",  type: "i_beam", category: "i_8239", gost: "ГОСТ 8239-89",
    h: 0.450, A: 84.7e-4, I_z: 27696e-8, W_z: 1231e-6, I_y: 808e-8, W_y: 101e-6, I_t: 13.6e-8,
    shear_area_y: 42.4e-4, shear_area_z: 59.3e-4 },
  { id: "I50",  name: "Двутавр I50 ГОСТ 8239-89",  type: "i_beam", category: "i_8239", gost: "ГОСТ 8239-89",
    h: 0.500, A: 100e-4, I_z: 39727e-8, W_z: 1589e-6, I_y: 1043e-8, W_y: 123e-6, I_t: 18.0e-8,
    shear_area_y: 50.0e-4, shear_area_z: 70.0e-4 },
  { id: "I60",  name: "Двутавр I60 ГОСТ 8239-89",  type: "i_beam", category: "i_8239", gost: "ГОСТ 8239-89",
    h: 0.600, A: 138e-4, I_z: 76806e-8, W_z: 2560e-6, I_y: 1725e-8, W_y: 182e-6, I_t: 31.0e-8,
    shear_area_y: 69.0e-4, shear_area_z: 96.6e-4 },
];

/** Швеллеры по ГОСТ 8240-97 (с уклоном внутренних граней полок) */
export const CHANNELS_8240: SectionCatalogEntry[] = [
  { id: "U5",   name: "Швеллер 5П ГОСТ 8240-97",   type: "channel", category: "u_8240", gost: "ГОСТ 8240-97",
    h: 0.050, A: 6.16e-4, I_z: 22.8e-8, W_z: 9.10e-6, I_y: 5.61e-8, W_y: 2.75e-6, I_t: 0.17e-8 },
  { id: "U8",   name: "Швеллер 8П ГОСТ 8240-97",   type: "channel", category: "u_8240", gost: "ГОСТ 8240-97",
    h: 0.080, A: 8.98e-4, I_z: 89.4e-8, W_z: 22.4e-6, I_y: 12.8e-8, W_y: 4.75e-6, I_t: 0.30e-8 },
  { id: "U10",  name: "Швеллер 10П ГОСТ 8240-97",  type: "channel", category: "u_8240", gost: "ГОСТ 8240-97",
    h: 0.100, A: 10.9e-4, I_z: 174e-8, W_z: 34.8e-6, I_y: 20.4e-8, W_y: 6.46e-6, I_t: 0.42e-8 },
  { id: "U12",  name: "Швеллер 12П ГОСТ 8240-97",  type: "channel", category: "u_8240", gost: "ГОСТ 8240-97",
    h: 0.120, A: 13.3e-4, I_z: 304e-8, W_z: 50.6e-6, I_y: 31.2e-8, W_y: 8.52e-6, I_t: 0.60e-8 },
  { id: "U14",  name: "Швеллер 14П ГОСТ 8240-97",  type: "channel", category: "u_8240", gost: "ГОСТ 8240-97",
    h: 0.140, A: 15.6e-4, I_z: 491e-8, W_z: 70.2e-6, I_y: 45.4e-8, W_y: 11.0e-6, I_t: 0.84e-8 },
  { id: "U16",  name: "Швеллер 16П ГОСТ 8240-97",  type: "channel", category: "u_8240", gost: "ГОСТ 8240-97",
    h: 0.160, A: 18.1e-4, I_z: 747e-8, W_z: 93.4e-6, I_y: 63.3e-8, W_y: 13.8e-6, I_t: 1.16e-8 },
  { id: "U18",  name: "Швеллер 18П ГОСТ 8240-97",  type: "channel", category: "u_8240", gost: "ГОСТ 8240-97",
    h: 0.180, A: 20.7e-4, I_z: 1090e-8, W_z: 121e-6, I_y: 86.0e-8, W_y: 17.0e-6, I_t: 1.55e-8 },
  { id: "U20",  name: "Швеллер 20П ГОСТ 8240-97",  type: "channel", category: "u_8240", gost: "ГОСТ 8240-97",
    h: 0.200, A: 23.4e-4, I_z: 1520e-8, W_z: 152e-6, I_y: 113e-8, W_y: 20.5e-6, I_t: 2.04e-8 },
  { id: "U22",  name: "Швеллер 22П ГОСТ 8240-97",  type: "channel", category: "u_8240", gost: "ГОСТ 8240-97",
    h: 0.220, A: 26.7e-4, I_z: 2110e-8, W_z: 192e-6, I_y: 151e-8, W_y: 25.1e-6, I_t: 2.67e-8 },
  { id: "U24",  name: "Швеллер 24П ГОСТ 8240-97",  type: "channel", category: "u_8240", gost: "ГОСТ 8240-97",
    h: 0.240, A: 30.6e-4, I_z: 2900e-8, W_z: 242e-6, I_y: 208e-8, W_y: 31.6e-6, I_t: 3.61e-8 },
  { id: "U27",  name: "Швеллер 27П ГОСТ 8240-97",  type: "channel", category: "u_8240", gost: "ГОСТ 8240-97",
    h: 0.270, A: 35.2e-4, I_z: 4160e-8, W_z: 308e-6, I_y: 262e-8, W_y: 37.3e-6, I_t: 4.50e-8 },
  { id: "U30",  name: "Швеллер 30П ГОСТ 8240-97",  type: "channel", category: "u_8240", gost: "ГОСТ 8240-97",
    h: 0.300, A: 40.5e-4, I_z: 5810e-8, W_z: 387e-6, I_y: 327e-8, W_y: 43.6e-6, I_t: 5.61e-8 },
];

/** Уголки равнополочные по ГОСТ 8509-93 (выборка) */
export const ANGLES_8509: SectionCatalogEntry[] = [
  { id: "L50x5",   name: "Уголок 50×5 ГОСТ 8509-93",   type: "angle_eq", category: "l_8509", gost: "ГОСТ 8509-93",
    h: 0.050, A: 4.80e-4, I_z: 11.2e-8, W_z: 3.13e-6, I_y: 11.2e-8, W_y: 3.13e-6, I_t: 0.04e-8 },
  { id: "L63x6",   name: "Уголок 63×6 ГОСТ 8509-93",   type: "angle_eq", category: "l_8509", gost: "ГОСТ 8509-93",
    h: 0.063, A: 7.28e-4, I_z: 27.1e-8, W_z: 5.95e-6, I_y: 27.1e-8, W_y: 5.95e-6, I_t: 0.09e-8 },
  { id: "L75x6",   name: "Уголок 75×6 ГОСТ 8509-93",   type: "angle_eq", category: "l_8509", gost: "ГОСТ 8509-93",
    h: 0.075, A: 8.78e-4, I_z: 46.6e-8, W_z: 8.57e-6, I_y: 46.6e-8, W_y: 8.57e-6, I_t: 0.11e-8 },
  { id: "L75x8",   name: "Уголок 75×8 ГОСТ 8509-93",   type: "angle_eq", category: "l_8509", gost: "ГОСТ 8509-93",
    h: 0.075, A: 11.5e-4, I_z: 59.8e-8, W_z: 11.1e-6, I_y: 59.8e-8, W_y: 11.1e-6, I_t: 0.25e-8 },
  { id: "L100x8",  name: "Уголок 100×8 ГОСТ 8509-93",  type: "angle_eq", category: "l_8509", gost: "ГОСТ 8509-93",
    h: 0.100, A: 15.6e-4, I_z: 147e-8, W_z: 20.0e-6, I_y: 147e-8, W_y: 20.0e-6, I_t: 0.34e-8 },
  { id: "L100x10", name: "Уголок 100×10 ГОСТ 8509-93", type: "angle_eq", category: "l_8509", gost: "ГОСТ 8509-93",
    h: 0.100, A: 19.2e-4, I_z: 179e-8, W_z: 24.7e-6, I_y: 179e-8, W_y: 24.7e-6, I_t: 0.64e-8 },
  { id: "L125x10", name: "Уголок 125×10 ГОСТ 8509-93", type: "angle_eq", category: "l_8509", gost: "ГОСТ 8509-93",
    h: 0.125, A: 24.3e-4, I_z: 363e-8, W_z: 39.5e-6, I_y: 363e-8, W_y: 39.5e-6, I_t: 0.81e-8 },
  { id: "L160x12", name: "Уголок 160×12 ГОСТ 8509-93", type: "angle_eq", category: "l_8509", gost: "ГОСТ 8509-93",
    h: 0.160, A: 37.4e-4, I_z: 913e-8, W_z: 78.5e-6, I_y: 913e-8, W_y: 78.5e-6, I_t: 1.79e-8 },
];

/** Трубы круглые по ГОСТ 10704-91 (выборка) */
export const PIPES_ROUND_10704: SectionCatalogEntry[] = [
  { id: "PIPE57x4",   name: "Труба ⌀57×4 ГОСТ 10704-91",   type: "pipe_round", category: "pipe_round", gost: "ГОСТ 10704-91",
    h: 0.057, A: 6.66e-4, I_z: 23.5e-8, W_z: 8.23e-6, I_y: 23.5e-8, W_y: 8.23e-6, I_t: 47.0e-8 },
  { id: "PIPE76x5",   name: "Труба ⌀76×5 ГОСТ 10704-91",   type: "pipe_round", category: "pipe_round", gost: "ГОСТ 10704-91",
    h: 0.076, A: 11.2e-4, I_z: 70.5e-8, W_z: 18.5e-6, I_y: 70.5e-8, W_y: 18.5e-6, I_t: 141e-8 },
  { id: "PIPE89x5",   name: "Труба ⌀89×5 ГОСТ 10704-91",   type: "pipe_round", category: "pipe_round", gost: "ГОСТ 10704-91",
    h: 0.089, A: 13.2e-4, I_z: 117e-8, W_z: 26.2e-6, I_y: 117e-8, W_y: 26.2e-6, I_t: 233e-8 },
  { id: "PIPE108x5",  name: "Труба ⌀108×5 ГОСТ 10704-91",  type: "pipe_round", category: "pipe_round", gost: "ГОСТ 10704-91",
    h: 0.108, A: 16.2e-4, I_z: 217e-8, W_z: 40.2e-6, I_y: 217e-8, W_y: 40.2e-6, I_t: 434e-8 },
  { id: "PIPE159x6",  name: "Труба ⌀159×6 ГОСТ 10704-91",  type: "pipe_round", category: "pipe_round", gost: "ГОСТ 10704-91",
    h: 0.159, A: 28.8e-4, I_z: 851e-8, W_z: 107e-6, I_y: 851e-8, W_y: 107e-6, I_t: 1700e-8 },
];

export const SECTION_CATALOG: SectionCatalogEntry[] = [
  ...I_BEAMS_8239,
  ...CHANNELS_8240,
  ...ANGLES_8509,
  ...PIPES_ROUND_10704,
];

export const SECTION_GROUPS = [
  { id: "i_8239",     name: "Двутавры ГОСТ 8239-89",     items: I_BEAMS_8239 },
  { id: "u_8240",     name: "Швеллеры ГОСТ 8240-97",     items: CHANNELS_8240 },
  { id: "l_8509",     name: "Уголки ГОСТ 8509-93",       items: ANGLES_8509 },
  { id: "pipe_round", name: "Трубы круглые ГОСТ 10704",  items: PIPES_ROUND_10704 },
];

export function findSection(id: string): SectionCatalogEntry | null {
  return SECTION_CATALOG.find((s) => s.id === id) || null;
}

// ============================================================
// ПАРАМЕТРИЧЕСКИЕ СЕЧЕНИЯ — считают геометрию «на лету»
// ============================================================

/** Прямоугольник b×h. Размеры в метрах. */
export function makeRectSection(b: number, h: number, id?: string, name?: string): SectionCatalogEntry {
  const A = b * h;
  const I_z = (b * h ** 3) / 12;
  const I_y = (h * b ** 3) / 12;
  const W_z = (b * h ** 2) / 6;
  const W_y = (h * b ** 2) / 6;
  // момент инерции при кручении прямоугольника (Saint-Venant приближение)
  const a = Math.max(b, h) / 2;
  const c = Math.min(b, h) / 2;
  const I_t = a * c ** 3 * (16 / 3 - 3.36 * (c / a) * (1 - c ** 4 / (12 * a ** 4)));
  return {
    id: id || `RECT_${(b * 1000).toFixed(0)}x${(h * 1000).toFixed(0)}`,
    name: name || `Прямоугольник ${(b * 1000).toFixed(0)}×${(h * 1000).toFixed(0)} мм`,
    type: "rect_solid",
    category: "custom_rect",
    h, A, I_z, I_y, W_z, W_y, I_t,
    shear_area_y: A * 5 / 6,
    shear_area_z: A * 5 / 6,
  };
}

/** Круг диаметром d. d в метрах. */
export function makeCircleSection(d: number, id?: string, name?: string): SectionCatalogEntry {
  const A = (Math.PI * d ** 2) / 4;
  const I = (Math.PI * d ** 4) / 64;
  const W = (Math.PI * d ** 3) / 32;
  const I_t = (Math.PI * d ** 4) / 32;
  return {
    id: id || `CIRC_${(d * 1000).toFixed(0)}`,
    name: name || `Круг ⌀${(d * 1000).toFixed(0)} мм`,
    type: "circle_solid",
    category: "custom_circle",
    h: d, A, I_z: I, I_y: I, W_z: W, W_y: W, I_t,
    shear_area_y: A * 9 / 10,
    shear_area_z: A * 9 / 10,
  };
}

/** Прямоугольная труба (профильная) b×h×t */
export function makeRectPipeSection(b: number, h: number, t: number, id?: string, name?: string): SectionCatalogEntry {
  const bi = b - 2 * t;
  const hi = h - 2 * t;
  const A = b * h - bi * hi;
  const I_z = (b * h ** 3 - bi * hi ** 3) / 12;
  const I_y = (h * b ** 3 - hi * bi ** 3) / 12;
  const W_z = I_z / (h / 2);
  const W_y = I_y / (b / 2);
  // упрощённое кручение замкнутого тонкостенного: I_t = 4·A_mean²·t / периметр
  const A_mean = (b - t) * (h - t);
  const peri = 2 * (b - t) + 2 * (h - t);
  const I_t = (4 * A_mean ** 2 * t) / peri;
  return {
    id: id || `RPIPE_${(b * 1000).toFixed(0)}x${(h * 1000).toFixed(0)}x${(t * 1000).toFixed(0)}`,
    name: name || `Профтруба ${(b * 1000).toFixed(0)}×${(h * 1000).toFixed(0)}×${(t * 1000).toFixed(1)} мм`,
    type: "pipe_rect",
    category: "custom_rect_pipe",
    h, A, I_z, I_y, W_z, W_y, I_t,
    shear_area_y: 2 * h * t,
    shear_area_z: 2 * b * t,
  };
}
