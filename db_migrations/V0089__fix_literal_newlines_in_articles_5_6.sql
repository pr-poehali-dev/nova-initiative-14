-- Чиним отображение литералов "\n" в теле статей 5 и 6:
-- при INSERT обычная строка Postgres сохранила "\n" буквально (backslash + n),
-- и они стали видимым текстом в HTML. Удаляем эти литеральные пары.
UPDATE t_p28138419_nova_initiative_14.engineering_articles
SET body_html = replace(body_html, '\n', ''),
    updated_at = now()
WHERE id IN (5, 6);