-- Конструктор бизнес-плана по методике АО «Корпорация «МСП» (учебная тетрадь).
-- Доступ только владельцу (is_owner). Все разделы и формы — единый JSONB-документ.

CREATE TABLE IF NOT EXISTS owner_business_plans (
    id          SERIAL PRIMARY KEY,
    owner_id    INTEGER NOT NULL REFERENCES sso_users(id),
    title       VARCHAR(300) NOT NULL DEFAULT 'Бизнес-план',
    data        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_owner_bizplan_owner
    ON owner_business_plans(owner_id, updated_at DESC);
