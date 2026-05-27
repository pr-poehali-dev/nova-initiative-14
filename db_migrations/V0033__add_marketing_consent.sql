ALTER TABLE t_p28138419_nova_initiative_14.sso_users
    ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sso_users_referral_code
    ON t_p28138419_nova_initiative_14.sso_users(referral_code)
    WHERE referral_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sso_users_referred_by
    ON t_p28138419_nova_initiative_14.sso_users(referred_by_user_id);
