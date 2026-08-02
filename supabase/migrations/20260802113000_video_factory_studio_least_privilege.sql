begin;

-- Supabase default privileges can grant broader DML to service_role when a
-- table is created by postgres. Revoke first so the Studio contract remains
-- least-privilege and append-only tables cannot be changed or deleted.
revoke all on table public.video_factory_brand_kits from service_role;
revoke all on table public.video_factory_creative_templates from service_role;
revoke all on table public.video_factory_studio_projects from service_role;
revoke all on table public.video_factory_shot_revisions from service_role;
revoke all on table public.video_factory_quality_metrics from service_role;

grant select, insert, update on table public.video_factory_brand_kits to service_role;
grant select on table public.video_factory_creative_templates to service_role;
grant select, insert, update on table public.video_factory_studio_projects to service_role;
grant select, insert on table public.video_factory_shot_revisions to service_role;
grant select, insert on table public.video_factory_quality_metrics to service_role;

commit;
