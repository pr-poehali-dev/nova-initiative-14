-- Закрываем обработанные тикеты по CAE-редактору (баги исправлены в коде).
UPDATE t_p28138419_nova_initiative_14.support_tickets
SET status = 'resolved',
    resolved_at = now(),
    updated_at = now(),
    admin_note = 'Исправлено: невалидный ввод (NaN) в величине/позиции нагрузки больше не попадает в модель — добавлены guard-функции num()/clampPos() в loadActions, защита в форме точечной силы и в валидаторе (load_invalid_value). Это устраняло «nan м» и молчаливую перезагрузку страницы при вводе q. Добавлена подсказка по вводу позиции (0.8 вместо дроби 4/5) и поддержка Enter.'
WHERE id IN (16, 18);

UPDATE t_p28138419_nova_initiative_14.support_tickets
SET status = 'resolved',
    resolved_at = now(),
    updated_at = now(),
    admin_note = 'Сделано: попап свойств теперь перетаскивается за шапку на ПК (иконка-ручка, курсор grab). Окно выбора сечения поднято по z-index (z-60) над попапом свойств (z-50) — больше не перекрывается.'
WHERE id = 17;

UPDATE t_p28138419_nova_initiative_14.support_tickets
SET status = 'resolved',
    resolved_at = now(),
    updated_at = now(),
    admin_note = 'Сделано: добавлен мобильный плавающий HUD выбора инструмента (Узел/Балка/Выбор) поверх рабочей области слева снизу — переключение одним касанием без ухода на вкладку «Чертить».'
WHERE id = 19;