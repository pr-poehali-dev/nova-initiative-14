-- Обработка тикета #63 (critical): бесконечный поллинг уведомлений съедал
-- вычислительный ресурс. Убран setInterval-опрос счётчика непрочитанных и
-- обновление по фокусу/visibility. Теперь счётчик запрашивается один раз —
-- при заходе пользователя; список — при открытии колокольчика.
-- Начисляем 3 балла автору (owner, user_id=5) за критичную находку.
UPDATE support_tickets
SET status = 'resolved', awarded_points = 3, resolved_at = now(), updated_at = now()
WHERE id = 63;

UPDATE user_points
SET total_points = total_points + 3, updated_at = now()
WHERE user_id = 5;