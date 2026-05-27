-- V0029: Каталог пакетов докупки расчётов (10 / 50 / 100), цены в копейках

INSERT INTO cae_packages (slug, name, solves_count, price_kopecks, discount_percent, valid_days, is_public, sort_order)
VALUES
    ('solves-10',  'Пакет 10 расчётов',  10,   48500, 3, 365, TRUE, 1),
    ('solves-50',  'Пакет 50 расчётов',  50,  237500, 5, 365, TRUE, 2),
    ('solves-100', 'Пакет 100 расчётов', 100, 465000, 7, 365, TRUE, 3)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    solves_count = EXCLUDED.solves_count,
    price_kopecks = EXCLUDED.price_kopecks,
    discount_percent = EXCLUDED.discount_percent,
    valid_days = EXCLUDED.valid_days,
    is_public = EXCLUDED.is_public,
    sort_order = EXCLUDED.sort_order;