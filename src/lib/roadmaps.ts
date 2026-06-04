/**
 * ЕДИНЫЙ реестр всех дорожных карт продукта (внутренний документ).
 *
 * Здесь хранятся ВСЕ дорожные карты, над которыми мы когда-либо работали —
 * вынесенные из разных файлов проекта в один источник. Каждая карта:
 *  • знает свой исходный файл (поле `source`) — пометка со ссылкой на
 *    расположение оригинала в репозитории;
 *  • разбита на этапы (phases) с задачами и статусами;
 *  • открывается на отдельной странице /roadmaps/:slug.
 *
 * Доступ к картам — только администратор и владелец (вход из личного
 * кабинета через блок «Дорожные карты»). Страницы скрыты от поисковиков.
 *
 * Чтобы добавить новую карту: допишите запись в массив ROADMAPS —
 * реестр в кабинете и страница-просмотрщик подхватят её автоматически.
 */

export type RoadmapStatus = "done" | "progress" | "next" | "later" | "research";
export type RoadmapState = "active" | "planned" | "draft";

export interface RoadmapTask {
  title: string;
  status: RoadmapStatus;
  /** Короткое пояснение: что это и зачем. */
  note?: string;
}

export interface RoadmapPhase {
  /** Якорь/код этапа. */
  key: string;
  title: string;
  icon: string;
  /** Грубый горизонт («Сделано», «Ближайшее» и т.п.). */
  horizon: string;
  summary: string;
  tasks: RoadmapTask[];
}

export interface Roadmap {
  /** Уникальный slug (часть URL: /roadmaps/:slug). */
  slug: string;
  /** Короткое название (для блока и шапки). */
  title: string;
  /** Подзаголовок-категория. */
  eyebrow: string;
  /** Описание карты. */
  description: string;
  /** Иконка lucide. */
  icon: string;
  /** Состояние карты для бейджа в реестре. */
  state: RoadmapState;
  /** Путь к исходному файлу в репозитории (пометка о расположении). */
  source: string;
  /** Этапы карты. */
  phases: RoadmapPhase[];
}

export const STATUS_META: Record<
  RoadmapStatus,
  { label: string; icon: string; cls: string }
> = {
  done: { label: "Готово", icon: "CheckCircle2", cls: "text-green-700 border-green-700" },
  progress: { label: "В работе", icon: "Loader", cls: "text-[var(--drawing-accent)] border-[var(--drawing-accent)]" },
  next: { label: "Ближайшее", icon: "ArrowRight", cls: "text-[var(--drawing-line)] border-[var(--drawing-line)]" },
  later: { label: "Позже", icon: "Clock", cls: "text-[var(--drawing-line-thin)] border-[var(--drawing-line-thin)]" },
  research: { label: "Изучаем", icon: "FlaskConical", cls: "text-amber-700 border-amber-700" },
};

export const ROADMAP_STATE_META: Record<
  RoadmapState,
  { label: string; cls: string }
> = {
  active: { label: "Активна", cls: "text-green-700 border-green-700" },
  planned: { label: "Планируется", cls: "text-[var(--drawing-line-thin)] border-[var(--drawing-line-thin)]" },
  draft: { label: "Черновик", cls: "text-amber-700 border-amber-700" },
};

