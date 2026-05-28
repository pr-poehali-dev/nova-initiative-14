-- Ретроактивная выдача first_invite юзеру id=5 (sega979797@yandex.ru):
-- у него уже есть 1 реферал (id=7), но ачивка ранее не выдалась из-за бага
-- (старая логика требовала «активного» реферала).
INSERT INTO t_p28138419_nova_initiative_14.user_achievements (user_id, achievement_code)
VALUES (5, 'first_invite')
ON CONFLICT (user_id, achievement_code) DO NOTHING;

-- Начисляем баллы за first_invite (20) с дедупом — повторно не зачислится.
INSERT INTO t_p28138419_nova_initiative_14.user_points_log
  (user_id, points, reason, note, dedup_key)
VALUES (5, 20, 'achievement:first_invite', 'Ачивка: Первое приглашение (ретроактивно)', 'ach:5:first_invite')
ON CONFLICT (dedup_key) DO NOTHING;

-- Обновляем сумму баллов только если строка лога реально вставилась
UPDATE t_p28138419_nova_initiative_14.user_points
SET total_points = total_points + 20, updated_at = now()
WHERE user_id = 5
  AND EXISTS (
    SELECT 1 FROM t_p28138419_nova_initiative_14.user_points_log
    WHERE dedup_key = 'ach:5:first_invite'
  )
  AND NOT EXISTS (
    -- защита от двойного применения миграции вручную
    SELECT 1 FROM t_p28138419_nova_initiative_14.user_points_log
    WHERE dedup_key = 'ach:5:first_invite:applied'
  );

-- Маркер «применено», чтобы UPDATE не сработал повторно
INSERT INTO t_p28138419_nova_initiative_14.user_points_log
  (user_id, points, reason, note, dedup_key)
VALUES (5, 0, 'migration_marker', 'Маркер применения V0037', 'ach:5:first_invite:applied')
ON CONFLICT (dedup_key) DO NOTHING;

-- Закрываем тикет id=6
UPDATE t_p28138419_nova_initiative_14.support_tickets
SET
    status = 'resolved',
    admin_note = 'Баг подтверждён: ачивка first_invite выдавалась только при «активном» реферале (сделавшем расчёт), а юзер ожидал её сразу после регистрации друга. Изменено: первая ачивка теперь выдаётся в момент регистрации реферала (backend/sso-auth/actions.py), без требования активности. Ачивки inviter_5/15/50 остались по активным рефералам (так задумано). Юзеру id=5 ачивка first_invite выдана ретроактивно с начислением 20 баллов.',
    resolved_at = now(),
    updated_at = now()
WHERE id = 6;