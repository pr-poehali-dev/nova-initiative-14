-- Обработка тикета #60 «CAE редактор полноэкранный режим».
-- Реализованы: различие иконок центрирования/fullscreen, видимость модалок в
-- полноэкранном режиме (CSS-fullscreen), перенос 2D→3D, управление мышью в 3D
-- (правая — вращение, колёсико — pan, левая свободна под выделение).
-- Начисляем баллы автору (owner, user_id=5) за объёмную проработанную идею.
UPDATE support_tickets
SET status = 'in_progress',
    awarded_points = 4,
    updated_at = now()
WHERE id = 60;

UPDATE user_points
SET total_points = total_points + 4,
    updated_at = now()
WHERE user_id = 5;