-- Финансовая модель бизнес-плана для модуля «Бизнес-планы» (ЛК владельца).
-- Доступ только владельцу (is_owner), проверяется на бэкенде.
-- Все параметры модели (цена, переменные/постоянные затраты, статьи) — JSONB.

CREATE TABLE IF NOT EXISTS owner_finance_models (
    id          SERIAL PRIMARY KEY,
    owner_id    INTEGER NOT NULL REFERENCES sso_users(id),
    title       VARCHAR(300) NOT NULL DEFAULT 'Финансовая модель',
    data        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_owner_finance_owner
    ON owner_finance_models(owner_id, updated_at DESC);
