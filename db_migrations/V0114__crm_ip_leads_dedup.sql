-- Связь IP-адреса посетителя с созданным в Битрикс24 лидом.
-- Нужна, чтобы повторные заходы с того же IP не плодили новые лиды,
-- а дописывались комментарием в уже существующий лид.
CREATE TABLE IF NOT EXISTS crm_ip_leads (
    ip               VARCHAR(64) PRIMARY KEY,
    bitrix_lead_id   BIGINT NULL,
    visits_count     INTEGER NOT NULL DEFAULT 1,
    first_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE crm_ip_leads IS 'IP → лид Битрикс24: дедупликация анонимных лидов по IP';
