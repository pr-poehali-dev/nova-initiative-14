/**
 * Каталоги материалов, сечений и шаблонов задач для CAE.
 * Все числовые значения — в системе СИ (метры, паскали, ньютоны).
 * Источники:
 *   - Сталь: ГОСТ 4543-2016, ГОСТ 1050-2013, Анурьев т.1
 *   - Сечения: ГОСТ 8239-89 (двутавры), ГОСТ 8240-97 (швеллеры),
 *              ГОСТ 8509-93 (уголки равнополочные), ГОСТ 10704-91 (трубы)
 */
import type { Material, Section, FrameModel } from "@/lib/cae-model";

// ============================================================
// МАТЕРИАЛЫ
// ============================================================

export interface MaterialCatalogEntry extends Material {
  category: "steel" | "alloy" | "cast_iron" | "aluminium" | "concrete" | "custom";
  gost?: string;
  description?: string;
}

export const MATERIAL_CATALOG: MaterialCatalogEntry[] = [
  {
    id: "steel_st3",
    name: "Сталь Ст3 (нормализация)",
    category: "steel",
    gost: "ГОСТ 380-2005",
    description: "Углеродистая обыкновенного качества. Базовая для строительных металлоконструкций.",
    E: 2.06e11, G: 8.0e10, nu: 0.3, rho: 7850, sigma_yield: 245e6, sigma_ultimate: 380e6,
  },
  {
    id: "steel_20",
    name: "Сталь 20 (нормализация)",
    category: "steel",
    gost: "ГОСТ 1050-2013",
    description: "Углеродистая качественная конструкционная. Цементируемая, для слабонагруженных деталей.",
    E: 2.1e11, G: 8.1e10, nu: 0.3, rho: 7850, sigma_yield: 245e6, sigma_ultimate: 410e6,
  },
  {
    id: "steel_45_norm",
    name: "Сталь 45 (нормализация)",
    category: "steel",
    gost: "ГОСТ 1050-2013",
    description: "Углеродистая качественная. Малонагруженные валы тихоходных ступеней.",
    E: 2.1e11, G: 8.1e10, nu: 0.3, rho: 7850, sigma_yield: 360e6, sigma_ultimate: 600e6,
  },
  {
    id: "steel_45_imp",
    name: "Сталь 45 (улучшение, 235...262 HB)",
    category: "steel",
    gost: "ГОСТ 1050-2013",
    description: "Углеродистая после закалки и высокого отпуска. Базовая для валов общего назначения.",
    E: 2.1e11, G: 8.1e10, nu: 0.3, rho: 7850, sigma_yield: 540e6, sigma_ultimate: 780e6,
  },
  {
    id: "steel_40x",
    name: "Сталь 40Х (улучшение, 269...302 HB)",
    category: "steel",
    gost: "ГОСТ 4543-2016",
    description: "Хромистая легированная. Средне- и тяжелонагруженные валы редукторов.",
    E: 2.14e11, G: 8.0e10, nu: 0.29, rho: 7820, sigma_yield: 785e6, sigma_ultimate: 980e6,
  },
  {
    id: "steel_40xn",
    name: "Сталь 40ХН (улучшение)",
    category: "steel",
    gost: "ГОСТ 4543-2016",
    description: "Хромоникелевая. Валы крупного сечения (D > 80 мм), повышенная прокаливаемость.",
    E: 2.14e11, G: 8.0e10, nu: 0.29, rho: 7820, sigma_yield: 800e6, sigma_ultimate: 1000e6,
  },
  {
    id: "steel_20x_cement",
    name: "Сталь 20Х (цементация + закалка)",
    category: "steel",
    gost: "ГОСТ 4543-2016",
    description: "Хромистая цементируемая. Износостойкие шейки валов под подшипники скольжения.",
    E: 2.14e11, G: 8.0e10, nu: 0.29, rho: 7820, sigma_yield: 650e6, sigma_ultimate: 850e6,
  },
  {
    id: "steel_18xgt",
    name: "Сталь 18ХГТ (цементация + закалка)",
    category: "steel",
    gost: "ГОСТ 4543-2016",
    description: "Тяжёлые трансмиссии тракторов и спецтехники. Шлицевые валы КПП.",
    E: 2.14e11, G: 8.0e10, nu: 0.29, rho: 7820, sigma_yield: 900e6, sigma_ultimate: 1150e6,
  },
  {
    id: "steel_09g2s",
    name: "Сталь 09Г2С",
    category: "steel",
    gost: "ГОСТ 19281-2014",
    description: "Низколегированная свариваемая. Несущие металлоконструкции, рамы, фермы.",
    E: 2.06e11, G: 8.0e10, nu: 0.3, rho: 7850, sigma_yield: 345e6, sigma_ultimate: 490e6,
  },
  {
    id: "steel_38x2mua",
    name: "Сталь 38Х2МЮА (азотирование)",
    category: "steel",
    gost: "ГОСТ 4543-2016",
    description: "Нитралой. Прецизионные шпиндели станков, червяки точных передач.",
    E: 2.14e11, G: 8.0e10, nu: 0.29, rho: 7850, sigma_yield: 835e6, sigma_ultimate: 1080e6,
  },
  {
    id: "ci_sch20",
    name: "Чугун СЧ20",
    category: "cast_iron",
    gost: "ГОСТ 1412-85",
    description: "Серый чугун с пластинчатым графитом. Корпуса редукторов, станины.",
    E: 1.0e11, G: 4.5e10, nu: 0.25, rho: 7200, sigma_yield: 200e6, sigma_ultimate: 200e6,
  },
  {
    id: "alu_d16t",
    name: "Алюминий Д16Т",
    category: "aluminium",
    gost: "ГОСТ 4784-2019",
    description: "Дуралюмин закалённый и состаренный. Лёгкие силовые конструкции.",
    E: 7.2e10, G: 2.7e10, nu: 0.33, rho: 2780, sigma_yield: 280e6, sigma_ultimate: 420e6,
  },
  {
    id: "alu_amg6",
    name: "Алюминий АМг6",
    category: "aluminium",
    gost: "ГОСТ 4784-2019",
    description: "Сплав на основе магния. Свариваемые конструкции, корпуса.",
    E: 7.1e10, G: 2.65e10, nu: 0.33, rho: 2640, sigma_yield: 170e6, sigma_ultimate: 320e6,
  },
];

