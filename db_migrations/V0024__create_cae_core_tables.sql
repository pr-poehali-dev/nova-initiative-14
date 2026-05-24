-- ===== CAE: Проекты пользователя =====
CREATE TABLE IF NOT EXISTS cae_projects (
    id BIGSERIAL PRIMARY KEY,
    owner_id BIGINT NOT NULL REFERENCES sso_users(id),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(64) NOT NULL,
    description TEXT,
    project_type VARCHAR(32) NOT NULL DEFAULT 'frame_3d',
    units_length VARCHAR(8) NOT NULL DEFAULT 'm',
    units_force VARCHAR(8) NOT NULL DEFAULT 'N',
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    current_version_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cae_projects_owner ON cae_projects(owner_id, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cae_projects_owner_slug ON cae_projects(owner_id, slug);

-- ===== CAE: Версии модели проекта (JSON-снимки) =====
CREATE TABLE IF NOT EXISTS cae_project_versions (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES cae_projects(id),
    version_number INTEGER NOT NULL DEFAULT 1,
    model_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
    comment TEXT,
    created_by BIGINT NOT NULL REFERENCES sso_users(id),
    is_draft BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cae_versions_project ON cae_project_versions(project_id, created_at DESC);

-- ===== CAE: История запусков решателя =====
CREATE TABLE IF NOT EXISTS cae_solver_runs (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES cae_projects(id),
    version_id BIGINT REFERENCES cae_project_versions(id),
    owner_id BIGINT NOT NULL REFERENCES sso_users(id),
    status VARCHAR(16) NOT NULL DEFAULT 'queued',
    payload_jsonb JSONB,
    response_jsonb JSONB,
    duration_ms INTEGER,
    error_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cae_runs_project ON cae_solver_runs(project_id, created_at DESC);

-- ===== CAE: Whitelist раннего доступа =====
CREATE TABLE IF NOT EXISTS cae_waitlist (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(200),
    user_id BIGINT REFERENCES sso_users(id),
    role_self VARCHAR(64),
    purpose TEXT,
    referral_source VARCHAR(64),
    ip VARCHAR(64),
    user_agent TEXT,
    invited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cae_waitlist_email ON cae_waitlist(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_cae_waitlist_invited ON cae_waitlist(invited_at);

-- ===== CAE: Тарифы (заготовка для биллинга M9) =====
CREATE TABLE IF NOT EXISTS cae_tariffs (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    price_monthly INTEGER NOT NULL DEFAULT 0,
    price_yearly INTEGER NOT NULL DEFAULT 0,
    price_one_off INTEGER NOT NULL DEFAULT 0,
    max_projects INTEGER NOT NULL DEFAULT 5,
    max_elements INTEGER NOT NULL DEFAULT 50,
    allow_nonlinear BOOLEAN NOT NULL DEFAULT FALSE,
    allow_team BOOLEAN NOT NULL DEFAULT FALSE,
    max_team_members INTEGER NOT NULL DEFAULT 1,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO cae_tariffs (slug, name, price_monthly, price_one_off, max_projects, max_elements, allow_nonlinear, sort_order)
VALUES
  ('demo', 'Демо', 0, 0, 0, 10, FALSE, 1),
  ('basic', 'Базовый', 59000, 20000, 5, 50, FALSE, 2),
  ('advanced', 'Продвинутый', 149000, 0, 50, 500, FALSE, 3),
  ('pro', 'Профи', 349000, 0, 9999, 5000, TRUE, 4)
ON CONFLICT (slug) DO NOTHING;