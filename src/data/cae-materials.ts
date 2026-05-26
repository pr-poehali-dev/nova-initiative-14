/**
 * Каталог материалов CAE — стали, чугуны, алюминий.
 * Все числа — в системе СИ (Паскали, кг/м³).
 *
 * Источники: ГОСТ 4543-2016, ГОСТ 1050-2013, Анурьев т.1.
 */
import type { MaterialCatalogEntry } from "./cae-catalog-types";

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

export const MATERIAL_GROUPS = [
  { id: "steel",     name: "Стали",      items: MATERIAL_CATALOG.filter((m) => m.category === "steel") },
  { id: "cast_iron", name: "Чугуны",     items: MATERIAL_CATALOG.filter((m) => m.category === "cast_iron") },
  { id: "aluminium", name: "Алюминий",   items: MATERIAL_CATALOG.filter((m) => m.category === "aluminium") },
];

export function findMaterial(id: string): MaterialCatalogEntry | null {
  return MATERIAL_CATALOG.find((m) => m.id === id) || null;
}
