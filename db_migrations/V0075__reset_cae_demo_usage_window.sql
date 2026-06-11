-- Сброс окна демо-расчётов по IP: сдвигаем first_at в прошлое и обнуляем
-- счётчик, чтобы суточная логика начала учёт заново.
UPDATE cae_demo_usage
SET first_at = now() - interval '2 days', solve_count = 0, updated_at = now();
