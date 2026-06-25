-- Индивидуальная настройка лимита расчётов НА ОДНОГО ПОСЕТИТЕЛЯ для партнёра.
-- NULL = ограничение отключено (посетитель считает без лимита).
-- Число = столько пробных расчётов на одного посетителя (сессия/IP).
-- Если столбец не задан (NULL по умолчанию) — берём лимит из тарифа (PLAN_LIMITS).
ALTER TABLE widget_partners
    ADD COLUMN IF NOT EXISTS visitor_solve_limit INTEGER,
    ADD COLUMN IF NOT EXISTS visitor_limit_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN widget_partners.visitor_solve_limit IS
    'Лимит расчётов на одного посетителя. NULL = брать из тарифа.';
COMMENT ON COLUMN widget_partners.visitor_limit_enabled IS
    'Включено ли ограничение расчётов на посетителя. FALSE = безлимит.';
