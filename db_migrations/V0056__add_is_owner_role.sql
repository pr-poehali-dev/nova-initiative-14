-- Роль «владелец» (тикет №43): отдельный булев флаг по аналогии с is_admin.
ALTER TABLE t_p28138419_nova_initiative_14.sso_users
    ADD COLUMN IF NOT EXISTS is_owner BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN t_p28138419_nova_initiative_14.sso_users.is_owner
    IS 'Владелец продукта. Доступ к внутренней дорожной карте PLM и владельческим разделам ЛК. Выдаётся вручную.';

-- Назначаем владельцем основного автора/заказчика (user_id = 5).
UPDATE t_p28138419_nova_initiative_14.sso_users
SET is_owner = TRUE
WHERE id = 5;