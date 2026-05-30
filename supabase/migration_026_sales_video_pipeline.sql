-- Sales OS video production pipeline.
-- n8n is the orchestration bus; renderers stay in HyperFrames/Remotion/OpenMontage/ComfyUI/Vast.ai.

create table if not exists public.sales_video_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.sales_companies (id) on delete set null,
  job_type text not null default 'sales_video',
  status text not null default 'draft',
  priority integer not null default 50,
  title text not null,
  locale text not null default 'ja',
  target_platform text not null default 'sales_deck_embed',
  render_engine text not null default 'hyperframes',
  orchestration_stage text not null default 'draft',
  n8n_workflow_url text,
  n8n_execution_id text,
  vast_instance_id text,
  r2_output_url text,
  preview_url text,
  storyboard jsonb not null default '{}'::jsonb,
  production_plan jsonb not null default '{}'::jsonb,
  input_assets jsonb not null default '{}'::jsonb,
  render_outputs jsonb not null default '{}'::jsonb,
  approvals jsonb not null default '{}'::jsonb,
  error_message text,
  requested_by text not null default 'sales-os',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_video_jobs_type_check
    check (job_type in ('sales_video', 'subscription_video')),
  constraint sales_video_jobs_status_check
    check (status in ('draft', 'queued', 'routing', 'waiting_render', 'rendering', 'review_required', 'completed', 'failed', 'cancelled')),
  constraint sales_video_jobs_priority_check
    check (priority between 0 and 100),
  constraint sales_video_jobs_render_engine_check
    check (render_engine in ('hyperframes', 'remotion', 'openmontage', 'comfyui', 'external')),
  constraint sales_video_jobs_platform_check
    check (target_platform in ('sales_deck_embed', 'report_page', 'shorts_9_16', 'youtube_16_9', 'linkedin_1_1', 'customer_subscription'))
);

create index if not exists idx_sales_video_jobs_company
  on public.sales_video_jobs (company_id, created_at desc);

create index if not exists idx_sales_video_jobs_status
  on public.sales_video_jobs (status, priority desc, created_at desc);

drop trigger if exists trg_sales_video_jobs_touch on public.sales_video_jobs;
create trigger trg_sales_video_jobs_touch
before update on public.sales_video_jobs
for each row execute function public.sales_touch_updated_at();

alter table public.sales_video_jobs enable row level security;

drop policy if exists sales_video_jobs_service_role_all on public.sales_video_jobs;
create policy sales_video_jobs_service_role_all
  on public.sales_video_jobs for all to service_role
  using (true) with check (true);

grant select, insert, update, delete on table public.sales_video_jobs to service_role;

comment on table public.sales_video_jobs is
  'Video production jobs for sales videos and video subscription delivery. n8n coordinates; renderers remain external or self-hosted.';

insert into public.sales_tool_connections
  (slug, display_name, role, interface_type, deployment_type, base_url, health_url, status, owner, meta)
values
  (
    'n8n',
    'n8n OSS',
    'Workflow traffic controller for company diagnosis, Dify copy generation, ComfyUI asset prompts, Vast.ai GPU routing, HyperFrames/Remotion rendering, R2 upload, Slack review, and delivery status updates.',
    'automation',
    'oss_self_hosted',
    'https://n8n.paradigmjp.com',
    null,
    'active',
    'Paradigm',
    '{"video_pipeline":true,"role":"orchestration_bus_not_renderer","webhook_env":"N8N_VIDEO_PIPELINE_WEBHOOK_URL"}'::jsonb
  )
on conflict (slug) do update set
  display_name = excluded.display_name,
  role = excluded.role,
  interface_type = excluded.interface_type,
  deployment_type = excluded.deployment_type,
  base_url = excluded.base_url,
  health_url = excluded.health_url,
  status = excluded.status,
  owner = excluded.owner,
  meta = sales_tool_connections.meta || excluded.meta,
  updated_at = now();

notify pgrst, 'reload schema';
