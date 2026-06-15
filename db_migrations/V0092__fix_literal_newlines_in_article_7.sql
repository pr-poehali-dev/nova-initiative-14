UPDATE t_p28138419_nova_initiative_14.engineering_articles
SET body_html = replace(body_html, '\n', ''), updated_at = now()
WHERE id = 7;