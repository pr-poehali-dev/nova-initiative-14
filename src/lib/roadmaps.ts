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
      summary: "Усилить уникальность и миссию «наставлять, а не делать за студента».",
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
        { title: "Цифра «95% покупают диплом» без источника (B2)", status: "done", note: "Заменена на честный блок миссии без выдуманной статистики." },
        { title: "Пустые контакты-fallback (B3)", status: "done", note: "useContacts.ts: запасные телефон, e-mail и ВК." },
        { title: "Гарантия возврата на /pricing (B4)", status: "done", note: "Пункт о возврате + ссылка на оферту." },
        { title: "Доступ к /admin/generator (C1)", status: "done", note: "Закрыт: только админ/владелец." },
        { title: "sitemap без /privacy и /offer (C2)", status: "done", note: "Добавлены в sitemap." },
        { title: "Тёмная тема: Google-кнопка и hardcoded цвета (D2–D4)", status: "done", note: "Переменные --drawing-on-accent / --drawing-success; D1 NotFound — файл защищён платформой." },
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

// ============================================================
// КАРТА 5 — 3D CAE-редактор (источник: код CAE; кнопка «3D» пока отключена)
// ============================================================
const CAE_3D_ROADMAP: Roadmap = {
  slug: "cae-3d",
  title: "3D CAE-редактор",
  eyebrow: "Пространственный расчёт",
  description:
    "Полноценный трёхмерный расчёт рам: backend уже считает 3D (6 степеней свободы, кручение, два изгиба, P-Δ), осталось довести фронт — 3D-канву, ввод пространственной модели и эпюры по двум плоскостям. Кнопка «Создать 3D» пока отключена до верификации.",
  icon: "Box",
  state: "active",
  source: "backend/cae-solver/* · src/components/cae/* · src/lib/cae/types.ts",
  phases: [
    {
      key: "solver-3d",
      title: "Этап 1. Расчётное ядро 3D (готово)",
      icon: "Cpu",
      horizon: "Сделано",
      summary: "Backend полностью считает 3D-линейную статику. На это опирается весь дальнейший UI.",
      tasks: [
        { title: "6 степеней свободы на узел", status: "done", note: "ux, uy, uz, rx, ry, rz (dof_per_node=6)." },
        { title: "Матрица жёсткости 3D с кручением", status: "done", note: "12×12, осевая + 2 изгиба + кручение GJ/L, Тимошенко." },
        { title: "3D-нагрузки (qy, qz, точечные, трапеция)", status: "done", note: "С эквивалентными моментами My/Mz." },
        { title: "Эпюры N, Qy, Qz, T, My, Mz", status: "done", note: "Solver возвращает все 7 эпюр + σ_vm." },
        { title: "Двухосный изгиб в напряжениях", status: "done", note: "σ от My и Mz, консервативная оценка волокна." },
        { title: "P-Δ нелинейность в 3D", status: "done", note: "Геометрическая матрица жёсткости beam_geometric_k_3d." },
      ],
    },
    {
      key: "verify-3d",
      title: "Этап 2. Верификация 3D",
      icon: "ClipboardCheck",
      horizon: "В работе",
      summary: "Расчёт 3D подтверждён на эталонных задачах и сверен с 2D. Доступ к 3D открыт админам/владельцу; пользователям — после готовности редактора.",
      tasks: [
        { title: "Эталонные 3D-задачи (кручение, изгиб в xz, косой изгиб)", status: "done", note: "cae-verify тесты 10–12: φ=TL/GJ, δ=PL³/3EI_y, двухосный изгиб." },
        { title: "Сверка с аналитикой/литературой (допуск 5%)", status: "done", note: "Все 13 эталонов (10 2D + 3 3D) проходят PASS." },
        { title: "Сверка 2D vs 3D на одной раме", status: "done", note: "Портальная рама в 3D с верным ref_vector совпала с 2D бит-в-бит (δ, σ, реакции)." },
        { title: "Кнопка «Создать 3D» открыта админам/владельцу", status: "done", note: "src/pages/CaeProjects.tsx — пометка «только админам», TODO открыть всем." },
      ],
    },
    {
      key: "canvas-3d",
      title: "Этап 3. 3D-канва (визуализация)",
      icon: "Boxes",
      horizon: "Сделано",
      summary: "Для 3D-проектов вместо 2D SVG показывается настоящая трёхмерная сцена на three.js: орбита-камера, быстрые виды, выбор элементов и деформация.",
      tasks: [
        { title: "Подключить three.js / R3F", status: "done", note: "three + @react-three/fiber + drei. FrameScene3D грузится лениво." },
        { title: "3D-сцена: стержни, узлы, опоры, нагрузки в пространстве", status: "done", note: "FrameScene3D: сферы-узлы, линии-стержни, кубы-опоры, стрелки сил, сетка XZ и оси." },
        { title: "Орбита-камера + ViewCube + автофит", status: "done", note: "OrbitControls, GizmoViewcube, подгонка под габариты по кнопке Fit." },
        { title: "Выбор и подсветка элементов/узлов в 3D", status: "done", note: "Клик по узлу/стержню → подсветка, синхронизирован с панелями справа." },
        { title: "Деформированная форма в 3D", status: "done", note: "Зелёный пунктир поверх исходной при показе деформации." },
        { title: "Быстрые виды (ISO/спереди/сбоку/сверху)", status: "done", note: "Панель кнопок видов: мгновенная установка ракурса камеры." },
      ],
    },
    {
      key: "input-3d",
      title: "Этап 4. Ввод 3D-модели",
      icon: "MousePointerClick",
      horizon: "В работе",
      summary: "Панель свойств узла в 3D-проекте позволяет задать пространственную конструкцию: Z-координата, 6 DOF опор, нагрузки по всем осям.",
      tasks: [
        { title: "Ввод и правка Z-координаты узла", status: "done", note: "Панель узла: поля x/y/z с точным вводом; setNodeCoord по оси." },
        { title: "Опоры по 6 DOF (uz, rx, ry)", status: "done", note: "Ручной режим показывает 6 DOF в 3D; типовые опоры через constrainedFromType(dim)." },
        { title: "Нагрузки Fz, Mx, My", status: "done", note: "Панель узла в 3D: Fx/Fy/Fz и Mx/My/Mz покомпонентно." },
        { title: "Авто-ориентация сечения (ref_vector) для плоских рам", status: "done", note: "withAutoRefVector: плоская рама в 3D считается по сильной оси I_z, совпадает с 2D бит-в-бит." },
        { title: "Распределённая нагрузка qz по второй плоскости", status: "next", note: "Сейчас в UI распределённая только qy." },
        { title: "Ручной поворот сечения вокруг оси стержня в UI", status: "later", note: "Дать пользователю менять ref_vector осознанно (для пространственных рам)." },
      ],
    },
    {
      key: "diagrams-3d",
      title: "Этап 5. Эпюры и результаты 3D",
      icon: "ChartSpline",
      horizon: "После канвы",
      summary: "Данные для 3D-эпюр уже приходят с бэка; нужны переключатели и отрисовка по двум плоскостям.",
      tasks: [
        { title: "Переключатели эпюр Qz, My, T", status: "later", note: "Сейчас в UI только Qy и Mz." },
        { title: "Эпюра прогиба uz", status: "later" },
        { title: "Деформированная форма в 3D", status: "later", note: "Сейчас deformed по uy (2D)." },
        { title: "PDF-отчёт с 3D-схемой и эпюрами", status: "later" },
      ],
    },
  ],
};

