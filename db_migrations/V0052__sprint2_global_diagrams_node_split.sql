-- Спринт 2: глобальный масштаб эпюр (№39) и реальное крепление узла на балку (№36).

-- 1. Журнал версий CAE
INSERT INTO t_p28138419_nova_initiative_14.cae_changelog (version, title, category, body)
VALUES (
  '1.5.12',
  'Глобальные эпюры и врезка узла в балку',
  'improvement',
  E'Улучшения редактора и эпюр:\n• Эпюры N/Q/M строятся в едином глобальном масштабе по всей раме — в общих узлах значения соседних балок совпадают, а высота столбиков честно отражает соотношение усилий между стержнями (раньше каждая балка масштабировалась к своим 0–100%). Применено и на экране, и в PDF-отчёте.\n• Добавление узла на существующую балку теперь реально разбивает её на два соединённых стержня: узел физически связывает половины, и расчёт это учитывает. Распределённые и пролётные нагрузки автоматически переносятся на нужные половины.'
);

-- 2. Закрываем тикеты спринта 2
UPDATE t_p28138419_nova_initiative_14.support_tickets
SET status = 'resolved',
    resolved_at = now(),
    awarded_points = v.pts,
    admin_note = v.note,
    updated_at = now()
FROM (VALUES
  (36, 2, 'Реализовано в CAE 1.5.12. При добавлении узла на стержень он теперь врезается в балку: элемент делится на два, соединённых в новом узле, и расчёт видит это соединение. Нагрузки на исходном стержне переносятся на половины автоматически.'),
  (39, 1, 'Реализовано в CAE 1.5.12. Эпюры N/Q/M переведены на единый глобальный масштаб — в общих узлах значения соседних балок совпадают. Изменение применено и на канве редактора, и в PDF-отчёте.')
) AS v(id, pts, note)
WHERE support_tickets.id = v.id;

-- 3. Баллы автору (user_id = 5)
INSERT INTO t_p28138419_nova_initiative_14.user_points_log (user_id, points, reason, ticket_id, note, dedup_key)
VALUES
  (5, 2, 'ticket_resolved', 36, 'Важная фича: врезка узла в балку', 'ticket_award_36'),
  (5, 1, 'ticket_resolved', 39, 'Фича: глобальный масштаб эпюр', 'ticket_award_39')
ON CONFLICT (dedup_key) DO NOTHING;

-- 4. Обновляем суммарный баланс (+3)
INSERT INTO t_p28138419_nova_initiative_14.user_points (user_id, total_points)
VALUES (5, 3)
ON CONFLICT (user_id)
DO UPDATE SET total_points = t_p28138419_nova_initiative_14.user_points.total_points + 3,
              updated_at = now();