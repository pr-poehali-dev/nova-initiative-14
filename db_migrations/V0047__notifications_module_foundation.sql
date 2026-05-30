-- ============================================================
-- Модуль уведомлений и трекинга. Этап 1 (база) + поля для этапов 2-3.
-- FK без каскадных действий (NO ACTION по умолчанию) — чистка через приложение.
-- ============================================================

-- 1) Уведомления пользователя. user_id = NULL → broadcast (всем).
CREATE TABLE IF NOT EXISTS user_notifications (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NULL REFERENCES sso_users(id),
    type        VARCHAR(24) NOT NULL DEFAULT 'system',
    title       VARCHAR(200) NOT NULL,
    body        TEXT NULL,
    link        TEXT NULL,
    ticket_id   BIGINT NULL REFERENCES support_tickets(id),
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    read_at     TIMESTAMPTZ NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user
    ON user_notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_broadcast
    ON user_notifications (created_at DESC) WHERE user_id IS NULL;

-- 2) Прочитанность broadcast-уведомлений — персональная.
CREATE TABLE IF NOT EXISTS notification_reads (
    user_id         BIGINT NOT NULL REFERENCES sso_users(id),
    notification_id BIGINT NOT NULL REFERENCES user_notifications(id),
    read_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, notification_id)
);

-- 3) Поля авто-тикетов (этап 2): источник + дедупликация повторяющихся сбоев.
ALTER TABLE support_tickets
    ADD COLUMN IF NOT EXISTS source        VARCHAR(16) NOT NULL DEFAULT 'user',
    ADD COLUMN IF NOT EXISTS dedup_key     VARCHAR(120) NULL,
    ADD COLUMN IF NOT EXISTS occurrence_count INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_support_tickets_dedup
    ON support_tickets (dedup_key) WHERE dedup_key IS NOT NULL;

-- 4) Журнал версий CAE (этап 3).
CREATE TABLE IF NOT EXISTS cae_changelog (
    id           BIGSERIAL PRIMARY KEY,
    version      VARCHAR(20) NOT NULL,
    title        VARCHAR(200) NOT NULL,
    category     VARCHAR(16) NOT NULL DEFAULT 'feature',
    body         TEXT NULL,
    released_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cae_changelog_released
    ON cae_changelog (released_at DESC);

-- 5) Ачивка за решённые тикеты (этап 3, #31).
INSERT INTO achievement_types (code, title, description, icon, points, sort_order, progress_target, progress_source)
VALUES ('tickets_resolved', 'Соавтор продукта',
        'Ваши обращения, которые помогли улучшить сервис и были решены командой.',
        'CircleCheckBig', 0, 50, 5, 'tickets_resolved')
ON CONFLICT (code) DO NOTHING;