-- Обработка тикета #68 «Каталог ГОСТов»: реализована страница /gost-catalog.
-- Начисляем баллы автору (user_id=5) за ценный feature-request и закрываем тикет.

-- 1. Лог начисления (dedup_key защищает от повторного начисления).
INSERT INTO t_p28138419_nova_initiative_14.user_points_log
  (user_id, points, reason, ticket_id, note, dedup_key)
VALUES
  (5, 50, 'feature_request', 68,
   'Реализован каталог ГОСТов по разделам инженерии со смысловым поиском по теме',
   'ticket-68-resolved');

-- 2. Обновляем суммарный счётчик баллов автора.
UPDATE t_p28138419_nova_initiative_14.user_points
SET total_points = total_points + 50, updated_at = now()
WHERE user_id = 5;

-- 3. Закрываем тикет, фиксируем начисленные баллы и заметку администратора.
UPDATE t_p28138419_nova_initiative_14.support_tickets
SET status = 'resolved',
    awarded_points = 50,
    admin_note = 'Реализован каталог ГОСТов: /gost-catalog. Разделы (ЕСКД, машиностроение, металлоконструкции, сварка, документация ВКР) с раскрывающимися списками и смысловым поиском по тегам — находит ГОСТ даже без знания номера (например «лестницы и ограждения»). Начислено 50 баллов за идею.',
    resolved_at = now(),
    updated_at = now()
WHERE id = 68;
