-- Демо-партнёр для тестирования виджета. allowed_domains пуст = разрешены все
-- домены (удобно для разработки/демо). В проде заполняется конкретными доменами.
INSERT INTO widget_partners (api_key, company_name, contact_email, allowed_domains, plan, monthly_calc_limit, notes)
VALUES (
    'demo_pk_8f3a9c2e1b7d4056',
    'Демо завод металлоконструкций',
    'info@xn----gtbhgbqhkfi.xn--p1ai',
    '{}',
    'demo',
    100000,
    'Тестовый ключ для демонстрации виджета'
)
ON CONFLICT (api_key) DO NOTHING;