// ============================================================
// КАРТА 6 — Выход на MVP (источник: docs/webapp/roadmap-ui.md, аудит 85/100)
// ============================================================
const MVP_ROADMAP: Roadmap = {
  slug: "mvp",
  title: "Выход на MVP",
  eyebrow: "Готовность к запуску",
  description:
    "Чек-лист готовности к публичному запуску по итогам комплексного аудита (оценка 85/100). Четыре блока: расчётное ядро CAE, честность контента, структура/навигация, UI и тёмная тема. Сначала закрываем блокеры доверия, остальное — на постзапуск.",
  icon: "Rocket",
  state: "active",
  source: "docs/webapp/roadmap-ui.md · «Аудит качества перед МВП» (2026-05-29)",
  phases: [
    {
      key: "core",
      title: "Блок A. Расчётное ядро CAE (критично)",
      icon: "Cpu",
      horizon: "Готовность ~92%",
      summary: "Честность расчёта недопустимо нарушать. Все критичные ошибки ядра закрыты.",
      tasks: [
        { title: "A1 · σ-Мизес по двум точкам сечения", status: "done", note: "Крайнее волокно |σN|+σизг и нейтральная ось √(σN²+3τ²). solver.py." },
        { title: "A2 · Учёт Qz в 3D-сдвиге", status: "done", note: "τ=√(τy²+τz²), двухосный изгиб консервативно." },
        { title: "A3 · Мизес→Трэска как верхняя оценка", status: "done", note: "Коэффициент 1.1547 с явной меткой. checks/shared.ts." },
        { title: "A4 · Знак M_y(x) в 3D", status: "done", note: "dM_y/dx = −Q_z." },
        { title: "A5 · W и предупреждение по несимметричным сечениям", status: "done" },
      ],
    },
    {
      key: "honesty",
      title: "Блок B. Честность контента (блокеры доверия)",
      icon: "ShieldCheck",
      horizon: "Закрыто",
      summary: "Контент не обещает того, чего нет. Все блокеры доверия закрыты до запуска.",
      tasks: [
        { title: "B1 · Нелинейный P-Δ + честный лендинг", status: "done", note: "Убраны несуществующие упругопластичность и бенчмарки." },
        { title: "B2 · Цифра «95% покупают диплом» без источника", status: "done", note: "Убрана из вёрстки и из текстов в БД; блок переписан на «Мы наставляем, а не делаем за вас» (без «учим» — нет образовательной лицензии)." },
        { title: "B3 · Пустые контакты-fallback", status: "done", note: "FALLBACK в useContacts.ts заполнен телефоном, e-mail и ВК — связь есть даже при сбое API." },
        { title: "B4 · Гарантия возврата на /pricing", status: "done", note: "Пункт о возврате + ссылка на оферту добавлены в блок «Что мы гарантируем»." },
        { title: "B5 · Согласовать сроки ответа («2 часа» vs «48/12 ч»)", status: "done", note: "Единый срок 48 ч / экспресс 12 ч на /pricing и в FAQ." },
      ],
    },
    {
      key: "structure",
      title: "Блок C. Структура и навигация",
      icon: "Network",
      horizon: "Частично",
      summary: "Маршруты, доступы и SEO-полнота.",
      tasks: [
        { title: "C1 · Закрыть доступ к /admin/generator", status: "done", note: "Открыт только админу и владельцу." },
        { title: "C2 · Добавить /privacy и /offer в sitemap.xml", status: "done", note: "Добавлены в backend get-contacts (?resource=sitemap)." },
        { title: "C3 · Ссылка на /cae в футере", status: "done", note: "Пункт «CAE-сервис» добавлен в навигацию футера." },
        { title: "C4 · Lazy-loading маршрутов", status: "later", note: "Сейчас все импорты статические." },
      ],
    },
    {
      key: "ui-theme",
      title: "Блок D. UI и тёмная тема",
      icon: "Moon",
      horizon: "Полировка",
      summary: "Единый стиль и корректная тёмная тема на всех экранах.",
      tasks: [
        { title: "D1 · NotFound под тёмную тему", status: "research", note: "Файл NotFound.tsx защищён платформой от правки." },
        { title: "D2 · Кнопка Google под тёмную тему", status: "done", note: "Рамка и тень адаптированы под тёмную тему (dark:border/shadow), белый фон по гайдлайну Google." },
        { title: "D3 · Убрать hardcoded color в .btn-drawing-accent:hover", status: "done", note: "Введена переменная --drawing-on-accent." },
        { title: "D4 · Зелёный реакций в демо через переменную темы", status: "done", note: "Введена переменная --drawing-success (светлее в тёмной теме)." },
      ],
    },
    {
      key: "seo-geo",
      title: "Блок E. SEO / GEO под ИИ-поиск",
      icon: "Search",
      horizon: "Стартовали MVP 2D",
      summary: "Вывод сайта в поиск и ИИ-выдачу (Google AI Overviews, Алиса, Gemini). База была сильной, закрыли структурные данные и 2D-позиционирование.",
      tasks: [
        { title: "Schema.org Organization / WebSite / FAQPage / Article", status: "done", note: "GlobalSeo + страницы FAQ и блога." },
        { title: "Course (/program) и Service+Offers (/pricing)", status: "done", note: "Хелперы в src/lib/seo.ts." },
        { title: "SoftwareApplication для /cae", status: "done", note: "Запросы «расчёт рамы онлайн»." },
        { title: "BreadcrumbList на ключевых страницах", status: "done" },
        { title: "ItemList для блога", status: "done" },
        { title: "Авто-sitemap со статьями и lastmod (+/cae)", status: "done", note: "backend get-contacts ?resource=sitemap." },
        { title: "2D-позиционирование CAE (3D — «скоро»)", status: "done", note: "Старт MVP в режиме 2D." },
        { title: "noscript-контент для краулеров без JS", status: "done", note: "H1, описание, ссылки в index.html." },
        { title: "robots: закрыть /roadmaps", status: "done" },
        { title: "Перелинковка и тексты под ядро запросов", status: "next", note: "Развивать оба направления: наставничество и CAE." },
        { title: "Регистрация в Я.Вебмастер и Google Search Console", status: "next", note: "Отправить sitemap, отслеживать индексацию." },
        { title: "Контент-план блога под частотные запросы", status: "later" },
      ],
    },
    {
      key: "post-launch",
      title: "Постзапуск (M10+)",
      icon: "Clock",
      horizon: "После старта",
      summary: "Защита от обхода лимитов и инфраструктурные доработки — не блокируют запуск.",
      tasks: [
        { title: "Серверный лимит демо по IP", status: "done", note: "Учёт демо-расчётов в cae_demo_usage по IP — обход через инкогнито закрыт (тикет #57)." },
        { title: "Усиление: FingerprintJS + SmartCaptcha", status: "research", note: "Доп. защита поверх IP-лимита, если начнут обходить через VPN." },
        { title: "Мягкая плашка при детекте VPN", status: "later" },
      ],
    },
  ],
};

/** Все дорожные карты в одном месте. Первая — основная (PLM). */
export const ROADMAPS: Roadmap[] = [
  MVP_ROADMAP,
  PLM_ROADMAP,
  CAE_3D_ROADMAP,
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