// ============================================================
// КАРТА 1 — CAE → PLM (источник: тикет №43, данные ранее в plmRoadmap.ts)
// ============================================================
const PLM_ROADMAP: Roadmap = {
  slug: "plm",
  title: "CAE → PLM",
  eyebrow: "Продуктовая платформа",
  description:
    "Превращение расчётного редактора в PLM-платформу: совместная работа, модули конструкции, авторасчёт соединений, спецификация и пояснительная записка, CAD/КЭМ.",
  icon: "Boxes",
  state: "active",
  source: "Тикет №43 · src/lib/roadmaps.ts",
  phases: [
    {
      key: "foundation",
      title: "Фундамент (уже есть)",
      icon: "Database",
      horizon: "Сделано",
      summary: "Базовые кирпичи PLM, которые уже работают и на которые опираются следующие этапы.",
      tasks: [
        { title: "Проекты с историей версий", status: "done", note: "Каждое сохранение — новая версия модели, owner у проекта." },
        { title: "Тарифы и подписки", status: "done", note: "Free/Basic/Pro/Enterprise, оплата, флаги командного доступа." },
        { title: "PDF-отчёт по ЕСКД", status: "done", note: "Схема, эпюры N/Q/M, реакции, экстремумы." },
        { title: "Типы узловых соединений", status: "done", note: "Сварное/болтовое/заклёпочное/шарнир — признак на узле." },
        { title: "Шарниры на стержнях", status: "done", note: "Основа для ферм и расчётных схем." },
        { title: "Журнал версий и баллы за идеи", status: "done", note: "Открытый changelog + баллы авторам тикетов." },
      ],
    },
    {
      key: "collaboration",
      title: "Этап 1. Совместная работа над проектом",
      icon: "Users",
      horizon: "Ближайшие спринты",
      summary: "Студенты работают над одним проектом с разных аккаунтов. Начинаем с шеринга, без realtime.",
      tasks: [
        { title: "Приглашение по e-mail/ссылке", status: "next", note: "Роли: смотреть / редактировать." },
        { title: "Таблица участников проекта", status: "next", note: "cae_collaborators: проект ↔ пользователь ↔ роль." },
        { title: "Лента активности проекта", status: "later", note: "Кто что менял — на базе версий модели." },
        { title: "Одновременное редактирование (realtime)", status: "research", note: "Нужны блокировки/CRDT. Сначала — по версиям." },
      ],
    },
    {
      key: "modules",
      title: "Этап 2. Модули и сборки конструкции",
      icon: "Boxes",
      horizon: "После шеринга",
      summary: "Делим конструкцию на модули. Выделил балки → «Создать модуль». Основа для спецификации и стоимости.",
      tasks: [
        { title: "Понятие «модуль» в модели", status: "next", note: "Группа элементов; элемент знает свой module_id." },
        { title: "Кнопка «Создать модуль из выделения»", status: "next" },
        { title: "Дерево модулей в редакторе", status: "later", note: "Подсветка и изоляция модуля на схеме." },
        { title: "Сводка по модулю", status: "later", note: "Масса, длина профиля, число узлов и крепежа." },
      ],
    },
    {
      key: "auto-joints",
      title: "Этап 3. Авторасчёт соединений",
      icon: "Wrench",
      horizon: "Среднесрок",
      summary: "Узел сварной → длина/тип шва; разъёмный → число и размер винтов. Всё редактируется, завязано на усилия.",
      tasks: [
        { title: "Расчёт сварного шва", status: "later", note: "Тип, катет, длина; проверка прочности." },
        { title: "Подбор крепежа (болты/винты)", status: "later", note: "Количество и размер по нагрузке." },
        { title: "Каталог крепежа и швов (ГОСТ)", status: "research" },
        { title: "Привязка результата к узлу", status: "later", note: "Параметры идут в спецификацию и РПЗ." },
      ],
    },
    {
      key: "spec-pza",
      title: "Этап 4. Спецификация и пояснительная записка",
      icon: "FileText",
      horizon: "Среднесрок",
      summary: "Экран-спецификация при открытии проекта и полноценная РПЗ с формулами вместо «сухого» PDF.",
      tasks: [
        { title: "Экран-спецификация проекта", status: "later", note: "Состав, сборки, схемы, ответственные, стоимость." },
        { title: "Предварительная стоимость проекта", status: "later" },
        { title: "Структура РПЗ", status: "research", note: "Уточнить общепринятую структуру записки." },
        { title: "РПЗ с формулами и схемами", status: "later" },
      ],
    },
    {
      key: "cad-kem",
      title: "Этап 5. CAD-модели и расчёт по КЭМ",
      icon: "Box",
      horizon: "Долгосрок",
      summary: "Загрузка CAD деталей → оценка стоимости обработки, уточнение схемы, переключатель «приближение ↔ модель».",
      tasks: [
        { title: "Загрузка CAD деталей", status: "research", note: "STEP/STL, хранение в S3." },
        { title: "Оценка стоимости обработки", status: "later" },
        { title: "Переключатель «приближение ↔ КЭМ»", status: "later" },
        { title: "Пересчёт эпюр по уточнённой модели", status: "later" },
      ],
    },
    {
      key: "ideas",
      title: "Этап 6. Идеи и общая платформа",
      icon: "Sparkles",
      horizon: "Видение",
      summary: "Связующие сервисы: пул идей и MindMap в составе проекта, единое современное приложение.",
      tasks: [
        { title: "MindMap в составе проекта", status: "later" },
        { title: "Пул расчётов и заметок", status: "later" },
        { title: "Единое приложение сервисов", status: "research" },
        { title: "Позиционирование: CAE → PLM", status: "research" },
      ],
    },
  ],
};

