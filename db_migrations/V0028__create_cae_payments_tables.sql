-- V0028: Платежи CAE — подписки, пакеты расчётов, журнал транзакций, счётчики использования

CREATE TABLE IF NOT EXISTS cae_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES sso_users(id),
    tariff_id BIGINT NOT NULL REFERENCES cae_tariffs(id),
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
    cancelled_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cae_subs_user_status ON cae_subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_cae_subs_expires ON cae_subscriptions(expires_at) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS cae_packages (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    solves_count INTEGER NOT NULL CHECK (solves_count > 0),
    price_kopecks INTEGER NOT NULL CHECK (price_kopecks > 0),
    discount_percent INTEGER NOT NULL DEFAULT 0,
    valid_days INTEGER NOT NULL DEFAULT 365,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cae_user_packages (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES sso_users(id),
    package_id BIGINT NOT NULL REFERENCES cae_packages(id),
    solves_total INTEGER NOT NULL,
    solves_remaining INTEGER NOT NULL,
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cae_user_packages_active 
    ON cae_user_packages(user_id, expires_at) 
    WHERE solves_remaining > 0;

CREATE TABLE IF NOT EXISTS cae_payments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES sso_users(id),
    order_id VARCHAR(64) NOT NULL UNIQUE,
    provider VARCHAR(32) NOT NULL DEFAULT 'alfabank',
    provider_order_id VARCHAR(128) NULL,
    item_type VARCHAR(32) NOT NULL,
    item_ref_id BIGINT NOT NULL,
    amount_kopecks INTEGER NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'RUB',
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    description TEXT NULL,
    return_url TEXT NULL,
    form_url TEXT NULL,
    raw_response JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cae_payments_user ON cae_payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cae_payments_status ON cae_payments(status);
CREATE INDEX IF NOT EXISTS idx_cae_payments_provider_order ON cae_payments(provider_order_id);

CREATE TABLE IF NOT EXISTS cae_usage_counters (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES sso_users(id),
    period_year INTEGER NOT NULL,
    period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    free_solves_used INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_cae_usage_user_period 
    ON cae_usage_counters(user_id, period_year DESC, period_month DESC);