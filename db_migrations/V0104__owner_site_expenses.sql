-- Учёт расходов на сайт для раздела «Экономика сайта» в ЛК владельца.
-- Доступ только владельцу (is_owner), проверяется на бэкенде.
-- Суммы храним в копейках (целое), чтобы избежать ошибок округления.

CREATE TABLE IF NOT EXISTS owner_site_expenses (
    id            SERIAL PRIMARY KEY,
    owner_id      INTEGER NOT NULL REFERENCES sso_users(id),
    category      VARCHAR(40) NOT NULL DEFAULT 'other',  -- platform | domain | design | ads | content | other
    title         VARCHAR(300) NOT NULL,
    amount_kopecks BIGINT NOT NULL DEFAULT 0,
    is_recurring  BOOLEAN NOT NULL DEFAULT false,        -- регулярный платёж (подписка/домен)
    spent_on      DATE NOT NULL DEFAULT CURRENT_DATE,
    note          VARCHAR(500),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_expenses_owner
    ON owner_site_expenses(owner_id, spent_on DESC);
