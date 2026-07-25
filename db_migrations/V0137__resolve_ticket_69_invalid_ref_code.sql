-- Тикет #69: несуществующий код приглашения молча проглатывался при регистрации.
-- Теперь бэкенд возвращает ошибку invalid_ref_code (400), пользователь видит понятное сообщение.

UPDATE t_p28138419_nova_initiative_14.support_tickets
SET status = 'resolved',
    awarded_points = 2,
    resolved_at = now(),
    updated_at = now(),
    admin_note = 'При регистрации несуществующий код приглашения молча игнорировался (регистрация проходила без привязки к рефереру). Теперь сервер возвращает ошибку «Код приглашения не найден» — пользователь может исправить код или убрать его.'
WHERE id = 69;

INSERT INTO t_p28138419_nova_initiative_14.user_points_log (user_id, points, reason, ticket_id, note, dedup_key)
VALUES (13, 2, 'support_ticket_resolved', 69, 'Тикет #69: несуществующий код приглашения теперь даёт понятную ошибку при регистрации', 'ticket_resolved_69');

UPDATE t_p28138419_nova_initiative_14.user_points
SET total_points = total_points + 2, updated_at = now()
WHERE user_id = 13;
