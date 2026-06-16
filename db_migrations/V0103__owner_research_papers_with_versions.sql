-- Раздел «В разработке» в ЛК владельца: хранилище НИР (научно-исследовательских
-- работ) с учётом версий. Доступ — только владельцу (is_owner), проверяется на
-- бэкенде. Каждое сохранение создаёт новую версию (история не теряется).

CREATE TABLE IF NOT EXISTS owner_research_papers (
    id          SERIAL PRIMARY KEY,
    owner_id    INTEGER NOT NULL REFERENCES sso_users(id),
    title       VARCHAR(300) NOT NULL DEFAULT 'Без названия',
    content     TEXT NOT NULL DEFAULT '',
    status      VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_research_papers_owner
    ON owner_research_papers(owner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS owner_research_versions (
    id          SERIAL PRIMARY KEY,
    paper_id    INTEGER NOT NULL REFERENCES owner_research_papers(id),
    version_no  INTEGER NOT NULL,
    title       VARCHAR(300) NOT NULL,
    content     TEXT NOT NULL,
    note        VARCHAR(300),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_research_versions_paper
    ON owner_research_versions(paper_id, version_no DESC);
