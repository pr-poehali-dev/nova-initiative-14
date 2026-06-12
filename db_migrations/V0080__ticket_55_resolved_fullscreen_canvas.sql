-- Тикет #55 закрыт: добавлен полноэкранный режим канвы + понятная иконка fit.
-- Остальные пункты (ввод узлов/стержней, нагрузки) закрыты ранее.
UPDATE support_tickets
SET status='resolved', resolved_at=now(), updated_at=now(),
    awarded_points = awarded_points + 2,
    admin_note='Закрыто. Добавлен настоящий полноэкранный режим канвы (кнопка «развернуть»/«свернуть»), а прежняя кнопка «подогнать масштаб» получила понятную иконку (раньше путалась с fullscreen). Ввод узлов/стержней (панель 3D), узловые нагрузки и распределённые q_y/q_z, опоры по 6 DOF, орбита-камера, быстрые виды и ViewCube — реализованы ранее. Дальнейшая полировka управления «как в КОМПАС» ведётся в дорожной карте 3D.'
WHERE id=55;

-- Доп. баллы автору (user_id=5) за исправленный баг, с защитой от повтора.
INSERT INTO user_points_log (user_id, points, reason, ticket_id, note, dedup_key) VALUES
 (5, 2, 'support_ticket_resolved', 55, 'Тикет #55: полноэкранный режим канвы + понятная иконка подгонки масштаба', 'ticket_award:55:resolved')
ON CONFLICT (dedup_key) DO NOTHING;

UPDATE user_points SET
  total_points = (SELECT COALESCE(SUM(points),0) FROM user_points_log WHERE user_id=5),
  updated_at = now()
WHERE user_id = 5;