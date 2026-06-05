-- Внутренние (админские) записи журнала версий: видны только администраторам,
-- не попадают в публичную выдачу и не рассылаются broadcast-уведомлением.
ALTER TABLE cae_changelog
  ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT FALSE;

-- Помечаем явно «внутренние» прошлые записи про админ-функционал
-- (личный кабинет/админка/генератор рекламы), чтобы они скрылись из публичного журнала.
UPDATE cae_changelog
SET is_internal = TRUE
WHERE LOWER(title) LIKE '%админ%'
   OR LOWER(title) LIKE '%личный кабинет%'
   OR LOWER(title) LIKE '%генератор рекламы%'
   OR LOWER(COALESCE(body,'')) LIKE '%админ-панел%';