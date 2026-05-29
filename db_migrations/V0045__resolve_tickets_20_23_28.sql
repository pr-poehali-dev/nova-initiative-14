-- Закрываем обработанные тикеты (баги/UX исправлены в коде).
UPDATE t_p28138419_nova_initiative_14.support_tickets
SET status = 'resolved', resolved_at = now(), updated_at = now(),
    admin_note = 'Исправлено: список «Мои проекты» на бэкенде теперь фильтрует архивированные (is_archived=FALSE) — удалённый проект больше не возвращается после обновления страницы.'
WHERE id = 20;

UPDATE t_p28138419_nova_initiative_14.support_tickets
SET status = 'resolved', resolved_at = now(), updated_at = now(),
    admin_note = 'Исправлено: потеря авторизации при временном сбое сети/сервера. Теперь сессия сбрасывается только при настоящем отказе сервера (401/403); сетевые ошибки и 5xx больше не разлогинивают — сохранённый пользователь остаётся в системе.'
WHERE id = 23;

UPDATE t_p28138419_nova_initiative_14.support_tickets
SET status = 'resolved', resolved_at = now(), updated_at = now(),
    admin_note = 'Исправлено: в тёмной теме пункты выпадающего списка статуса получили явные фон и цвет (CSS-правило для select.drawing-input option) — текст читается.'
WHERE id = 24;

UPDATE t_p28138419_nova_initiative_14.support_tickets
SET status = 'resolved', resolved_at = now(), updated_at = now(),
    admin_note = 'Сделано: при доступном обновлении сайта с несохранёнными данными в редакторе вместо молчаливой перезагрузки показывается подтверждение (popup в приложении + native confirm в watchdog) с предупреждением о потере данных и информацией, что вышла новая версия с исправлениями. Добавлен beforeunload-guard.'
WHERE id = 25;

UPDATE t_p28138419_nova_initiative_14.support_tickets
SET status = 'resolved', resolved_at = now(), updated_at = now(),
    admin_note = 'Исправлено: мобильный HUD поднят выше строки координат курсора (bottom-10), больше не перекрывает их.'
WHERE id = 26;

UPDATE t_p28138419_nova_initiative_14.support_tickets
SET status = 'resolved', resolved_at = now(), updated_at = now(),
    admin_note = 'Исправлено: кнопка «Расчёт» теперь рендерится до модальных окон — её позиция в DOM стабильна, после закрытия модалок она не «прыгает» под рабочую область.'
WHERE id = 27;

UPDATE t_p28138419_nova_initiative_14.support_tickets
SET status = 'resolved', resolved_at = now(), updated_at = now(),
    admin_note = 'Исправлено: мобильные модальные окна блокируют прокрутку фоновой страницы (body overflow hidden + overscroll-contain) — фон больше не листается при прокрутке содержимого.'
WHERE id = 28;