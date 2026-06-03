-- Чиним дублирующиеся id элементов в сохранённых CAE-моделях.
-- Причина: старый генератор id (e${length+1}) переиспользовал номер после
-- удаления среднего элемента → два элемента с одинаковым id. Это ломало
-- отрисовку (React-ключи) и расчёт (тикеты №34, №35, №38, №40).
-- Переименовываем ВТОРОЕ вхождение дубля на наименьший свободный id 'e1'.

-- Проект #7 «П рама», версия 58: элементы [e2, e2] → второй e2 (индекс 1) → e1
UPDATE t_p28138419_nova_initiative_14.cae_project_versions
SET model_jsonb = jsonb_set(
  model_jsonb,
  '{elements,1,id}',
  '"e1"'::jsonb
)
WHERE id = 58
  AND (model_jsonb #>> '{elements,1,id}') = 'e2';

-- Проект #17 «Рама для бака», версия 56:
-- элементы [e3, e2, e3, ...] → второй e3 (индекс 2) → e1 (свободен)
UPDATE t_p28138419_nova_initiative_14.cae_project_versions
SET model_jsonb = jsonb_set(
  model_jsonb,
  '{elements,2,id}',
  '"e1"'::jsonb
)
WHERE id = 56
  AND (model_jsonb #>> '{elements,2,id}') = 'e3';

-- Проект #19 «Мост подвесной», версия 62:
-- элементы [e6, e9, e12, e4, e5, e6, e7] → второй e6 (индекс 5) → e1 (свободен)
UPDATE t_p28138419_nova_initiative_14.cae_project_versions
SET model_jsonb = jsonb_set(
  model_jsonb,
  '{elements,5,id}',
  '"e1"'::jsonb
)
WHERE id = 62
  AND (model_jsonb #>> '{elements,5,id}') = 'e6';