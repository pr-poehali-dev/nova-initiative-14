CREATE TABLE IF NOT EXISTS engineering_articles (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(200) NOT NULL UNIQUE,
    h1 VARCHAR(500) NOT NULL,
    seo_title VARCHAR(255) NOT NULL,
    seo_description TEXT NOT NULL,
    seo_keywords TEXT,
    summary TEXT NOT NULL,
    quick_facts JSONB DEFAULT '[]'::jsonb,
    body_html TEXT NOT NULL,
    bibliography JSONB DEFAULT '[]'::jsonb,
    author_name VARCHAR(200) NOT NULL DEFAULT 'Команда Диплом-Инж.рф',
    author_role VARCHAR(200) NOT NULL DEFAULT 'Инженер-конструктор, наставник',
    cover_url TEXT,
    reading_minutes INTEGER NOT NULL DEFAULT 10,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_published BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_articles_slug ON engineering_articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_published ON engineering_articles(is_published, published_at DESC);