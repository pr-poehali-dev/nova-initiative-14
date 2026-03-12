
UPDATE tariffs SET sort_order = sort_order + 1 WHERE sort_order >= 2;

INSERT INTO tariffs (pos, slug, title, duration, audience, format, price, includes, between_sessions, review_policy, limits_info, cta_text, cta_link, is_popular, is_warning, sort_order)
VALUES
('02', 'group-3m', 'Групповой 3 месяца', '3 мес.', 'Для тех, кто хочет системную работу на 3 месяца в группе единомышленников. Бюджетная альтернатива индивидуальному сопровождению.', '12 групповых занятий (до 4 человек), онлайн', 0, ARRAY['12 групповых занятий по 90 мин','Индивидуальный план внутри группы','Проверка всех разделов ПЗ','Разбор типовых ошибок на примерах группы','Подготовка к защите в группе','Чат-поддержка 10:00–20:00 ежедневно'], 'Проверка текста между занятиями — до 20 стр. в неделю.', 'Проверка материалов: до 10 итераций за курс', 'Приоритет ответа — 72 часа. Чертежи — базовая проверка оформления.', 'Записаться в группу', '/contacts', FALSE, FALSE, 2);

UPDATE tariffs SET pos = '03' WHERE slug = 'group-1m';
UPDATE tariffs SET pos = '04' WHERE slug = 'individual-1m';
UPDATE tariffs SET pos = '05' WHERE slug = 'express-3d';
