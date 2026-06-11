-- Обработка тикетов: обновление статусов + заметок, начисление баллов автору.

-- 1) Резолв багов (исправлены кодом).
UPDATE support_tickets SET status='resolved', resolved_at=now(), updated_at=now(),
  awarded_points=3,
  admin_note='Исправлено: лимит активных проектов в альфа-тесте поднят на бэке до фактического безлимита (1000), теперь совпадает с «∞» в интерфейсе.'
WHERE id=58;

UPDATE support_tickets SET status='resolved', resolved_at=now(), updated_at=now(),
  awarded_points=3,
  admin_note='Исправлено: на /program формулировки переписаны от лица студента («Разрабатываете…»), заголовок «Что делаем» → «План работ». Наставник проверяет, студент делает.'
WHERE id=59;

UPDATE support_tickets SET status='resolved', resolved_at=now(), updated_at=now(),
  awarded_points=3,
  admin_note='Исправлено: демо-лимит расчётов перенесён на сервер (учёт по IP в cae_demo_usage). Обход через инкогнито/очистку localStorage больше не работает.'
WHERE id=57;

UPDATE support_tickets SET status='resolved', resolved_at=now(), updated_at=now(),
  awarded_points=2,
  admin_note='Проверено: нелинейный расчёт P-Δ реализован и работает корректно. Совпадение с линейным на вашей модели нормально — нет значимого сжатия и перемещения малы. Добавлено поясняющее сообщение в результатах, когда P-Δ эффект пренебрежимо мал.'
WHERE id=56;

-- 2) Принято в работу (крупные доработки/идеи — на дорожную карту).
UPDATE support_tickets SET status='in_progress', updated_at=now(),
  awarded_points=1,
  admin_note='Принято в работу: 3D-редактор будет дорабатываться (ввод узлов/стержней, задание нагрузок и опор, управление как в КОМПАС, корректный полноэкранный режим). Объёмная задача — в дорожной карте.'
WHERE id=55;

UPDATE support_tickets SET status='resolved', resolved_at=now(), updated_at=now(),
  admin_note='Идеи PLM приняты ранее и ведутся в дорожной карте PLM. Баллы за этот тикет уже начислены ранее (+2).'
WHERE id=43;

UPDATE support_tickets SET status='in_progress', updated_at=now(),
  awarded_points=1,
  admin_note='Принято к обсуждению: перенос комплексного сервиса в отдельное приложение и выбор названия. Прорабатывается стратегически вместе с развитием PLM.'
WHERE id=44;

UPDATE support_tickets SET status='in_progress', updated_at=now(),
  awarded_points=2,
  admin_note='Частично реализовано: добавлены учёт посещений и источников (включая QR), статистика по приглашениям и страницам, топ-страниц и эффективность QR-флаеров в админке. Пошаговая запись поведения посетителя (session replay) — в дорожной карте, с учётом 152-ФЗ и согласия пользователя.'
WHERE id=46;

UPDATE support_tickets SET status='in_progress', updated_at=now(),
  awarded_points=1,
  admin_note='Принято в работу: вкладка «Бизнес-планы» с MindMap и формированием документа по канонам экономики — для роли «Владелец». Крупная задача в дорожной карте.'
WHERE id=47;

-- 3) Начисление баллов автору (user_id=5) с защитой от повторов через dedup_key.
INSERT INTO user_points_log (user_id, points, reason, ticket_id, note, dedup_key) VALUES
 (5, 3, 'support_ticket_resolved', 58, 'Тикет #58 (критич.): лимит проектов «10 из бесконечности» — поднял квоту альфа-теста на бэке', 'ticket_award:58:resolved'),
 (5, 3, 'support_ticket_resolved', 59, 'Тикет #59 (критич.): формулировки /program переписаны от лица студента, «Что делаем» → «План работ»', 'ticket_award:59:resolved'),
 (5, 3, 'support_ticket_resolved', 57, 'Тикет #57 (критич.): обход демо-лимита через инкогнито закрыт серверным учётом по IP', 'ticket_award:57:resolved'),
 (5, 2, 'support_ticket_resolved', 56, 'Тикет #56: нелинейный P-Δ работает корректно, добавлено пояснение при малом эффекте', 'ticket_award:56:resolved'),
 (5, 1, 'support_ticket_accepted', 55, 'Тикет #55: доработка 3D-редактора принята в дорожную карту', 'ticket_award:55:accepted'),
 (5, 1, 'support_ticket_accepted', 44, 'Тикет #44: нейминг и вынос сервиса в отдельное приложение — принято к обсуждению', 'ticket_award:44:accepted'),
 (5, 2, 'support_ticket_accepted', 46, 'Тикет #46: аналитика посетителей частично реализована, session replay — в дорожной карте', 'ticket_award:46:accepted'),
 (5, 1, 'support_ticket_accepted', 47, 'Тикет #47: вкладка «Бизнес-планы» принята в дорожную карту', 'ticket_award:47:accepted')
ON CONFLICT (dedup_key) DO NOTHING;

-- 4) Пересчёт суммы баллов автора из лога (надёжно и идемпотентно).
UPDATE user_points SET
  total_points = (SELECT COALESCE(SUM(points),0) FROM user_points_log WHERE user_id=5),
  updated_at = now()
WHERE user_id = 5;
