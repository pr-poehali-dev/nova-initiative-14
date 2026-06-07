-- Обработка тикетов #50-#54: начисление баллов авторам и закрытие.
-- Все тикеты от user_id=5. Конвенция: reason='support_ticket_resolved',
-- dedup_key='ticket_award:{id}:resolved'. Баллы: обычный=1, заметный=2, критич.=3.

-- 1. Лог начислений баллов
INSERT INTO t_p28138419_nova_initiative_14.user_points_log
  (user_id, points, reason, ticket_id, note, dedup_key)
VALUES
  (5, 1, 'support_ticket_resolved', 54, 'Тикет #54: минус на мобильной клавиатуре — добавлена кнопка ± для ввода отрицательных нагрузок', 'ticket_award:54:resolved'),
  (5, 3, 'support_ticket_resolved', 53, 'Тикет #53 (критич.): сторона эпюры Q на схеме зависела от направления рисования стержня — исправлено на канве и в PDF', 'ticket_award:53:resolved'),
  (5, 2, 'support_ticket_resolved', 52, 'Тикет #52: tooltip эпюры попадал в PDF-схему + ложная подпись «эпюра нулевая» из-за численного шума', 'ticket_award:52:resolved'),
  (5, 2, 'support_ticket_resolved', 51, 'Тикет #51: в 3D-проекте не было ввода узлов/стержней — добавлена панель построения 3D', 'ticket_award:51:resolved'),
  (5, 2, 'support_ticket_resolved', 50, 'Тикет #50: кнопка «Сбросить» в демо обнуляла лимит расчётов — теперь сбрасывается только модель', 'ticket_award:50:resolved');

-- 2. Агрегат баллов пользователя (1+3+2+2+2 = 10)
UPDATE t_p28138419_nova_initiative_14.user_points
SET total_points = total_points + 10, updated_at = now()
WHERE user_id = 5;

-- 3. Проставляем awarded_points и закрываем тикеты
UPDATE t_p28138419_nova_initiative_14.support_tickets SET awarded_points = 1, status = 'resolved', resolved_at = now(), updated_at = now(), admin_note = 'Исправлено: кнопка ± для ввода минуса на мобильной клавиатуре (NumericInput, формы нагрузок).' WHERE id = 54;
UPDATE t_p28138419_nova_initiative_14.support_tickets SET awarded_points = 3, status = 'resolved', resolved_at = now(), updated_at = now(), admin_note = 'Исправлено: сторона эпюр на схеме теперь не зависит от направления рисования стержня (детерминированная нормаль). Канва + PDF.' WHERE id = 53;
UPDATE t_p28138419_nova_initiative_14.support_tickets SET awarded_points = 2, status = 'resolved', resolved_at = now(), updated_at = now(), admin_note = 'Исправлено: tooltip эпюры помечен data-pdf-hide и не попадает в PDF; нулевая эпюра определяется с порогом шума 0.5.' WHERE id = 52;
UPDATE t_p28138419_nova_initiative_14.support_tickets SET awarded_points = 2, status = 'resolved', resolved_at = now(), updated_at = now(), admin_note = 'Реализовано: панель «Построение 3D» — добавление узлов по координатам и соединение узлов стержнем.' WHERE id = 51;
UPDATE t_p28138419_nova_initiative_14.support_tickets SET awarded_points = 2, status = 'resolved', resolved_at = now(), updated_at = now(), admin_note = 'Исправлено: кнопка «Сбросить» в демо больше не обнуляет счётчик из 2 пробных расчётов.' WHERE id = 50;