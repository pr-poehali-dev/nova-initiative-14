-- Тарифы виджета (ранее были захардкожены в коде PLANS)
CREATE TABLE IF NOT EXISTS widget_tariffs (
    id              SERIAL PRIMARY KEY,
    slug            VARCHAR(50)  NOT NULL UNIQUE,
    name            VARCHAR(100) NOT NULL,
    price_monthly   INTEGER      NOT NULL DEFAULT 0,   -- в рублях
    calc_limit      INTEGER      NOT NULL DEFAULT 0,   -- расчётов в месяц
    max_sites       INTEGER      NOT NULL DEFAULT 1,   -- -1 = безлимит
    features        TEXT[]       NOT NULL DEFAULT '{}',
    is_popular      BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order      INTEGER      NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO widget_tariffs (slug, name, price_monthly, calc_limit, max_sites, features, is_popular, sort_order) VALUES
('start',  'Старт',  3900,  1000,  1,
    ARRAY['До 1 000 расчётов в месяц','1 сайт','Заявки на email','Настраиваемый лимит расчётов в сутки на посетителя'],
    FALSE, 1),
('business','Бизнес', 8900,  5000,  3,
    ARRAY['До 5 000 расчётов в месяц','До 3 сайтов','Приоритетная поддержка','Логотип компании в виджете','Настраиваемый лимит расчётов в сутки на посетителя'],
    TRUE, 2),
('zavod',  'Завод',  19900, 50000, -1,
    ARRAY['До 50 000 расчётов в месяц','Безлимит сайтов','Webhook в вашу CRM','Брендирование под вас','Настраиваемый лимит расчётов в сутки на посетителя'],
    FALSE, 3)
ON CONFLICT (slug) DO NOTHING;

-- Глобальные параметры экономики для расчёта себестоимости единицы расчёта
CREATE TABLE IF NOT EXISTS pricing_settings (
    id                       INTEGER PRIMARY KEY DEFAULT 1,
    monthly_infra_rub        INTEGER NOT NULL DEFAULT 15000,  -- фикс. инфраструктура в месяц, ₽
    gb_second_rub            NUMERIC(12,8) NOT NULL DEFAULT 0.00000333, -- ставка за 1 GB-секунду, ₽
    cae_timeout_sec          NUMERIC(8,3)  NOT NULL DEFAULT 30,    -- таймаут CAE-функции, с (биллинг)
    cae_memory_mb            INTEGER NOT NULL DEFAULT 256,         -- память CAE-функции, МБ
    cae_avg_duration_ms      INTEGER NOT NULL DEFAULT 7,           -- факт. длительность расчёта, мс
    widget_timeout_sec       NUMERIC(8,3)  NOT NULL DEFAULT 30,
    widget_memory_mb         INTEGER NOT NULL DEFAULT 256,
    widget_avg_duration_ms   INTEGER NOT NULL DEFAULT 7,
    monthly_calc_volume      INTEGER NOT NULL DEFAULT 10000,       -- ожид. число расчётов/мес для разнесения фикс. расходов
    margin_multiplier        NUMERIC(6,2) NOT NULL DEFAULT 10,     -- множитель рекомендованной цены
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pricing_settings_singleton CHECK (id = 1)
);

INSERT INTO pricing_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
