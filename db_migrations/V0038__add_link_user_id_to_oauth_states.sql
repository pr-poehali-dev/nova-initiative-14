ALTER TABLE sso_oauth_states
  ADD COLUMN IF NOT EXISTS link_user_id BIGINT;