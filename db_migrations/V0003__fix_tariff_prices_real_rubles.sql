-- Исправление цен тарифов: перевод из "т.р." в реальные рубли
UPDATE t_p28138419_nova_initiative_14.tariffs SET price = 36000, price_label = NULL WHERE slug = 'accompany-3m';
UPDATE t_p28138419_nova_initiative_14.tariffs SET price = 24000, price_label = NULL WHERE slug = 'group-3m';
UPDATE t_p28138419_nova_initiative_14.tariffs SET price = 12000, price_label = NULL WHERE slug = 'group-1m';
UPDATE t_p28138419_nova_initiative_14.tariffs SET price = 24000, price_label = NULL WHERE slug = 'individual-1m';
UPDATE t_p28138419_nova_initiative_14.tariffs SET price = 0, price_label = 'по запросу' WHERE slug = 'express-3d';
