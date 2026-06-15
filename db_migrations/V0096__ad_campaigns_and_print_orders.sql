-- Рекламные кампании (онлайн и офлайн/печать). slug = utm_campaign.
CREATE TABLE IF NOT EXISTS t_p28138419_nova_initiative_14.ad_campaigns (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(120) NOT NULL UNIQUE,          -- utm_campaign, латиница/цифры/_/-
    name VARCHAR(200) NOT NULL,                  -- человекочитаемое название
    kind VARCHAR(16) NOT NULL DEFAULT 'print',   -- print | online
    config_jsonb JSONB,                          -- сохранённая конфигурация листовки (FlyerOptions)
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,    -- заказана в печать -> редактирование запрещено
    created_by BIGINT REFERENCES t_p28138419_nova_initiative_14.sso_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_slug ON t_p28138419_nova_initiative_14.ad_campaigns(slug);

-- Заказы печати по кампании (каждый заказ — отдельная запись, тиражи суммируются).
CREATE TABLE IF NOT EXISTS t_p28138419_nova_initiative_14.ad_campaign_print_orders (
    id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES t_p28138419_nova_initiative_14.ad_campaigns(id),
    quantity INTEGER NOT NULL,                    -- сколько листовок напечатано
    total_kopecks INTEGER NOT NULL DEFAULT 0,     -- общая стоимость заказа (копейки)
    created_by BIGINT REFERENCES t_p28138419_nova_initiative_14.sso_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_print_orders_campaign ON t_p28138419_nova_initiative_14.ad_campaign_print_orders(campaign_id);