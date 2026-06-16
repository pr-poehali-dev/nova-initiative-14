-- Сохранённые пользователем пресеты оформления документов (вуз + кафедра +
-- настройки). Универсально: пригодится для НИР, ВКР, диплома, диссертации.

CREATE TABLE IF NOT EXISTS owner_format_presets (
    id          SERIAL PRIMARY KEY,
    owner_id    INTEGER NOT NULL REFERENCES sso_users(id),
    name        VARCHAR(300) NOT NULL,
    university  VARCHAR(400) NOT NULL DEFAULT '',
    department  VARCHAR(400) NOT NULL DEFAULT '',
    format      JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_format_presets_owner
    ON owner_format_presets(owner_id, updated_at DESC);
