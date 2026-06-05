-- Тикет №49: автосохранение черновика рамы в браузере
-- 1) Запись в журнал версий CAE
INSERT INTO cae_changelog (version, title, category, body, is_published)
VALUES (
  '1.6.1',
  'Автосохранение: черновик рамы не теряется при перезагрузке',
  'fix',
  'Редактор CAE теперь автоматически сохраняет несохранённые изменения модели в браузере. Если вкладка перезагрузилась (обновление сессии, восстановление после сбоя) — при следующем открытии проекта появляется баннер с предложением восстановить черновик. Серверное сохранение по кнопке работает как прежде; после него локальный черновик очищается.',
  TRUE
);

-- 2) Закрытие тикета №49 с ответом и начислением 3 баллов автору
UPDATE support_tickets
SET status = 'resolved',
    resolved_at = now(),
    updated_at = now(),
    awarded_points = awarded_points + 3,
    admin_note = 'Исправлено в CAE 1.6.1. Добавлено автосохранение черновика рамы в браузере: изменения больше не теряются при фоновой перезагрузке вкладки. При повторном открытии проекта предлагается восстановить несохранённые правки. Спасибо за чёткий разбор и предложение решения!'
WHERE id = 49;

-- 3) Лог начисления баллов (с дедупликацией)
INSERT INTO user_points_log (user_id, points, reason, ticket_id, note, dedup_key)
SELECT 5, 3, 'support_ticket_resolved', 49, 'Тикет #49: критичный баг автосохранения', 'ticket_49_award'
WHERE NOT EXISTS (
  SELECT 1 FROM user_points_log WHERE dedup_key = 'ticket_49_award'
);

-- 4) Гарантируем строку в user_points и увеличиваем сумму
INSERT INTO user_points (user_id, total_points) VALUES (5, 0)
ON CONFLICT (user_id) DO NOTHING;

UPDATE user_points
SET total_points = total_points + 3, updated_at = now()
WHERE user_id = 5
  AND EXISTS (SELECT 1 FROM user_points_log WHERE dedup_key = 'ticket_49_award');

-- 5) Ачивка «Полезная заявка»
INSERT INTO user_achievements (user_id, achievement_code)
VALUES (5, 'helpful_ticket')
ON CONFLICT (user_id, achievement_code) DO NOTHING;