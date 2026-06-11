-- Серверный учёт демо-расчётов CAE по IP — защита от обхода лимита через
-- инкогнито/очистку localStorage. Лимит считается на бэке в cae-solver.
CREATE TABLE IF NOT EXISTS cae_demo_usage (
    id          BIGSERIAL PRIMARY KEY,
    ip          VARCHAR(64) NOT NULL,
    solve_count INTEGER NOT NULL DEFAULT 0,
    first_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (ip)
);

CREATE INDEX IF NOT EXISTS idx_cae_demo_usage_ip ON cae_demo_usage (ip);
