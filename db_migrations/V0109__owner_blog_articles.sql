-- Раздел маркетинга «Статьи для блогов»: закрытое хранилище статей владельца
-- (для Яндекс Дзен и др. блог-площадок). Доступ только владельцу (is_owner).

CREATE TABLE IF NOT EXISTS owner_blog_articles (
    id          SERIAL PRIMARY KEY,
    owner_id    INTEGER NOT NULL REFERENCES sso_users(id),
    title       VARCHAR(300) NOT NULL DEFAULT 'Новая статья',
    subtitle    VARCHAR(400) NOT NULL DEFAULT '',
    cover_emoji VARCHAR(16) NOT NULL DEFAULT '📝',
    platform    VARCHAR(40) NOT NULL DEFAULT 'dzen',
    tags        VARCHAR(400) NOT NULL DEFAULT '',
    status      VARCHAR(20) NOT NULL DEFAULT 'draft',
    content     TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_articles_owner
    ON owner_blog_articles(owner_id, updated_at DESC);
