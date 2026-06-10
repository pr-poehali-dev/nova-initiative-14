-- Таблица отдельных просмотров страниц/постов для подсчёта посещаемости.
-- Каждая строка — один просмотр конкретного пути визитёром.
-- Уникальность визитёра определяется visitor_id (стабильный ID в localStorage).
CREATE TABLE IF NOT EXISTS page_views (
    id          BIGSERIAL PRIMARY KEY,
    path        VARCHAR(255) NOT NULL,
    page_title  VARCHAR(200),
    visitor_id  VARCHAR(80) NOT NULL,
    source_type VARCHAR(24),
    device      VARCHAR(24),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views (path);
CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views (created_at);
-- Для быстрого подсчёта уникальных визитёров по пути.
CREATE INDEX IF NOT EXISTS idx_page_views_path_visitor ON page_views (path, visitor_id);