// ============================================================
// КАРТА 2 — UI/UX сайта (источник: docs/webapp/roadmap-ui.md)
// ============================================================
const UI_ROADMAP: Roadmap = {
  slug: "ui",
  title: "UI/UX сайта",
  eyebrow: "Интерфейс и доверие",
  description:
    "План улучшений интерфейса диплом-инж.рф: полировка, демонстрация продукта, AI-помощь и аудит качества перед МВП.",
  icon: "Palette",
  state: "active",
  source: "docs/webapp/roadmap-ui.md",
  phases: [
    {
      key: "polish",
      title: "Этап 1. Полировка и «дорогое» ощущение",
      icon: "Sparkles",
      horizon: "Сделано",
      summary: "Оживить сайт без структурных изменений: максимум визуального прироста за минимум правок.",
      tasks: [
        { title: "Микроанимации появления секций при скролле", status: "done", note: "IntersectionObserver + fade/slide на 7 секций." },
        { title: "Skeleton-загрузка вместо «Загрузка…»", status: "done", note: "Тарифы, блог, проекты CAE." },
        { title: "Полировка hover/focus карточек и кнопок", status: "done", note: "Подъём, тень, видимый focus-ring." },
        { title: "Sticky-CTA «Диагностика» на мобильном", status: "done" },
        { title: "Улучшенные пустые экраны", status: "done" },
      ],
    },
    {
      key: "demo",
      title: "Этап 2. Демонстрация продукта и структура",
      icon: "LayoutGrid",
      horizon: "Сделано",
      summary: "Показать ценность наглядно, усилить ритм страниц.",
      tasks: [
        { title: "Bento-сетка для блока преимуществ", status: "done" },
        { title: "Живое анимированное демо CAE на главной", status: "done", note: "SVG-балка: прогиб, эпюра момента, σmax." },
        { title: "Анимированные счётчики цифр", status: "done" },
        { title: "Прогресс-бар чтения + оглавление статей", status: "done" },
      ],
    },
    {
      key: "ai",
      title: "Этап 3. Глубина и AI-помощь",
      icon: "Bot",
      horizon: "Долгосрок",
      summary: "Усилить уникальность и миссию «учить, а не делать за студента».",
      tasks: [
        { title: "Контекстные подсказки-копилот в CAE", status: "later", note: "Опциональная панель, не перехватывает поток." },
        { title: "Интерактивный подбор тарифа (квиз)", status: "later", note: "Лид-магнит." },
        { title: "Прозрачность AI: явные индикаторы", status: "later" },
      ],
    },
    {
      key: "audit",
      title: "Аудит качества перед МВП",
      icon: "ClipboardCheck",
      horizon: "Готовность 85/100",
      summary: "Честность и безопасность данных: расчётное ядро, контент, структура, тёмная тема.",
      tasks: [
        { title: "Расчётное ядро CAE (блок A)", status: "done", note: "σ-Мизес по двум точкам, учёт Qz в 3D, знак M_y." },
        { title: "Нелинейный расчёт P-Δ + честный лендинг (B1)", status: "done" },
        { title: "Цифра «95% покупают диплом» без источника (B2)", status: "next", note: "src/pages/About.tsx — убрать/обосновать." },
        { title: "Пустые контакты-fallback (B3)", status: "next", note: "src/hooks/useContacts.ts — добавить запасные контакты." },
        { title: "Гарантия возврата на /pricing (B4)", status: "later" },
        { title: "Доступ к /admin/generator (C1)", status: "done", note: "Закрыт: только админ/владелец." },
        { title: "sitemap без /privacy и /offer (C2)", status: "later" },
        { title: "Тёмная тема: NotFound, Google-кнопка, hardcoded цвета (D1–D4)", status: "later" },
      ],
    },
  ],
};

