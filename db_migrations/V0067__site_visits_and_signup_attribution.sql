-- Статистика посещений: источники переходов + атрибуция регистраций (первое касание).

-- 1. Таблица визитов сайта. Одна строка = один заход (сессия) посетителя.
--    Фокус — ОТКУДА пришёл: тип источника, реферер, UTM, QR-флаер, страница входа.
CREATE TABLE IF NOT EXISTS t_p28138419_nova_initiative_14.site_visits (
    id              bigserial PRIMARY KEY,
    -- Нормализованный тип источника: direct | referral | organic | social |
    -- utm | qr_flyer | internal
    source_type     varchar(24)  NOT NULL DEFAULT 'direct',
    -- Человекочитаемый ярлык источника (домен реферера, utm_source, qr-метка)
    source_label    varchar(160) NOT NULL DEFAULT 'Прямой заход',
    referrer        text         NULL,
    utm_source      varchar(120) NULL,
    utm_medium      varchar(120) NULL,
    utm_campaign    varchar(120) NULL,
    -- Страница, на которую пришёл посетитель (path)
    landing_path    varchar(255) NULL,
    -- Весь путь по сайту за визит (для просмотра поведения)
    pages           text         NULL,
    device          varchar(24)  NULL,
    time_on_site    integer      NOT NULL DEFAULT 0,
    ip              varchar(64)  NULL,
    user_agent      text         NULL,
    -- Дедупликация повторных beacon'ов одного визита
    visit_key       varchar(80)  NULL UNIQUE,
    created_at      timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_visits_created ON t_p28138419_nova_initiative_14.site_visits (created_at);
CREATE INDEX IF NOT EXISTS idx_site_visits_source  ON t_p28138419_nova_initiative_14.site_visits (source_type);

-- 2. Атрибуция регистрации по ПЕРВОМУ касанию.
--    Источник первого визита запоминается на фронте и передаётся при регистрации.
ALTER TABLE t_p28138419_nova_initiative_14.sso_users
    ADD COLUMN IF NOT EXISTS signup_source_type  varchar(24)  NULL,
    ADD COLUMN IF NOT EXISTS signup_source_label varchar(160) NULL,
    ADD COLUMN IF NOT EXISTS signup_landing_path varchar(255) NULL,
    ADD COLUMN IF NOT EXISTS signup_utm_source   varchar(120) NULL,
    ADD COLUMN IF NOT EXISTS signup_utm_campaign varchar(120) NULL;