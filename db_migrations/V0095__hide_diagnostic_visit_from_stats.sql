UPDATE t_p28138419_nova_initiative_14.site_visits
SET source_type = 'internal',
    source_label = 'diagnostic hidden',
    utm_source = NULL,
    utm_medium = NULL,
    utm_campaign = NULL,
    landing_path = NULL
WHERE id = 22 AND visit_key = 'diag-12345-check';