// ============================================================
// КАРТА 3 — Архитектура (источник: docs/cae-architecture.md)
// ============================================================
const ARCH_ROADMAP: Roadmap = {
  slug: "architecture",
  title: "Архитектура CAE + SSO",
  eyebrow: "Техническая основа",
  description:
    "Архитектура связки сайт + CAE-продукт + единый SSO-кабинет: продуктовая линейка, поток «от модели до отчёта», защита лимитов, оплата.",
  icon: "Network",
  state: "active",
  source: "docs/cae-architecture.md (v0.3)",
  phases: [
    {
      key: "platform",
      title: "Продуктовая линейка и SSO",
      icon: "Layers",
      horizon: "Базис",
      summary: "Три системы под одним аккаунтом: маркетинговый сайт, облачный CAE, единый вход.",
      tasks: [
        { title: "Маркетинговый сайт диплом-инж.рф", status: "done" },
        { title: "Облачный CAE на Timoshenko FEM", status: "done" },
        { title: "Единый SSO-кабинет (JWT, OAuth2)", status: "done", note: "Логин один раз — доступ во все продукты." },
        { title: "Перекрёстная лидогенерация (CAE ↔ сайт)", status: "progress", note: "Кнопка «Нужна помощь наставника?» → лид." },
      ],
    },
    {
      key: "pipeline",
      title: "Поток «от модели до отчёта»",
      icon: "Workflow",
      horizon: "Реализовано",
      summary: "Рисуем раму → solver на бэке → эпюры и деформации → PDF/HTML отчёт в S3.",
      tasks: [
        { title: "Сериализация модели (JSON) + валидация", status: "done" },
        { title: "FEM-solver (NumPy/SciPy) на бэке", status: "done" },
        { title: "Эпюры N/Q/M и деформированная форма", status: "done" },
        { title: "Рендер отчёта PDF/HTML, выгрузка в S3", status: "done" },
        { title: "Автосохранение черновика каждые 30 сек", status: "done" },
        { title: "Share-ссылки read-only на проект", status: "next", note: "cae_project_shares (nanoid)." },
      ],
    },
    {
      key: "limits",
      title: "Тарифы и защита лимитов",
      icon: "ShieldCheck",
      horizon: "Частично",
      summary: "Freemium с лимитом расчётов сильнее лимита элементов + защита от обхода (M10).",
      tasks: [
        { title: "Тарифная модель (Демо/Старт/Базовый/Профи/Корп.)", status: "done" },
        { title: "Счётчик расчётов и сброс 1-го числа месяца", status: "done" },
        { title: "Rate-limit solver-а по IP", status: "later", note: "M10." },
        { title: "FingerprintJS + SmartCaptcha для демо", status: "research", note: "M10: cae_demo_attempts." },
      ],
    },
  ],
};

// ============================================================
// КАРТА 4 — Стратегия и контент сайта (источник: docs/strategy.md)
// ============================================================
const STRATEGY_ROADMAP: Roadmap = {
  slug: "strategy",
  title: "Стратегия и контент",
  eyebrow: "Позиционирование и страницы",
  description:
    "Позиционирование сервиса наставничества, УТП, структура сайта (sitemap), ключевые страницы и их цели по конверсии.",
  icon: "Compass",
  state: "active",
  source: "docs/strategy.md",
  phases: [
    {
      key: "positioning",
      title: "Позиционирование и УТП",
      icon: "Target",
      horizon: "Определено",
      summary: "Наставничество (не «написание на заказ»): учим, направляем, проверяем. Академическая честность — фундамент.",
      tasks: [
        { title: "Вариант А «Система» — путь к защите", status: "done" },
        { title: "Вариант Б «Практикующие инженеры»", status: "done" },
        { title: "Вариант В «Без паники до защиты»", status: "done" },
        { title: "Блок этики «что делаем / чего НЕ делаем»", status: "done" },
      ],
    },
    {
      key: "sitemap",
      title: "Структура сайта (страницы и цели)",
      icon: "Map",
      horizon: "Реализовано",
      summary: "Каждая страница — со своей целью по конверсии и набором блоков.",
      tasks: [
        { title: "Главная: путь к заявке на диагностику", status: "done" },
        { title: "Программа: 8 модулей", status: "done" },
        { title: "Тарифы: 4 карточки + сравнение", status: "done" },
        { title: "Кейсы, Наставники, FAQ, Контакты", status: "done" },
        { title: "Лендинг честности (без завышенных обещаний)", status: "progress", note: "Часть пунктов в аудите UI (B2–B5)." },
      ],
    },
    {
      key: "funnel",
      title: "Воронка и лидогенерация",
      icon: "Filter",
      horizon: "Развиваем",
      summary: "Лид-магнит — бесплатная диагностика ВКР. Заявка → согласование тарифа → оплата → работа.",
      tasks: [
        { title: "Бесплатная диагностика как главный CTA", status: "done" },
        { title: "Реферальная программа", status: "done", note: "Приглашение друзей, баллы." },
        { title: "Партнёрства с вузами", status: "later" },
        { title: "Контент-маркетинг (блог)", status: "progress" },
      ],
    },
  ],
};

/** Все дорожные карты в одном месте. Первая — основная (PLM). */
export const ROADMAPS: Roadmap[] = [
  PLM_ROADMAP,
  UI_ROADMAP,
  ARCH_ROADMAP,
  STRATEGY_ROADMAP,
];

/** Найти карту по slug. */
export function getRoadmap(slug: string | undefined): Roadmap | undefined {
  return ROADMAPS.find((r) => r.slug === slug);
}

/** Сводка по статусам задач карты — для шапки страницы. */
export function roadmapStats(rm: Roadmap) {
  const all = rm.phases.flatMap((p) => p.tasks);
  return {
    total: all.length,
    done: all.filter((t) => t.status === "done").length,
    progress: all.filter((t) => t.status === "progress").length,
  };
}
