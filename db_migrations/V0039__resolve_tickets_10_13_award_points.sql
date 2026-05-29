UPDATE t_p28138419_nova_initiative_14.support_tickets SET status='resolved', resolved_at=now(), awarded_points=awarded_points+1,
  admin_note='Туториал и подсказки сделаны адаптивными: на смартфоне убраны упоминания горячих клавиш (N/E/S/F5), описаны касания и жесты (щипок, два пальца). Спасибо!'
  WHERE id=10;

UPDATE t_p28138419_nova_initiative_14.support_tickets SET status='resolved', resolved_at=now(), awarded_points=awarded_points+1,
  admin_note='Исправлен горизонтальный сдвиг экрана в личном кабинете: добавлены ограничения ширины и переносы для длинных значений (email, заголовки тикетов). Спасибо!'
  WHERE id=11;

UPDATE t_p28138419_nova_initiative_14.support_tickets SET status='resolved', resolved_at=now(), awarded_points=awarded_points+1,
  admin_note='Исправлено поле начисления баллов за тикет: ноль теперь легко заменяется, при фокусе значение выделяется целиком. Спасибо!'
  WHERE id=12;

UPDATE t_p28138419_nova_initiative_14.support_tickets SET status='resolved', resolved_at=now(), awarded_points=awarded_points+1,
  admin_note='В личном кабинете у ачивок добавлены прогресс-бары, а по клику открывается окно с иконкой, описанием и прогрессом. Спасибо!'
  WHERE id=13;

INSERT INTO t_p28138419_nova_initiative_14.user_points (user_id, total_points) VALUES (5, 0)
  ON CONFLICT (user_id) DO NOTHING;

INSERT INTO t_p28138419_nova_initiative_14.user_points_log (user_id, points, reason, ticket_id, note, dedup_key) VALUES
  (5, 1, 'support_ticket_resolved', 10, 'Тикет #10', 'ticket_award:10:resolved'),
  (5, 1, 'support_ticket_resolved', 11, 'Тикет #11', 'ticket_award:11:resolved'),
  (5, 1, 'support_ticket_resolved', 12, 'Тикет #12', 'ticket_award:12:resolved'),
  (5, 1, 'support_ticket_resolved', 13, 'Тикет #13', 'ticket_award:13:resolved')
  ON CONFLICT (dedup_key) DO NOTHING;

UPDATE t_p28138419_nova_initiative_14.user_points SET total_points = total_points + 4, updated_at=now()
  WHERE user_id=5;

INSERT INTO t_p28138419_nova_initiative_14.user_achievements (user_id, achievement_code) VALUES (5, 'helpful_ticket')
  ON CONFLICT (user_id, achievement_code) DO NOTHING;