-- Демо-ключ виджета делаем безлимитным по расчётам на посетителя:
-- это публичный демонстрационный стенд, он не должен упираться в лимит.
UPDATE widget_partners
SET visitor_limit_enabled = FALSE
WHERE api_key = 'demo_pk_8f3a9c2e1b7d4056';
