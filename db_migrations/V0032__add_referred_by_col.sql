ALTER TABLE t_p28138419_nova_initiative_14.sso_users
    ADD COLUMN IF NOT EXISTS referred_by_user_id BIGINT NULL REFERENCES t_p28138419_nova_initiative_14.sso_users(id);
