/**
 * Справочник отраслей машиностроения с допускаемыми прогибами [f].
 * Каждая отрасль ссылается на конкретный нормативный документ или справочник —
 * чтобы пользователь мог процитировать источник в РПЗ диплома.
 *
 * Допускаемые прогибы представлены как делитель k в формуле [f] = L / k,
 * либо как абсолютная величина или формула.
 */
import type { IndustryKind } from "./cae-model";

export interface IndustrySpec {
  key: IndustryKind;
  /** Короткое название для UI */
  label: string;
  /** Описание области применения */
  description: string;
  /** Нормативный документ или учебник-источник */
  source: string;
  /** Знаменатель отношения [f] = L/k. Для shaft это эквивалентный делитель: 0.0003L → k≈3333 */
  deflection_divisor: number;
  /** Текстовая формулировка нормы для отчёта */
  deflection_label: string;
}

export const INDUSTRIES: IndustrySpec[] = [
  {
    key: "general",
    label: "Общее машиностроение",
    description: "Несущие рамы, корпуса, станины машин общего назначения",
    source: "Феодосьев В.И. «Сопротивление материалов»; Биргер, Шорр, Иосилевич «Расчёт на прочность деталей машин»",
    deflection_divisor: 300,
    deflection_label: "[f] = L / 300",
  },
  {
    key: "lifting",
    label: "Грузоподъёмные машины",
    description: "Краны мостовые, козловые, башенные; тали, лебёдки, грузозахватные органы",
    source: "РД 24.090.97-98 «Краны грузоподъёмные. Нормы расчёта»",
    deflection_divisor: 700,
    deflection_label: "[f] = L / 700",
  },
  {
    key: "machine_tool",
    label: "Станкостроение",
    description: "Несущие узлы станков: станины, направляющие, шпиндельные узлы",
    source: "Решетов Д.Н. «Детали машин»; Кочергин А.И. «Расчёт и проектирование станков»",
    deflection_divisor: 1000,
    deflection_label: "[f] = L / 1000",
  },
  {
    key: "transport",
    label: "Транспортные машины",
    description: "Рамы автомобилей, тракторов, сельхозтехники, прицепов",
    source: "Анурьев В.И. «Справочник конструктора-машиностроителя»",
    deflection_divisor: 250,
    deflection_label: "[f] = L / 250",
  },
  {
    key: "shaft",
    label: "Валы и оси",
    description: "Валы редукторов, оси неподвижные и вращающиеся",
    source: "ГОСТ 16162; Иванов М.Н. «Детали машин»",
    deflection_divisor: 3333, // 1 / 0.0003
    deflection_label: "f ≤ 0,0003·L",
  },
  {
    key: "custom",
    label: "Своё значение",
    description: "Пользователь задаёт допускаемый прогиб вручную",
    source: "Задаётся пользователем",
    deflection_divisor: 250,
    deflection_label: "[f] = L / k (k задаётся вручную)",
  },
];

export function getIndustrySpec(key: IndustryKind): IndustrySpec {
  return INDUSTRIES.find((i) => i.key === key) ?? INDUSTRIES[0];
}

/**
 * Допускаемый прогиб элемента, м.
 * Для custom используется значение из settings.custom_deflection_divisor (если задано).
 */
export function getAllowableDeflection(
  industry: IndustryKind,
  elementLength: number,
  customDivisor: number | null,
): number {
  if (industry === "custom" && customDivisor && customDivisor > 0) {
    return elementLength / customDivisor;
  }
  const spec = getIndustrySpec(industry);
  return elementLength / spec.deflection_divisor;
}
