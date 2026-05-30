UPDATE t_p28138419_nova_initiative_14.support_tickets
SET status = 'resolved', resolved_at = now(), updated_at = now(),
    admin_note = 'Реализовано: журнал версий CAE на странице /cae/changelog (SEO-страница с историей версий x.x.10/20/30…), broadcast-уведомление при выпуске версии, жанр «Новости: дайджест обновлений» в рекламогенераторе. Ранее убрана ложная надпись про PDF и лишний баннер на «Мои проекты».'
WHERE id = 21;

UPDATE t_p28138419_nova_initiative_14.support_tickets
SET status = 'resolved', resolved_at = now(), updated_at = now(),
    admin_note = 'Реализовано: сбои у пользователей автоматически фиксируются и создают тикет (kind=bug, source=auto) с дедупликацией по сигнатуре ошибки+страницы; повторы увеличивают счётчик, а не плодят тикеты. При сбое показывается мягкая плашка «мы заметили сбой». После того как админ закрывает тикет (resolved) — автору приходит уведомление в колокольчик и email через SMTP (общий с SSO).'
WHERE id = 29;

UPDATE t_p28138419_nova_initiative_14.support_tickets
SET status = 'resolved', resolved_at = now(), updated_at = now(),
    admin_note = 'Реализовано: колокольчик уведомлений в шапке (десктоп и мобайл) с бейджем непрочитанных и панелью. Типы: обновления сервиса, исправления, ответы на обращения. Поллинг счётчика, отметка прочтения, переход по ссылке.'
WHERE id = 30;

UPDATE t_p28138419_nova_initiative_14.support_tickets
SET status = 'resolved', resolved_at = now(), updated_at = now(),
    admin_note = 'Реализовано полностью: блок «Мои обращения» сворачиваемый (3 последних, активные сверху, счётчик активных, «показать все»). Добавлена ачивка «Соавтор продукта» за 5 решённых обращений с прогресс-баром N/5 в личном кабинете.'
WHERE id = 31;