// ============================================================
// СЕЧЕНИЯ
// ============================================================

export type SectionType =
  | "i_beam"          // двутавр
  | "channel"         // швеллер
  | "angle_eq"        // уголок равнополочный
  | "pipe_round"      // труба круглая
  | "pipe_rect"       // труба прямоугольная
  | "rect_solid"      // прямоугольник сплошной
  | "circle_solid"    // круг сплошной
  | "custom";

export interface SectionCatalogEntry extends Section {
  type: SectionType;
  category: string;
  gost?: string;
}

/**
 * Двутавры по ГОСТ 8239-89 (типовые номера).
 * h — высота, b — ширина полки, t_w — толщина стенки, t_f — средняя толщина полки.
 */
export const I_BEAMS_8239: SectionCatalogEntry[] = [
  // h(мм), b(мм), s(мм), t(мм), A(см²), Iy(см⁴), Wy(см³), Iz(см⁴), Wz(см³)
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
  // b×t (мм) ; A(см²) ; Iz=Iy(см⁴)
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
  // D×t (мм) ; A=π(D²-d²)/4 ; I=π(D⁴-d⁴)/64
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

// ============================================================
// ПАРАМЕТРИЧЕСКИЕ СЕЧЕНИЯ
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

// ============================================================
// ШАБЛОНЫ ТИПОВЫХ ЗАДАЧ
// ============================================================

export interface FrameTemplate {
  id: string;
  name: string;
  description: string;
  preview: string; // упрощённое SVG-представление для миниатюры
  build: () => FrameModel;
}

const DEFAULT_MAT = MATERIAL_CATALOG.find((m) => m.id === "steel_st3")!;
const DEFAULT_SEC = I_BEAMS_8239.find((s) => s.id === "I20")!;

function emptyBase(): FrameModel {
  return {
    meta: { dim: "2d" },
    materials: [{ ...DEFAULT_MAT }],
    sections: [{ ...DEFAULT_SEC }],
    nodes: [],
    elements: [],
    boundary_conditions: [],
    loads: [],
    analysis_options: { diagram_subdivisions: 20 },
  };
}

export const FRAME_TEMPLATES: FrameTemplate[] = [
  {
    id: "empty",
    name: "Пустой проект",
    description: "Начать с нуля. Только сетка и оси координат.",
    preview: "M10,30 L70,30 M10,30 L10,5",
    build: () => emptyBase(),
  },
  {
    id: "cantilever",
    name: "Консольная балка",
    description: "Защемлённый левый край, точечная сила P=1000 Н на свободном конце. L=2 м.",
    preview: "M5,15 L5,35 L8,38 L11,35 L8,32 L5,35 M5,25 L65,25 M65,20 L65,30 M65,30 L60,28 M65,30 L60,32",
    build: () => ({
      ...emptyBase(),
      nodes: [
        { id: "n1", coords: [0, 0, 0] },
        { id: "n2", coords: [2, 0, 0] },
      ],
      elements: [{ id: "e1", node_start: "n1", node_end: "n2", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id }],
      boundary_conditions: [{ id: "bc1", node_id: "n1", type: "fixed", constrained_dofs: ["ux", "uy", "rz"] }],
      loads: [{ id: "L1", type: "nodal_force", node_id: "n2", force: [0, -1000, 0], moment: [0, 0, 0] }],
    }),
  },
  {
    id: "simply_supported",
    name: "Балка на двух опорах",
    description: "Шарнир и каток. Сосредоточенная сила в середине, P=2000 Н, L=4 м.",
    preview: "M5,25 L65,25 M5,28 L5,35 L8,35 M2,38 L8,38 M62,28 L62,35 L65,35 M59,38 L65,38 M35,15 L35,25 L32,22 M35,25 L38,22",
    build: () => ({
      ...emptyBase(),
      nodes: [
        { id: "n1", coords: [0, 0, 0] },
        { id: "n2", coords: [2, 0, 0] },
        { id: "n3", coords: [4, 0, 0] },
      ],
      elements: [
        { id: "e1", node_start: "n1", node_end: "n2", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
        { id: "e2", node_start: "n2", node_end: "n3", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
      ],
      boundary_conditions: [
        { id: "bc1", node_id: "n1", type: "pinned", constrained_dofs: ["ux", "uy"] },
        { id: "bc2", node_id: "n3", type: "roller_y", constrained_dofs: ["uy"] },
      ],
      loads: [{ id: "L1", type: "nodal_force", node_id: "n2", force: [0, -2000, 0], moment: [0, 0, 0] }],
    }),
  },
  {
    id: "udl_beam",
    name: "Балка с распределённой нагрузкой",
    description: "Шарнир и каток. Равномерная q=1000 Н/м по всей длине L=6 м.",
    preview: "M5,25 L65,25 M5,18 L65,18 M5,18 L5,25 M15,18 L15,25 M25,18 L25,25 M35,18 L35,25 M45,18 L45,25 M55,18 L55,25 M65,18 L65,25 M5,25 L5,35 L8,35 M62,25 L62,35 L65,35",
    build: () => ({
      ...emptyBase(),
      nodes: [
        { id: "n1", coords: [0, 0, 0] },
        { id: "n2", coords: [6, 0, 0] },
      ],
      elements: [{ id: "e1", node_start: "n1", node_end: "n2", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id }],
      boundary_conditions: [
        { id: "bc1", node_id: "n1", type: "pinned", constrained_dofs: ["ux", "uy"] },
        { id: "bc2", node_id: "n2", type: "roller_y", constrained_dofs: ["uy"] },
      ],
      loads: [{ id: "L1", type: "distributed_uniform", element_id: "e1", load_local_per_length: [0, -1000, 0] }],
    }),
  },
  {
    id: "overhang",
    name: "Балка с консолью",
    description: "Шарнир + каток с консолью на правом конце. Сила P=3000 Н на консоли.",
    preview: "M5,25 L65,25 M5,28 L5,35 L8,35 M45,28 L45,35 L48,35 M65,15 L65,25 L62,22 M65,25 L68,22",
    build: () => ({
      ...emptyBase(),
      nodes: [
        { id: "n1", coords: [0, 0, 0] },
        { id: "n2", coords: [4, 0, 0] },
        { id: "n3", coords: [6, 0, 0] },
      ],
      elements: [
        { id: "e1", node_start: "n1", node_end: "n2", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
        { id: "e2", node_start: "n2", node_end: "n3", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
      ],
      boundary_conditions: [
        { id: "bc1", node_id: "n1", type: "pinned", constrained_dofs: ["ux", "uy"] },
        { id: "bc2", node_id: "n2", type: "roller_y", constrained_dofs: ["uy"] },
      ],
      loads: [{ id: "L1", type: "nodal_force", node_id: "n3", force: [0, -3000, 0], moment: [0, 0, 0] }],
    }),
  },
  {
    id: "portal_frame",
    name: "П-образная рама",
    description: "Портальная рама: 2 защемлённых стойки 3 м + ригель 4 м. Горизонтальная сила 2000 Н сверху.",
    preview: "M15,40 L15,10 L55,10 L55,40 M15,40 L18,42 M55,40 L52,42 M55,40 L58,42 M15,10 L5,10 L8,8 M5,10 L8,12",
    build: () => ({
      ...emptyBase(),
      nodes: [
        { id: "n1", coords: [0, 0, 0] },
        { id: "n2", coords: [0, 3, 0] },
        { id: "n3", coords: [4, 3, 0] },
        { id: "n4", coords: [4, 0, 0] },
      ],
      elements: [
        { id: "e1", node_start: "n1", node_end: "n2", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
        { id: "e2", node_start: "n2", node_end: "n3", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
        { id: "e3", node_start: "n3", node_end: "n4", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
      ],
      boundary_conditions: [
        { id: "bc1", node_id: "n1", type: "fixed", constrained_dofs: ["ux", "uy", "rz"] },
        { id: "bc2", node_id: "n4", type: "fixed", constrained_dofs: ["ux", "uy", "rz"] },
      ],
      loads: [{ id: "L1", type: "nodal_force", node_id: "n2", force: [2000, 0, 0], moment: [0, 0, 0] }],
    }),
  },
  {
    id: "l_frame",
    name: "Г-образная рама",
    description: "Стойка 3 м + ригель 3 м. Защемление снизу, сила 1500 Н на свободном конце.",
    preview: "M15,40 L15,10 L55,10 M15,40 L18,42 M15,40 L12,42 M55,10 L55,5 L52,8 M55,5 L58,8",
    build: () => ({
      ...emptyBase(),
      nodes: [
        { id: "n1", coords: [0, 0, 0] },
        { id: "n2", coords: [0, 3, 0] },
        { id: "n3", coords: [3, 3, 0] },
      ],
      elements: [
        { id: "e1", node_start: "n1", node_end: "n2", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
        { id: "e2", node_start: "n2", node_end: "n3", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
      ],
      boundary_conditions: [
        { id: "bc1", node_id: "n1", type: "fixed", constrained_dofs: ["ux", "uy", "rz"] },
      ],
      loads: [{ id: "L1", type: "nodal_force", node_id: "n3", force: [0, -1500, 0], moment: [0, 0, 0] }],
    }),
  },
  {
    id: "truss_simple",
    name: "Простая ферма (треугольник)",
    description: "Двухопорная ферма из 3 стержней. Сила в верхнем узле 5000 Н.",
    preview: "M5,40 L65,40 L35,10 L5,40 M5,40 L8,42 M62,40 L65,42 M35,10 L32,8 M35,10 L38,8",
    build: () => ({
      ...emptyBase(),
      nodes: [
        { id: "n1", coords: [0, 0, 0] },
        { id: "n2", coords: [4, 0, 0] },
        { id: "n3", coords: [2, 2, 0] },
      ],
      elements: [
        { id: "e1", node_start: "n1", node_end: "n2", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
        { id: "e2", node_start: "n1", node_end: "n3", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
        { id: "e3", node_start: "n3", node_end: "n2", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
      ],
      boundary_conditions: [
        { id: "bc1", node_id: "n1", type: "pinned", constrained_dofs: ["ux", "uy"] },
        { id: "bc2", node_id: "n2", type: "roller_y", constrained_dofs: ["uy"] },
      ],
      loads: [{ id: "L1", type: "nodal_force", node_id: "n3", force: [0, -5000, 0], moment: [0, 0, 0] }],
    }),
  },
  {
    id: "portal_pitched",
    name: "Двускатная рама (треугольный ригель)",
    description: "2 стойки 4 м + наклонный ригель с коньком на высоте 5 м. Снеговая 800 Н в коньке.",
    preview: "M15,40 L15,15 L35,5 L55,15 L55,40 M15,40 L12,42 M15,40 L18,42 M55,40 L52,42 M55,40 L58,42 M35,5 L32,2 M35,5 L38,2",
    build: () => ({
      ...emptyBase(),
      nodes: [
        { id: "n1", coords: [0, 0, 0] },
        { id: "n2", coords: [0, 4, 0] },
        { id: "n3", coords: [3, 5, 0] },
        { id: "n4", coords: [6, 4, 0] },
        { id: "n5", coords: [6, 0, 0] },
      ],
      elements: [
        { id: "e1", node_start: "n1", node_end: "n2", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
        { id: "e2", node_start: "n2", node_end: "n3", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
        { id: "e3", node_start: "n3", node_end: "n4", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
        { id: "e4", node_start: "n4", node_end: "n5", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
      ],
      boundary_conditions: [
        { id: "bc1", node_id: "n1", type: "fixed", constrained_dofs: ["ux", "uy", "rz"] },
        { id: "bc2", node_id: "n5", type: "fixed", constrained_dofs: ["ux", "uy", "rz"] },
      ],
      loads: [{ id: "L1", type: "nodal_force", node_id: "n3", force: [0, -800, 0], moment: [0, 0, 0] }],
    }),
  },
  {
    id: "two_span_continuous",
    name: "Двухпролётная неразрезная балка",
    description: "3 опоры (шарнир + 2 катка), 2 пролёта по 4 м, равномерная нагрузка q=1500 Н/м.",
    preview: "M5,25 L65,25 M5,18 L65,18 M5,18 L5,25 M15,18 L15,25 M25,18 L25,25 M35,18 L35,25 M45,18 L45,25 M55,18 L55,25 M65,18 L65,25 M5,25 L5,35 L8,35 M35,25 L35,35 L38,35 M62,25 L62,35 L65,35",
    build: () => ({
      ...emptyBase(),
      nodes: [
        { id: "n1", coords: [0, 0, 0] },
        { id: "n2", coords: [4, 0, 0] },
        { id: "n3", coords: [8, 0, 0] },
      ],
      elements: [
        { id: "e1", node_start: "n1", node_end: "n2", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
        { id: "e2", node_start: "n2", node_end: "n3", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
      ],
      boundary_conditions: [
        { id: "bc1", node_id: "n1", type: "pinned", constrained_dofs: ["ux", "uy"] },
        { id: "bc2", node_id: "n2", type: "roller_y", constrained_dofs: ["uy"] },
        { id: "bc3", node_id: "n3", type: "roller_y", constrained_dofs: ["uy"] },
      ],
      loads: [
        { id: "L1", type: "distributed_uniform", element_id: "e1", load_local_per_length: [0, -1500, 0] },
        { id: "L2", type: "distributed_uniform", element_id: "e2", load_local_per_length: [0, -1500, 0] },
      ],
    }),
  },
];

// ============================================================
// УТИЛИТЫ
// ============================================================

export function findMaterial(id: string): MaterialCatalogEntry | null {
  return MATERIAL_CATALOG.find((m) => m.id === id) || null;
}

export function findSection(id: string): SectionCatalogEntry | null {
  return SECTION_CATALOG.find((s) => s.id === id) || null;
}

export const SECTION_GROUPS = [
  { id: "i_8239",          name: "Двутавры ГОСТ 8239-89",     items: I_BEAMS_8239 },
  { id: "u_8240",          name: "Швеллеры ГОСТ 8240-97",     items: CHANNELS_8240 },
  { id: "l_8509",          name: "Уголки ГОСТ 8509-93",       items: ANGLES_8509 },
  { id: "pipe_round",      name: "Трубы круглые ГОСТ 10704",  items: PIPES_ROUND_10704 },
];

export const MATERIAL_GROUPS = [
  { id: "steel",     name: "Стали",      items: MATERIAL_CATALOG.filter((m) => m.category === "steel") },
  { id: "cast_iron", name: "Чугуны",     items: MATERIAL_CATALOG.filter((m) => m.category === "cast_iron") },
  { id: "aluminium", name: "Алюминий",   items: MATERIAL_CATALOG.filter((m) => m.category === "aluminium") },
];
