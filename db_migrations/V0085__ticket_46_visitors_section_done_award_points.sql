UPDATE t_p28138419_nova_initiative_14.support_tickets
SET admin_note = 'Реализован раздел владельца «Посетители» (/admin/visitors): список всех сессий за период с источником, путём по страницам, устройством и временем на сайте; раскрытие сессии показывает пошаговый таймлайн страниц и гео по IP (страна/город). Роль «Владелец» (is_owner) уже выдана. Пошаговый session-replay (скролл/клики, разбор создания демо-проекта) и ретаргетинг-пиксели остаются в дорожной карте — требуют согласия пользователя по 152-ФЗ.',
    updated_at = now()
WHERE id = 46;

-- Начисление баллов автору тикета #46 за реализованный фича-реквест (правило проекта).
INSERT INTO t_p28138419_nova_initiative_14.user_points (user_id, total_points)
VALUES (5, 0) ON CONFLICT (user_id) DO NOTHING;

INSERT INTO t_p28138419_nova_initiative_14.user_points_log (user_id, points, reason, ticket_id, note)
VALUES (5, 3, 'feature_shipped', 46, 'Фича-реквест #46 реализован: раздел «Посетители» для владельца');

UPDATE t_p28138419_nova_initiative_14.user_points
SET total_points = total_points + 3, updated_at = now()
WHERE user_id = 5;

UPDATE t_p28138419_nova_initiative_14.support_tickets
SET awarded_points = awarded_points + 3
WHERE id = 46;