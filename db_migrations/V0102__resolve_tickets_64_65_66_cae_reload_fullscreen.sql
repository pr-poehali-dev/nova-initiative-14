-- Обработка трёх критичных CAE-тикетов:
-- #65, #66 — проект перезагружался при возврате на вкладку: загрузка модели
--   была завязана на объект user, который AuthContext пересоздавал при
--   ревалидации сессии. Завязали на стабильный user.id.
-- #64 — полноэкранный режим раскрывался только на окно браузера: вернули
--   нативный Fullscreen API (на весь экран устройства) с CSS-фолбэком.
-- Начисляем автору (user_id=5) по 3 балла за каждый критичный баг = 9.
UPDATE support_tickets
SET status = 'resolved', awarded_points = 3, resolved_at = now(), updated_at = now()
WHERE id IN (64, 65, 66);

UPDATE user_points
SET total_points = total_points + 9, updated_at = now()
WHERE user_id = 5;