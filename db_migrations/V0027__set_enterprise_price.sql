-- Enterprise: 4990 ₽/мес = 499000 копеек
-- Годовая подписка: 49900 ₽/год = 4990000 копеек (2 месяца бесплатно)
UPDATE cae_tariffs SET
  price_monthly = 499000,
  price_yearly  = 4990000
WHERE slug = 'enterprise';
