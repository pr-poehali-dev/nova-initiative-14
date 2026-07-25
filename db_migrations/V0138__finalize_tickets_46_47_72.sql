-- Финальная обработка оставшихся тикетов.

-- #46: раздел «Посетители» для владельца реализован (OwnerVisitors). Закрываем.
UPDATE t_p28138419_nova_initiative_14.support_tickets
SET status = 'resolved', resolved_at = now(), updated_at = now(),
    admin_note = 'Реализованы разделы владельца: «Посетители» (аналитика заходов, гео, путь по страницам) и «Исследование посетителей». Session replay пошагового пути — в дорожной карте.'
WHERE id = 46;

-- #47: вкладка «Бизнес-планы» для владельца реализована (OwnerBusinessPlans). Закрываем.
UPDATE t_p28138419_nova_initiative_14.support_tickets
SET status = 'resolved', awarded_points = 3, resolved_at = now(), updated_at = now(),
    admin_note = 'Создан раздел «Бизнес-планы» для роли владельца с формированием документа, экономическими моделями и mind-map. Доступен в кабинете владельца.'
WHERE id = 47;
INSERT INTO t_p28138419_nova_initiative_14.user_points_log (user_id, points, reason, ticket_id, note, dedup_key)
VALUES (5, 3, 'feature_shipped', 47, 'Фича-реквест #47 реализован: раздел «Бизнес-планы» с mind-map и экономическими моделями', 'feature_shipped_47');
UPDATE t_p28138419_nova_initiative_14.user_points SET total_points = total_points + 3, updated_at = now() WHERE user_id = 5;

-- #72: автоподбор минимального момента инерции сечения в отчёте (HUD + PDF).
-- Ценная фича, требует расчётной части — принимаем в работу, начисляем балл за идею.
UPDATE t_p28138419_nova_initiative_14.support_tickets
SET status = 'in_progress', awarded_points = 2, updated_at = now(),
    admin_note = 'Фича принята в разработку: расчёт минимально необходимого момента инерции сечения по критериям прочности и прогиба, с выводом рекомендации по каждой балке рамы в HUD и PDF-отчёте.'
WHERE id = 72;
INSERT INTO t_p28138419_nova_initiative_14.user_points_log (user_id, points, reason, ticket_id, note, dedup_key)
VALUES (5, 2, 'support_ticket_accepted', 72, 'Тикет #72: автоподбор минимального момента инерции сечения принят в разработку', 'ticket_accepted_72');
UPDATE t_p28138419_nova_initiative_14.user_points SET total_points = total_points + 2, updated_at = now() WHERE user_id = 5;
