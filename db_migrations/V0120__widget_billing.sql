-- === Биллинг виджета: тариф, месячные периоды, оплаты ===

-- Расширяем партнёра: цена тарифа и месячный лимит расчётов.
ALTER TABLE widget_partners
    ADD COLUMN IF NOT EXISTS monthly_price_rub INTEGER NOT NULL DEFAULT 3900,
    ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255);

-- Месячные биллинг-периоды партнёра.
-- Каждый месяц активируется автоматически (постоплата «в долг»):
--   calc_limit   — лимит расчётов по тарифу на месяц;
--   calc_used    — фактически использовано расчётов;
--   extra_packs  — сколько доп-пакетов (+50% лимита) выдано при перерасходе;
--   amount_due   — начислено к оплате (тариф + 50% * extra_packs);
--   amount_paid  — оплачено партнёром за этот период;
--   status       — 'open' | 'closed'.
CREATE TABLE IF NOT EXISTS widget_billing_periods (
    id            SERIAL PRIMARY KEY,
    partner_id    INTEGER NOT NULL REFERENCES widget_partners(id),
    period_start  DATE NOT NULL,              -- первый день месяца
    period_end    DATE NOT NULL,              -- последний день месяца
    plan          VARCHAR(32) NOT NULL,
    base_price_rub INTEGER NOT NULL,          -- цена тарифа на момент открытия
    calc_limit    INTEGER NOT NULL,           -- базовый лимит расчётов
    calc_used     INTEGER NOT NULL DEFAULT 0,
    extra_packs   INTEGER NOT NULL DEFAULT 0, -- доп-пакеты +50%
    amount_due    INTEGER NOT NULL DEFAULT 0, -- начислено всего, ₽
    amount_paid   INTEGER NOT NULL DEFAULT 0, -- оплачено, ₽
    status        VARCHAR(16) NOT NULL DEFAULT 'open',
    -- какие уведомления уже отправлены (чтобы не слать повторно)
    notified_80   BOOLEAN NOT NULL DEFAULT FALSE,
    notified_100  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (partner_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_billing_periods_partner ON widget_billing_periods(partner_id, period_start DESC);

-- Лог оплат партнёра (вносится вручную владельцем).
CREATE TABLE IF NOT EXISTS widget_payments (
    id          SERIAL PRIMARY KEY,
    partner_id  INTEGER NOT NULL REFERENCES widget_partners(id),
    period_id   INTEGER REFERENCES widget_billing_periods(id),
    amount_rub  INTEGER NOT NULL,
    paid_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    note        TEXT,
    created_by  INTEGER,                      -- user_id владельца, кто внёс
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_widget_payments_partner ON widget_payments(partner_id, paid_at DESC);

-- Цены тарифов по умолчанию для существующих партнёров.
UPDATE widget_partners SET monthly_price_rub = CASE plan
    WHEN 'business' THEN 8900
    WHEN 'zavod' THEN 19900
    WHEN 'demo' THEN 0
    ELSE 3900 END
WHERE monthly_price_rub = 3900;

-- Месячные лимиты расчётов по тарифу (сумма по всем посетителям).
UPDATE widget_partners SET monthly_calc_limit = CASE plan
    WHEN 'business' THEN 5000
    WHEN 'zavod' THEN 50000
    WHEN 'demo' THEN 100000
    ELSE 1000 END;
