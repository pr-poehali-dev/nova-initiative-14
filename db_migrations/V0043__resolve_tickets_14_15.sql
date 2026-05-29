UPDATE t_p28138419_nova_initiative_14.support_tickets
SET status='resolved',
    awarded_points=1,
    resolved_at=now(),
    updated_at=now(),
    admin_note='Строка альфа-теста теперь постоянная часть интерфейса: убраны крестик и логика скрытия (localStorage), полоса больше не ведёт себя как отключаемое всплывающее окно и всегда отображается под навигацией. Спасибо!'
WHERE id=14;

UPDATE t_p28138419_nova_initiative_14.support_tickets
SET status='resolved',
    awarded_points=1,
    resolved_at=now(),
    updated_at=now(),
    admin_note='Исправлены чертёжные рамки блоков (.drawing-frame): декоративная внешняя обводка сделана симметричной (inset вместо смещения влево на -22px), который вызывал горизонтальную прокрутку. На экранах до 640px выносные обводки и outline-offset отключены, чтобы рамки не вылезали за край на смартфонах. Спасибо!'
WHERE id=15;