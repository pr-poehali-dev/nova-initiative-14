/**
 * Справочник конструктивных типов узловых соединений (тикет №41).
 *
 * Тип соединения — характеристика для документации/спецификаций и будущего
 * расчёта крепежа и сварных швов. На МКЭ-расчёт он не влияет: жёсткость или
 * шарнирность узла задаётся шарнирами на концах элементов.
 */
import type { NodeConnectionType } from "@/lib/cae-model";

export interface NodeConnectionSpec {
  key: NodeConnectionType;
  /** Короткая подпись для кнопок */
  label: string;
  /** Подпись на канве (1 буква в кружке) */
  short: string;
  /** Иконка lucide для UI */
  icon: string;
  /** Пояснение */
  hint: string;
}

export const NODE_CONNECTIONS: NodeConnectionSpec[] = [
  {
    key: "none",
    label: "Не задано",
    short: "",
    icon: "Circle",
    hint: "Тип соединения не указан.",
  },
  {
    key: "welded",
    label: "Сварное",
    short: "С",
    icon: "Flame",
    hint: "Сварной шов. Передаёт усилия и момент, неразъёмное.",
  },
  {
    key: "bolted",
    label: "Болтовое",
    short: "Б",
    icon: "Bolt",
    hint: "Соединение на болтах или винтах. Разъёмное.",
  },
  {
    key: "riveted",
    label: "Заклёпочное",
    short: "З",
    icon: "Dot",
    hint: "Соединение на заклёпках. Неразъёмное.",
  },
  {
    key: "pinned",
    label: "Шарнирное",
    short: "Ш",
    icon: "CircleDot",
    hint: "Палец/ось. Конструктивный шарнир (для расчёта задайте шарнир на стержне).",
  },
];

export function getNodeConnectionSpec(
  key: NodeConnectionType | undefined,
): NodeConnectionSpec {
  return NODE_CONNECTIONS.find((c) => c.key === (key ?? "none")) ?? NODE_CONNECTIONS[0];
}
