-- Партнёры white-label виджета CAE-калькулятора.
-- Каждому партнёру выдаётся API-ключ; виджет работает только на их доменах.
CREATE TABLE IF NOT EXISTS widget_partners (
    id              SERIAL PRIMARY KEY,
    api_key         VARCHAR(64) NOT NULL UNIQUE,
    company_name    VARCHAR(255) NOT NULL,
    contact_email   VARCHAR(255) NOT NULL,
    allowed_domains TEXT[] NOT NULL DEFAULT '{}',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    plan            VARCHAR(32) NOT NULL DEFAULT 'basic',
    monthly_calc_limit INTEGER NOT NULL DEFAULT 1000,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_widget_partners_api_key ON widget_partners(api_key);

-- Лог обращений виджета: и расчёты, и заявки. Для биллинга и аналитики партнёра.
CREATE TABLE IF NOT EXISTS widget_leads (
    id              SERIAL PRIMARY KEY,
    partner_id      INTEGER NOT NULL REFERENCES widget_partners(id),
    event_type      VARCHAR(16) NOT NULL,
    origin_domain   VARCHAR(255),
    calc_input      JSONB,
    calc_result     JSONB,
    customer_name   VARCHAR(255),
    customer_phone  VARCHAR(64),
    customer_email  VARCHAR(255),
    customer_comment TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_widget_leads_partner ON widget_leads(partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_widget_leads_type ON widget_leads(partner_id, event_type);
