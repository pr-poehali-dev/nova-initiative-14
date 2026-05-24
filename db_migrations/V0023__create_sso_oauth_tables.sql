CREATE TABLE IF NOT EXISTS sso_user_identities (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES sso_users(id),
    provider VARCHAR(32) NOT NULL,
    provider_user_id VARCHAR(128) NOT NULL,
    email VARCHAR(255),
    raw_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_sso_identities_user ON sso_user_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_sso_identities_email ON sso_user_identities(email);

CREATE TABLE IF NOT EXISTS sso_oauth_states (
    id BIGSERIAL PRIMARY KEY,
    state_hash CHAR(64) NOT NULL UNIQUE,
    provider VARCHAR(32) NOT NULL,
    code_verifier TEXT,
    redirect_after TEXT,
    ip VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sso_oauth_states_expires ON sso_oauth_states(expires_at);