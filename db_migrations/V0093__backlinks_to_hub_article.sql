-- Обратная ссылка на статью-хаб в каждой из трёх детальных статей серии.
-- Делает перелинковку двусторонней и усиливает вес хаба.
UPDATE t_p28138419_nova_initiative_14.engineering_articles
SET body_html = body_html ||
'<p>Общая картина проектирования и порядок всех разделов — в обзорной статье: <a href="/blog/polnyy-raschet-tsilindricheskogo-reduktora-v-diplome">Полный расчёт цилиндрического редуктора в дипломе: сквозной маршрут от ТЗ до КЭ-проверки</a>.</p>',
    updated_at = now()
WHERE id IN (2, 5, 6);