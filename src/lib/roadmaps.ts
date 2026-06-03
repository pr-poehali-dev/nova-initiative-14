/**
 * Реестр внутренних дорожных карт продукта.
 *
 * Сюда добавляются ВСЕ дорожные карты — и существующие, и будущие. Карты
 * видны только администратору и владельцу (вход из личного кабинета через
 * блок «Дорожные карты»). Каждая карта — отдельная страница-маршрут.
 *
 * Чтобы добавить новую карту: создайте страницу-маршрут и допишите запись
 * в массив ROADMAPS — блок в кабинете обновится автоматически.
 */

export type RoadmapState = "active" | "planned" | "draft";

export interface RoadmapEntry {
  /** Уникальный ключ. */
  key: string;
  /** Название карты. */
  title: string;
  /** Короткое пояснение. */
  description: string;
  /** Иконка lucide. */
  icon: string;
  /** Маршрут страницы карты (null — если карта ещё не реализована). */
  href: string | null;
  /** Состояние карты для бейджа. */
  state: RoadmapState;
}

export const ROADMAP_STATE_META: Record<
  RoadmapState,
  { label: string; cls: string }
> = {
  active: { label: "Активна", cls: "text-green-700 border-green-700" },
  planned: { label: "Планируется", cls: "text-[var(--drawing-line-thin)] border-[var(--drawing-line-thin)]" },
  draft: { label: "Черновик", cls: "text-amber-700 border-amber-700" },
};

/**
 * Все дорожные карты. Первая — реализованная карта PLM.
 * Остальные — заглушки-направления, которые будут оформлены позже.
 */
export const ROADMAPS: RoadmapEntry[] = [
  {
    key: "plm",
    title: "CAE → PLM",
    description:
      "Превращение расчётного редактора в PLM-платформу: совместная работа, модули, авторасчёт соединений, спецификация и РПЗ, CAD/КЭМ.",
    icon: "Boxes",
    href: "/cae/roadmap",
    state: "active",
  },
  {
    key: "platform",
    title: "Единое приложение сервисов",
    description:
      "Объединение расчёта, документации, стоимости и командной работы в одном современном продукте.",
    icon: "LayoutGrid",
    href: null,
    state: "planned",
  },
  {
    key: "marketing",
    title: "Маркетинг и рост",
    description:
      "План привлечения и удержания: контент, реферальная программа, партнёрства с вузами.",
    icon: "TrendingUp",
    href: null,
    state: "planned",
  },
];
