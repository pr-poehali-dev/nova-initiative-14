# AI_CONTEXT_MAP

Карта структуры проекта **диплом-инж.рф** после рефакторинга.
Назначение карты — позволять ИИ-ассистенту быстро находить целевой файл
по логической задаче, не сканируя крупные монолиты.

> **Правило для будущих сессий:** перед редактированием большого файла
> сначала загляни в эту карту — найди модуль с нужной ответственностью.

---

## 1. CAE — Модель и API

`@/lib/cae-model` — **публичный barrel-модуль**. Импортируй отсюда всё, что
связано с расчётной моделью. Внутри — re-export из 4 узких файлов:

| Файл | Ответственность |
|---|---|
| `src/lib/cae/types.ts` | TypeScript-интерфейсы: `Material`, `Section`, `ModelNode`, `ModelElement`, `BoundaryCondition`, `ModelLoad`, `FrameModel`, `SolverResponse`, `AnalysisSettings`, `DofName`, `LoadType`, `StrengthTheory`, `IndustryKind` |
| `src/lib/cae/defaults.ts` | `DEFAULT_MATERIAL` (Ст3), `DEFAULT_SECTION` (I20), `DEFAULT_ANALYSIS_SETTINGS`, фабрика `emptyModel(dim)` |
| `src/lib/cae/utils.ts` | Чистые утилиты: `genId()`, `constrainedFromType(type, dim)` |
| `src/lib/cae/api.ts` | HTTP-обёртки: `getProjectModel()`, `saveProjectModel()`, `runSolver()`, тип `ApiResult<T>` |

Дополнительно:

| Файл | Ответственность |
|---|---|
| `src/lib/cae/analytic-deflection.ts` | `computeAnalytic(model)` — формульная проверка прогиба для типовых схем (консоль с P, балка с q, балка с P по центру). |
| `src/lib/cae-industry.ts` | `getIndustrySpec()` — нормативы прогиба по отраслям. |

### Проверки расчёта (η = actual / allowable)

`@/lib/cae-checks` — barrel + orchestrator `runChecks(model, result)`.

| Файл | Что проверяет |
|---|---|
| `src/lib/cae/checks/shared.ts` | Типы `ElementCheck`, `CheckKind`, `CheckStatus`; `classify(util)`, `utilizationColor()`, `recomputeStress()`, `theoryLabel()` |
| `src/lib/cae/checks/deflection.ts` | Прогиб: f ≤ [f] (отраслевые нормы из cae-industry) |
| `src/lib/cae/checks/strength.ts` | Прочность: σ_экв ≤ σ_т/n (Мизес / Треска / 1-я теория) |
| `src/lib/cae/checks/buckling.ts` | Устойчивость сжатых стержней: σ ≤ φ·[σ] (μ, λ, φ по СП 16.13330) |

### Валидация модели до запуска solver

`@/lib/cae-validate` — barrel + orchestrator `validateModel(model)`.

| Файл | Что проверяет |
|---|---|
| `src/lib/cae/validate/types.ts` | Типы `ValidationIssue`, `IssueLevel`, `IssueTargetKind`, константа `EPS` |
| `src/lib/cae/validate/global.ts` | Наличие узлов/элементов/опор/нагрузок, кинематическая изменяемость (≥3 DOF в 2D) |
| `src/lib/cae/validate/nodes.ts` | Совпадающие координаты, висячие узлы (orphan_node) |
| `src/lib/cae/validate/elements.ts` | Ссылки на узлы, петли, нулевая длина, отсутствие материала/сечения |
| `src/lib/cae/validate/bcs-loads.ts` | Опоры без узла, нагрузки без узла/элемента, нулевые нагрузки |

---

## 2. CAE — Каталог материалов, сечений, шаблонов

`@/lib/cae-catalog` — **публичный barrel-модуль**. Внутри re-export из:

| Файл | Ответственность |
|---|---|
| `src/data/cae-catalog-types.ts` | Типы: `MaterialCatalogEntry`, `SectionCatalogEntry`, `SectionType`, `FrameTemplate` |
| `src/data/cae-materials.ts` | `MATERIAL_CATALOG` (стали, чугуны, алюминий), `MATERIAL_GROUPS`, `findMaterial()` |
| `src/data/cae-sections.ts` | `I_BEAMS_8239`, `CHANNELS_8240`, `ANGLES_8509`, `PIPES_ROUND_10704`, `SECTION_CATALOG`, `SECTION_GROUPS`, `findSection()`, параметрические `makeRectSection()`, `makeCircleSection()`, `makeRectPipeSection()` |
| `src/data/cae-templates.ts` | `FRAME_TEMPLATES` — 10 типовых задач (консоль, балка, рама, ферма) с готовыми моделями для быстрого старта |

---

## 3. CAE — Действия в редакторе

`src/pages/cae-editor/useCaeActions.ts` — **тонкая обёртка**: связывает state
выбора с чистыми операциями. Не содержит бизнес-логики, только проксирует.

Чистые редьюсеры по группам:

