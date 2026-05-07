CREATE TABLE t_p28138419_nova_initiative_14.contacts (
    id SERIAL PRIMARY KEY,
    key VARCHAR(64) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    label VARCHAR(128),
    sort_order INTEGER DEFAULT 0
);

INSERT INTO t_p28138419_nova_initiative_14.contacts (key, value, label, sort_order) VALUES
  ('telegram',          '@diplom_inzh',              'Telegram',              1),
  ('telegram_link',     'https://t.me/diplom_inzh',  'Ссылка Telegram',       2),
  ('phone',             '+7 (343) 200-00-00',         'Телефон',               3),
  ('phone_tel',         'tel:+73432000000',           'Телефон (href)',         4),
  ('working_hours',     '10:00–20:00',                'Часы работы',           5),
  ('working_hours_label','Ежедневно 10:00–20:00',     'Часы работы (полные)',  6),
  ('city',              'Екатеринбург',               'Город',                 7),
  ('timezone',          'UTC+5',                      'Часовой пояс',          8),
  ('address',           'Екатеринбург, УрФУ',         'Адрес',                 9),
  ('email',             '',                           'Email',                10),
  ('vk',                '',                           'ВКонтакте',            11),
  ('instagram',         '',                           'Instagram',            12);
