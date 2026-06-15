-- Обнуление эффективности QR-флаеров без удаления данных.
-- Статистика кампаний считается по точному совпадению site_visits.utm_campaign = slug
-- и по landing_path. Переименовываем эти поля у тестовых заходов в архивную метку,
-- чтобы они перестали учитываться в эффективности кампаний urfu_qr_cae / urfu_qr_diplom.
UPDATE site_visits
SET utm_campaign = '_archived_' || COALESCE(utm_campaign, 'noutm'),
    landing_path = '/_archived' || COALESCE(landing_path, '')
WHERE utm_campaign IN ('urfu_qr_cae', 'urfu_qr_diplom')
   OR landing_path IN ('/urfu_qr_cae', '/urfu_qr_diplom');