| Файл | Что делает |
|---|---|
| `src/pages/cae-editor/actions/nodeActions.ts` | `addNodeAt`, `deleteSelection`, `duplicateSelection`, `moveNode` |
| `src/pages/cae-editor/actions/bcActions.ts` | `setBC`, `removeBC`, `toggleCustomDof` |
| `src/pages/cae-editor/actions/loadActions.ts` | `setNodalForce`, `removeNodalLoad`, `setNodalMoment`, `setDistributedLoad`, `addInSpanPoint`, `removeLoadById` |
| `src/pages/cae-editor/actions/elementActions.ts` | `pickMaterialForElement`, `pickSectionForElement`, `setElementHinge` |

Каждая функция принимает `FrameModel` и возвращает новую `FrameModel` (или
`ActionResult` с новой моделью + изменённой выборкой). Чисто, тестируемо.

---

## 4. CAE — UI редактора

### Правая панель свойств

`src/components/cae/editor/EditorRightPanel.tsx` — роутер по типу выбора.

| Файл | Что внутри |
|---|---|
| `src/components/cae/editor/panels/right/NumericInput.tsx` | Числовой input с commit-on-blur (фикс NaN при наборе) |
| `src/components/cae/editor/panels/right/InSpanForm.tsx` | Форма «добавить точечную силу в пролёте» |
| `src/components/cae/editor/panels/right/NodePropertiesPanel.tsx` | Свойства узла: координаты, опора, Fx/Fy/Mz |
| `src/components/cae/editor/panels/right/ElementPropertiesPanel.tsx` | Свойства стержня: материал, сечение, шарниры, q, список нагрузок |

### Панель результатов расчёта

`src/components/cae/editor/EditorResultsPanel.tsx` — композиция.

| Файл | Что внутри |
|---|---|
| `src/components/cae/editor/panels/results/formatNumber.ts` | Безопасный `formatNumber(v)` — обрабатывает null/NaN/Infinity без падения |
| `src/components/cae/editor/panels/results/ResultsSummary.tsx` | Сводка: узлы, элементы, прогиб, σ, запас, время |
| `src/components/cae/editor/panels/results/AnalyticCheck.tsx` | Сравнение КЭМ с аналит. формулой + цветовая шкала Δ% |
| `src/components/cae/editor/panels/results/ReactionsTable.tsx` | Таблица реакций опор Fx, Fy, Mz |
| `src/components/cae/editor/panels/results/DiagramControls.tsx` | Переключатели «вид схемы / тип эпюры / масштаб» |

### Канва — слой стержней

`src/components/cae/canvas/CanvasElements.tsx` — композитор (~95 строк).

| Файл | Что рисует |
|---|---|
| `src/components/cae/canvas/elements/ElementLines.tsx` | Видимая линия + невидимая зона клика (14 px), hover/selection |
| `src/components/cae/canvas/elements/ElementLabels.tsx` | Подписи e1, e2 … на середине стержня (с белой плашкой, перетаскиваемые) |
| `src/components/cae/canvas/elements/ElementHinges.tsx` | Маркеры шарниров (Mz=0) — белые кружки у узлов |
| `src/components/cae/canvas/elements/DeformedShape.tsx` | Пунктирная кривая прогиба (uy_local из эпюры + автомасштаб) |
| `src/components/cae/canvas/elements/DrawElementPreview.tsx` | Preview-линия от первого узла до курсора в режиме draw-element |

### Канва — слой нагрузок

`src/components/cae/canvas/CanvasLoads.tsx` — диспетчер по типу (~60 строк).

| Файл | Что рисует |
|---|---|
| `src/components/cae/canvas/loads/NodalLoad.tsx` | Узловая сила + момент Mz (круговая стрелка) |
| `src/components/cae/canvas/loads/InSpanLoad.tsx` | Точечная сила в пролёте элемента |
| `src/components/cae/canvas/loads/DistributedLoad.tsx` | Равномерно-распределённая q (гребёнка стрелок) |

---

## 5. PDF-отчёт CAE

`src/lib/generatePdfReport.ts` — генерация отчёта (главная функция остаётся
монолитом из-за сложного шейринга координат). Выделены изолированные модули:

| Файл | Ответственность |
|---|---|
| `src/lib/pdf/font-loader.ts` | Загрузка Roboto с кириллицей в jsPDF: `ensureCyrillicFont(doc)`, `fontState.name` |
| `src/lib/pdf/palette.ts` | Цветовая палитра `C`: ink, thin, accent, N/Q/M, grid |
| `src/lib/pdf/helpers.ts` | `fmt()`, `hline()`, `tableHeader()`, `tableRow()` — общие хелперы для всех страниц |

---

## 6. Страница /program

`src/pages/Program.tsx` — теперь композиция (~40 строк) вместо 391.

