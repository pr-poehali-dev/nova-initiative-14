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
| `src/lib/cae/analytic-deflection.ts` | `computeAnalytic(model)` — формульная проверка прогиба для типовых схем (консоль с P, балка с q, балка с P по центру). Используется в `EditorResultsPanel`. |
| `src/lib/cae-checks.ts` | `runChecks()` — проверки прочности и устойчивости (не трогалось). |
| `src/lib/cae-industry.ts` | `getIndustrySpec()` — нормативы прогиба по отраслям (не трогалось). |

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

## 9. Backend (НЕ рефакторился в этом заходе)

Эти файлы остаются монолитами — рефакторинг отложен из-за высокой чувствительности (JWT, OAuth, расчётный движок МКЭ):

- `backend/cae-solver/solver.py` (~1065 строк) — FEM-решатель
- `backend/sso-auth/index.py` (~1052 строки) — OAuth + JWT
- `backend/cae-verify/index.py` (~973 строки) — тестовые модели
- `backend/cae-api/index.py` (~477 строк) — CRUD проектов

Кандидаты на следующий заход — `cae-api/index.py` (низкий риск).
