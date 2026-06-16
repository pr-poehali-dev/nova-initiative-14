-- MindMap-карты для модуля «Бизнес-планы» в ЛК владельца.
-- Доступ только владельцу (is_owner), проверяется на бэкенде.
-- Содержимое карты (узлы + связи) храним как JSONB.

CREATE TABLE IF NOT EXISTS owner_mindmaps (
    id          SERIAL PRIMARY KEY,
    owner_id    INTEGER NOT NULL REFERENCES sso_users(id),
    title       VARCHAR(300) NOT NULL DEFAULT 'Карта',
    data        JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_owner_mindmaps_owner
    ON owner_mindmaps(owner_id, updated_at DESC);
