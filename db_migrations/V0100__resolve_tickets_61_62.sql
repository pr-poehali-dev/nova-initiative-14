-- Обработка баг-тикетов #61 (critical) и #62 (high).
-- #61: починен полноэкранный режим (канва поверх шапки z-55, модалки z-70),
--      убрано авто-окно нагрузок по клику на узел в 3D (левый клик = выбор,
--      правый = окно свойств), отключена перезагрузка вкладки при возврате
--      фокуса (версионный watcher без visibilitychange/focus триггеров).
-- #62: кнопка «В 3D» перенесена к кнопкам PDF/JSON; перенос в 3D теперь
--      создаёт ОТДЕЛЬНЫЙ 3D-проект с копией геометрии, 2D остаётся.
-- Начисляем баллы автору (owner, user_id=5): #61 +3, #62 +2 = +5.
UPDATE support_tickets
SET status = 'resolved', awarded_points = 3, resolved_at = now(), updated_at = now()
WHERE id = 61;

UPDATE support_tickets
SET status = 'resolved', awarded_points = 2, resolved_at = now(), updated_at = now()
WHERE id = 62;

UPDATE user_points
SET total_points = total_points + 5, updated_at = now()
WHERE user_id = 5;