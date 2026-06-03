-- Спринт: типы узловых соединений (№41).

-- 1. Журнал версий CAE
INSERT INTO t_p28138419_nova_initiative_14.cae_changelog (version, title, category, body)
VALUES (
  '1.5.14',
  'Типы узловых соединений',
  'feature',
  E'В свойствах узла добавлен выбор конструктивного типа соединения:\n• Сварное, болтовое/винтовое, заклёпочное, шарнирное (палец/ось) или не задано.\n• Тип выбирается в панели свойств узла (и в контекстном окне по правому клику/удержанию) и отображается на схеме буквенным маркером рядом с узлом.\n• Это конструктивный признак для документации и спецификаций (РПЗ, будущий PLM) — на МКЭ-расчёт он не влияет: жёсткость или шарнир в расчёте по-прежнему задаётся шарнирами на концах стержней.'
);

-- 2. Закрываем тикет №41
UPDATE t_p28138419_nova_initiative_14.support_tickets
SET status = 'resolved',
    resolved_at = now(),
    awarded_points = 1,
    admin_note = 'Реализовано в CAE 1.5.14. В свойствах узла добавлен выбор типа соединения: сварное, болтовое/винтовое, заклёпочное, шарнирное или не задано. Тип показывается на схеме маркером рядом с узлом. Это конструктивный признак для документации — на расчёт не влияет (жёсткость/шарнир задаётся шарнирами стержней).',
    updated_at = now()
WHERE id = 41;

-- 3. Баллы автору (user_id = 5)
INSERT INTO t_p28138419_nova_initiative_14.user_points_log (user_id, points, reason, ticket_id, note, dedup_key)
VALUES (5, 1, 'ticket_resolved', 41, 'Фича: типы узловых соединений', 'ticket_award_41')
ON CONFLICT (dedup_key) DO NOTHING;

-- 4. Обновляем суммарный баланс (+1)
INSERT INTO t_p28138419_nova_initiative_14.user_points (user_id, total_points)
VALUES (5, 1)
ON CONFLICT (user_id)
DO UPDATE SET total_points = t_p28138419_nova_initiative_14.user_points.total_points + 1,
              updated_at = now();