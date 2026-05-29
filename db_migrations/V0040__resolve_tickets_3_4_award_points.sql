UPDATE t_p28138419_nova_initiative_14.support_tickets SET status='resolved', resolved_at=now(), awarded_points=awarded_points+1,
  admin_note='Исправлен краш на смартфоне: при открытии свойств узла/балки long-press теперь выделяет объект до открытия панели (как контекст-меню на ПК), убран рассинхрон, из-за которого панель падала и страница перезагружалась. HUD на канвасе снова отображается. Спасибо!'
  WHERE id=3;

UPDATE t_p28138419_nova_initiative_14.support_tickets SET status='resolved', resolved_at=now(), awarded_points=awarded_points+1,
  admin_note='Готов генератор рекламы (раздел Админ → Маркетинг). Доступен только администратору, скрыт от поисковых роботов. Форматы: пост 1080×1080, сториз 1080×1920, обложка 1200×630, листовка A5. Выгрузка в PNG, JPG и PDF. Спасибо!'
  WHERE id=4;

INSERT INTO t_p28138419_nova_initiative_14.user_points (user_id, total_points) VALUES (5, 0)
  ON CONFLICT (user_id) DO NOTHING;

INSERT INTO t_p28138419_nova_initiative_14.user_points_log (user_id, points, reason, ticket_id, note, dedup_key) VALUES
  (5, 1, 'support_ticket_resolved', 3, 'Тикет #3', 'ticket_award:3:resolved'),
  (5, 1, 'support_ticket_resolved', 4, 'Тикет #4', 'ticket_award:4:resolved')
  ON CONFLICT (dedup_key) DO NOTHING;

UPDATE t_p28138419_nova_initiative_14.user_points SET total_points = total_points + 2, updated_at=now()
  WHERE user_id=5;

INSERT INTO t_p28138419_nova_initiative_14.user_achievements (user_id, achievement_code) VALUES (5, 'helpful_ticket')
  ON CONFLICT (user_id, achievement_code) DO NOTHING;