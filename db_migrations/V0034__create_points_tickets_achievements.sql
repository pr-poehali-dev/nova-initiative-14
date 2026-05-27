CREATE TABLE IF NOT EXISTS t_p28138419_nova_initiative_14.user_points (
    user_id BIGINT PRIMARY KEY REFERENCES t_p28138419_nova_initiative_14.sso_users(id),
    total_points INTEGER NOT NULL DEFAULT 0,
    referrals_count INTEGER NOT NULL DEFAULT 0,
    active_referrals_count INTEGER NOT NULL DEFAULT 0,
    waitlist_position INTEGER NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS t_p28138419_nova_initiative_14.user_points_log (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES t_p28138419_nova_initiative_14.sso_users(id),
    points INTEGER NOT NULL,
    reason VARCHAR(64) NOT NULL,
    ref_user_id BIGINT NULL REFERENCES t_p28138419_nova_initiative_14.sso_users(id),
    ticket_id BIGINT NULL,
    note TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    dedup_key VARCHAR(96) NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_user_points_log_user ON t_p28138419_nova_initiative_14.user_points_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_points_log_reason ON t_p28138419_nova_initiative_14.user_points_log(reason);

CREATE TABLE IF NOT EXISTS t_p28138419_nova_initiative_14.support_tickets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NULL REFERENCES t_p28138419_nova_initiative_14.sso_users(id),
    email VARCHAR(255) NULL,
    kind VARCHAR(16) NOT NULL DEFAULT 'other',
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    self_importance VARCHAR(16) NOT NULL DEFAULT 'normal',
    status VARCHAR(16) NOT NULL DEFAULT 'open',
    page_url TEXT NULL,
    awarded_points INTEGER NOT NULL DEFAULT 0,
    admin_note TEXT NULL,
    assigned_admin_id BIGINT NULL REFERENCES t_p28138419_nova_initiative_14.sso_users(id),
    resolved_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON t_p28138419_nova_initiative_14.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON t_p28138419_nova_initiative_14.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON t_p28138419_nova_initiative_14.support_tickets(created_at DESC);

CREATE TABLE IF NOT EXISTS t_p28138419_nova_initiative_14.achievement_types (
    code VARCHAR(48) PRIMARY KEY,
    title VARCHAR(120) NOT NULL,
    description TEXT NULL,
    icon VARCHAR(48) NULL,
    points INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS t_p28138419_nova_initiative_14.user_achievements (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES t_p28138419_nova_initiative_14.sso_users(id),
    achievement_code VARCHAR(48) NOT NULL REFERENCES t_p28138419_nova_initiative_14.achievement_types(code),
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, achievement_code)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON t_p28138419_nova_initiative_14.user_achievements(user_id);

INSERT INTO t_p28138419_nova_initiative_14.achievement_types (code, title, description, icon, points, sort_order) VALUES
    ('early_bird',      'Ранняя пташка',      'Зарегистрировались в альфа-тесте',                'Bird',        10, 10),
    ('first_solve',     'Первый расчёт',      'Сделали первый успешный расчёт в CAE',            'Calculator',  10, 20),
    ('first_invite',    'Первое приглашение', 'Пригласили первого друга',                        'UserPlus',    20, 30),
    ('inviter_5',       'Связной',            'Пригласили 5 активных друзей',                    'Users',       50, 40),
    ('inviter_15',      'Амбассадор',         'Пригласили 15 активных друзей',                   'Award',      150, 50),
    ('inviter_50',      'Адвокат CAE',        'Пригласили 50 активных друзей',                   'Crown',      500, 60),
    ('helpful_ticket',  'Полезная заявка',    'Заявка в техподдержку оценена администратором',   'LifeBuoy',     0, 70)
ON CONFLICT (code) DO NOTHING;
