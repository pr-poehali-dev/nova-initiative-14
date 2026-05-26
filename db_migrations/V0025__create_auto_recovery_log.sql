-- Лог авто-восстановлений от "белого экрана".
-- Каждая запись = один случай, когда у пользователя сработал
-- автоматический recovery (битый кэш / watchdog / runtime-ошибка).
CREATE TABLE IF NOT EXISTS auto_recovery_log (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Тип триггера: 'chunk_error' | 'watchdog' | 'react_error' | 'window_error' | 'unhandled_rejection'
  trigger_type VARCHAR(40) NOT NULL,
  -- Текст ошибки (если есть)
  error_message TEXT,
  -- Какая попытка авто-перезагрузки (1, 2)
  attempt SMALLINT NOT NULL DEFAULT 1,
  -- URL страницы, где случилась проблема
  page_url TEXT,
  -- User-Agent для сегментации (мобильный/десктоп, браузер)
  user_agent TEXT,
  -- IP пользователя (для дедупликации)
  ip VARCHAR(64),
  -- Build commit (если фронт его передаст)
  build_id VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_auto_recovery_log_created_at
  ON auto_recovery_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auto_recovery_log_trigger
  ON auto_recovery_log (trigger_type, created_at DESC);
