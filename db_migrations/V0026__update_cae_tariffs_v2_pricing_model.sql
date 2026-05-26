-- ================================================================
-- Тарифная модель CAE v2.0 (2026-05-26)
-- Изменения:
--   1. Добавляем колонки max_solves_per_month и solve_reset_day
--   2. Пересчитываем все строки под новую модель ценообразования
--   3. Добавляем тарифы free и enterprise, убираем advanced
--   4. Исправляем allow_team / max_team_members для pro
-- ================================================================

-- Новые колонки
ALTER TABLE cae_tariffs
  ADD COLUMN IF NOT EXISTS max_solves_per_month INTEGER NOT NULL DEFAULT -1,
  ADD COLUMN IF NOT EXISTS solve_reset_day      SMALLINT  NOT NULL DEFAULT 1;
-- max_solves_per_month: -1 = без лимита, >0 = лимит в месяц
-- solve_reset_day: день месяца для сброса счётчика (1 = 1-е число)

-- Обновляем demo: 5 элементов, 1 расчёт (в localStorage, здесь для справки)
UPDATE cae_tariffs SET
  name                  = 'Демо',
  max_elements          = 5,
  max_projects          = 0,
  max_solves_per_month  = 1,
  price_monthly         = 0,
  price_one_off         = 0,
  is_public             = FALSE,   -- не показываем в публичном списке тарифов
  sort_order            = 0
WHERE slug = 'demo';

-- Добавляем free (бесплатный аккаунт)
INSERT INTO cae_tariffs
  (slug, name, price_monthly, price_yearly, price_one_off,
   max_projects, max_elements, max_solves_per_month, solve_reset_day,
   allow_nonlinear, allow_team, max_team_members, is_public, sort_order)
VALUES
  ('free', 'Старт', 0, 0, 0,
   3, 10, 3, 1,
   FALSE, FALSE, 1, TRUE, 1)
ON CONFLICT (slug) DO UPDATE SET
  name                  = EXCLUDED.name,
  max_projects          = EXCLUDED.max_projects,
  max_elements          = EXCLUDED.max_elements,
  max_solves_per_month  = EXCLUDED.max_solves_per_month,
  solve_reset_day       = EXCLUDED.solve_reset_day,
  is_public             = EXCLUDED.is_public,
  sort_order            = EXCLUDED.sort_order;

-- Обновляем basic: цена 390 ₽, 50 элементов, без лимита расчётов
UPDATE cae_tariffs SET
  name                  = 'Базовый',
  price_monthly         = 39000,
  price_one_off         = 20000,
  max_projects          = 10,
  max_elements          = 50,
  max_solves_per_month  = -1,
  sort_order            = 2
WHERE slug = 'basic';

-- Скрываем advanced — тариф упразднён, заменён логикой basic/pro
UPDATE cae_tariffs SET
  is_public  = FALSE,
  sort_order = 99
WHERE slug = 'advanced';

-- Обновляем pro: цена 990 ₽, 500 элементов, командный доступ до 3 чел.
UPDATE cae_tariffs SET
  name                  = 'Профи',
  price_monthly         = 99000,
  max_projects          = 9999,
  max_elements          = 500,
  max_solves_per_month  = -1,
  allow_team            = TRUE,
  max_team_members      = 3,
  sort_order            = 3
WHERE slug = 'pro';

-- Добавляем enterprise
INSERT INTO cae_tariffs
  (slug, name, price_monthly, price_yearly, price_one_off,
   max_projects, max_elements, max_solves_per_month, solve_reset_day,
   allow_nonlinear, allow_team, max_team_members, is_public, sort_order)
VALUES
  ('enterprise', 'Корпоратив', 0, 0, 0,
   9999, 5000, -1, 1,
   TRUE, TRUE, 10, FALSE, 4)
ON CONFLICT (slug) DO UPDATE SET
  name             = EXCLUDED.name,
  max_elements     = EXCLUDED.max_elements,
  allow_nonlinear  = EXCLUDED.allow_nonlinear,
  allow_team       = EXCLUDED.allow_team,
  max_team_members = EXCLUDED.max_team_members,
  sort_order       = EXCLUDED.sort_order;
