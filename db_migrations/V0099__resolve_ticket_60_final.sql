-- Завершение тикета #60: добавлено выделение объектов кликом с окном свойств
-- у курсора и рамка массового выделения левой кнопкой в 3D-сцене.
-- Закрываем тикет и доначисляем 2 балла автору (owner, user_id=5): итого 6 за тикет.
UPDATE support_tickets
SET status = 'resolved',
    awarded_points = 6,
    resolved_at = now(),
    updated_at = now()
WHERE id = 60;

UPDATE user_points
SET total_points = total_points + 2,
    updated_at = now()
WHERE user_id = 5;