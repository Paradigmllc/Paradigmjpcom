-- Portal-first SMB candidate intake uses the existing source select in Twenty.
-- Keep values stable so retries and read-back checks remain idempotent.
insert into public.sales_crm_select_options
  (field_key, value, label, country_code, position, color)
values
  ('source', 'houzz', 'Houzz', 'JP', 11, 'yellow'),
  ('source', 'ekiten', 'エキテン', 'JP', 12, 'purple'),
  ('source', 'jmty', 'ジモティー', 'JP', 13, 'cyan')
on conflict (field_key, value) do update set
  label = excluded.label,
  country_code = excluded.country_code,
  position = excluded.position,
  color = excluded.color,
  is_active = true,
  updated_at = now();
