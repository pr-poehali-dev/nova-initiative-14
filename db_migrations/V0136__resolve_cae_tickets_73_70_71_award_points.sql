-- Обработка решённых тикетов CAE: баги #73, #70, #71.
-- Обновляем статус, фиксируем начисленные баллы и логируем начисление автору.

-- 1. Закрываем тикеты как решённые с админ-заметкой.
UPDATE t_p28138419_nova_initiative_14.support_tickets
SET status = 'resolved',
    awarded_points = 3,
    resolved_at = now(),
    updated_at = now(),
    admin_note = 'Баг решателя: на свободном конце консоли оставался паразитный момент qL²/12 при учёте собственного веса. Собственный вес теперь учитывается в эпюрах N/Q/M и в прогибе как распределённая нагрузка — эпюра момента корректно сходится к нулю на свободном конце.'
WHERE id = 73;

UPDATE t_p28138419_nova_initiative_14.support_tickets
SET status = 'resolved',
    awarded_points = 2,
    resolved_at = now(),
    updated_at = now(),
    admin_note = 'В плоской 2D-раме вертикаль — ось Y. Убрали бессмысленный выбор «вниз по Y / вниз по Z»: теперь вес всегда направлен вниз по Y, а решатель приводит старые проекты с направлением Z к корректному Y.'
WHERE id = 70;

UPDATE t_p28138419_nova_initiative_14.support_tickets
SET status = 'resolved',
    awarded_points = 2,
    resolved_at = now(),
    updated_at = now(),
    admin_note = 'Каталог сечений (z-60) открывался под панелью свойств элемента (z-70). Поднял z-index каталога выше панели — модалка выбора сечения теперь открывается поверх на телефоне.'
WHERE id = 71;

-- 2. Логируем начисление баллов авторам (с dedup_key от повторного начисления).
INSERT INTO t_p28138419_nova_initiative_14.user_points_log (user_id, points, reason, ticket_id, note, dedup_key)
VALUES
  (13, 3, 'support_ticket_resolved', 73, 'Тикет #73 (критич.): паразитный момент на конце консоли при учёте собственного веса — исправлен решатель', 'ticket_resolved_73'),
  (5, 2, 'support_ticket_resolved', 70, 'Тикет #70: убран бессмысленный выбор направления веса Y/Z в 2D', 'ticket_resolved_70'),
  (5, 2, 'support_ticket_resolved', 71, 'Тикет #71: модалка выбора сечения открывалась под панелью свойств на телефоне — исправлен z-index', 'ticket_resolved_71');

-- 3. Обновляем суммарные баллы авторов.
UPDATE t_p28138419_nova_initiative_14.user_points
SET total_points = total_points + 3, updated_at = now()
WHERE user_id = 13;

UPDATE t_p28138419_nova_initiative_14.user_points
SET total_points = total_points + 4, updated_at = now()
WHERE user_id = 5;