| Файл | Что показывает |
|---|---|
| `src/data/program-modules.ts` | `PROGRAM_MODULES` (10 модулей), `REVIEW_STEPS` (5 шагов проверки). Типы `ProgramModule`, `ReviewStep` |
| `src/components/program/ProgramHero.tsx` | Шапка с заголовком и характеристикой |
| `src/components/program/ProgramNav.tsx` | Якорная навигация по модулям |
| `src/components/program/ProgramModuleCard.tsx` | Карточка одного модуля (результат + задачи + ошибки + артефакты) |
| `src/components/program/ReviewProcess.tsx` | Секция «Как мы проверяем материалы» |
| `src/components/program/ProgramCta.tsx` | CTA «Записаться на диагностику» |

---

## 7. Стабильные модули (не трогались, но важны)

| Файл | Назначение |
|---|---|
| `src/lib/formatForce.ts` | `formatForce()`, `formatMoment()`, `formatDistLoad()` — единое форматирование сил с k/M суффиксами |
| `src/lib/auth.ts` | `getAccessToken()`, JWT логика на фронте |
| `src/lib/seo.ts` | SEO-хелперы, `SITE_URL` |
| `src/lib/safe-number.ts` | Безопасные числовые операции |
| `src/lib/cae-user-library.ts` | Пользовательская библиотека материалов/сечений |
| `src/hooks/useTariffs.ts` | Загрузка тарифов наставничества |
| `src/contexts/AuthContext.tsx` | Контекст авторизации |

---

## 8. Принципы рефакторинга (для будущих сессий)

1. **Публичные barrel-модули неизменны.** `@/lib/cae-model`, `@/lib/cae-catalog`
   и т.п. остаются точками входа. Это позволяет добавлять новые подмодули
   без правок у потребителей.
2. **Данные отдельно от логики.** Большие таблицы (материалы, сечения, контент
   страниц) — в `src/data/*.ts`. UI и хуки — отдельно.
3. **Хук = композитор.** React-хуки оборачивают чистые функции, не содержат
   бизнес-логики.
4. **Размер файла > 300 строк = сигнал.** Если новый файл подбирается к 300 —
   декомпозируй сразу, не жди.
5. **PDF-генерация — особый случай.** drawScheme и эпюры тесно связаны через
   систему координат, разделять их нельзя без рефакторинга всей логики
   рисования. Выноси только независимое: палитру, шрифты, таблицы.

---

## 9. Backend — cae-api

`backend/cae-api/index.py` — тонкий router (~95 строк), маршрутизирует
запросы по `?action=` и httpMethod. Открывает/закрывает соединение с БД.

| Файл | Ответственность |
|---|---|
| `backend/cae-api/auth.py` | JWT (HS256, секрет `SSO_JWT_SECRET`), CORS-заголовки, `auth_user(event)`, `json_response(status, body)` |
| `backend/cae-api/utils.py` | `slugify(name, fallback)` (русская транслитерация в slug), `project_to_dict(row)`, `client_ip(event)`, `user_agent(event)`, `EMAIL_RE` |
| `backend/cae-api/tariffs.py` | `action_tariffs(conn)` — публичный список тарифов из `cae_tariffs` |
| `backend/cae-api/waitlist.py` | `action_waitlist(conn, body, user, ua, ip)` — запись в waitlist раннего доступа |
| `backend/cae-api/projects.py` | CRUD проектов: `action_list_projects`, `action_get_project`, `action_create_project` (с квотой 5 активных), `action_update_project`, `action_archive_project`, `action_get_model`, `action_save_model` (новая версия) |

Тесты `backend/cae-api/tests.json` покрывают 7 кейсов (CORS, отсутствие
action, публичные эндпоинты, проверка авторизации). Все проходят после декомпозиции.

## 10. Backend — cae-verify

`backend/cae-verify/index.py` — тонкий handler (~78 строк) для прогона
10 эталонных задач сопромата против production-солвера. Допуск 5%.

| Файл | Ответственность |
|---|---|
| `backend/cae-verify/constants.py` | Сталь Ст3, двутавр I20 (ГОСТ 8239-89), `TOLERANCE=0.05`, `SOLVER_URL` (через ENV `CAE_SOLVER_URL`) |
| `backend/cae-verify/test_models.py` | 10 build-функций: консоль, шарнирная балка, портал, момент в центре, 4-точечный изгиб, неразрезная балка, треугольная ферма. `all_tests()` — полный набор |
| `backend/cae-verify/solver_client.py` | `call_solver(model)` — POST `?action=demo`. Парсеры: `find_max_abs_moment/axial`, `find_reaction`, `sum_reactions`, `sample_diagram`, `rel_error` |
| `backend/cae-verify/evaluator.py` | `evaluate_test(test)` — сравнение солвера с аналитикой по 8 типам метрик + сырой дамп узловых реакций и пиковых усилий для отладки FAIL |

Тесты `backend/cae-verify/tests.json` проходят. На реальных моделях:
PASS 10/10, погрешность прогибов 1.5–3%, моменты и реакции совпадают точно.

## 11. Backend (НЕ рефакторился)

Эти файлы остаются монолитами — рефакторинг отложен из-за высокой
чувствительности (JWT, OAuth, расчётный движок МКЭ):

- `backend/cae-solver/solver.py` (~1065 строк) — FEM-решатель
- `backend/sso-auth/index.py` (~1052 строки) — OAuth + JWT