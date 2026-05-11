-- Очистка пустого telegram и адреса с УрФУ
UPDATE t_p28138419_nova_initiative_14.contacts SET value = '' WHERE key = 'telegram';
UPDATE t_p28138419_nova_initiative_14.contacts SET value = '' WHERE key = 'telegram_link';
UPDATE t_p28138419_nova_initiative_14.contacts SET value = 'Екатеринбург' WHERE key = 'address';

-- Добавляем VK, Max
INSERT INTO t_p28138419_nova_initiative_14.contacts (key, value, label, sort_order) VALUES
  ('vk_link', '', 'Ссылка ВКонтакте', 13),
  ('max', '', 'MAX', 14),
  ('max_link', '', 'Ссылка MAX', 15)
ON CONFLICT DO NOTHING;

-- Таблица для блоков "О нас"
CREATE TABLE IF NOT EXISTS t_p28138419_nova_initiative_14.about_sections (
  id SERIAL PRIMARY KEY,
  title VARCHAR(256) NOT NULL,
  body TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE
);

INSERT INTO t_p28138419_nova_initiative_14.about_sections (title, body, sort_order) VALUES
  ('Как всё началось', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.', 1),
  ('Наша философия', 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.', 2),
  ('Почему мы, а не кто-то ещё', 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.', 3),
  ('Наша мотивация', 'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.', 4);
