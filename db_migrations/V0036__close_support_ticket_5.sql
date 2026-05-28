UPDATE t_p28138419_nova_initiative_14.support_tickets
SET
    status = 'resolved',
    admin_note = 'Усилена визуальная фиксация выбранного типа обращения и оценки важности: выбранная кнопка теперь имеет сплошной фон акцентного цвета, белый текст, жирное начертание, обводку shadow и галочку Check. Под каждой группой добавлен подпись «Выбрано: …». Группы переведены на role="radiogroup" / aria-checked для доступности.',
    resolved_at = now(),
    updated_at = now()
WHERE id = 5;