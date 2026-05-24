-- SSO: пользователи
CREATE TABLE IF NOT EXISTS sso_users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    email_verified_at TIMESTAMPTZ,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(200),
    phone VARCHAR(32),
    avatar_url TEXT,
    locale VARCHAR(8) NOT NULL DEFAULT 'ru',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sso_users_email ON sso_users(email);

CREATE TABLE IF NOT EXISTS sso_user_roles (
    user_id BIGINT NOT NULL REFERENCES sso_users(id),
    role VARCHAR(32) NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role)
);

CREATE TABLE IF NOT EXISTS sso_refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES sso_users(id),
    client_id VARCHAR(64) NOT NULL DEFAULT 'main',
    token_hash CHAR(64) NOT NULL UNIQUE,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    user_agent TEXT,
    ip VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_sso_refresh_user ON sso_refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_sso_refresh_hash ON sso_refresh_tokens(token_hash);

CREATE TABLE IF NOT EXISTS sso_action_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES sso_users(id),
    purpose VARCHAR(32) NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sso_action_user ON sso_action_tokens(user_id, purpose);

CREATE TABLE IF NOT EXISTS sso_2fa_secrets (
    user_id BIGINT PRIMARY KEY REFERENCES sso_users(id),
    secret TEXT NOT NULL,
    backup_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
    enabled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sso_login_attempts (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255),
    ip VARCHAR(64),
    success BOOLEAN NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sso_login_ip ON sso_login_attempts(ip, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sso_login_email ON sso_login_attempts(email, created_at DESC);