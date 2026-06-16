-- Sales OS Trigger.dev migration hardening.
-- Keeps Trigger.dev as a first-class tool slug for operator queue FK writes.

alter table public.sales_tool_connections
  drop constraint if exists sales_tool_connections_slug_check;

alter table public.sales_tool_connections
  add constraint sales_tool_connections_slug_check
  check (
    slug in (
      'supabase',
      'twenty',
      'nocodb',
      'appsmith',
      'metabase',
      'n8n',
      'trigger_dev',
      'trigger-dev',
      'calcom',
      'docuseal',
      'notion',
      'directus',
      'keystatic',
      'chatwoot',
      'livekit',
      'dify',
      'crawl4ai',
      'searxng'
    )
  );

insert into public.sales_tool_connections
  (slug, display_name, role, interface_type, deployment_type, base_url, health_url, status, owner, meta)
values
  (
    'trigger_dev',
    'Trigger.dev',
    'Primary Sales OS orchestration layer for enrichment, outreach routing, video jobs, and guarded approvals.',
    'automation',
    'legacy_external',
    'https://cloud.trigger.dev',
    null,
    'active',
    'Paradigm',
    '{"primary_orchestrator":true,"replaces":"n8n","connects_to":["sales_pipeline_runs","sales_enrichment_jobs","sales_operator_queue_items","sales_video_jobs"]}'::jsonb
  )
on conflict (slug) do update set
  display_name = excluded.display_name,
  role = excluded.role,
  interface_type = excluded.interface_type,
  deployment_type = excluded.deployment_type,
  base_url = coalesce(public.sales_tool_connections.base_url, excluded.base_url),
  health_url = coalesce(public.sales_tool_connections.health_url, excluded.health_url),
  status = case
    when public.sales_tool_connections.status = 'active' then public.sales_tool_connections.status
    else excluded.status
  end,
  owner = coalesce(public.sales_tool_connections.owner, excluded.owner),
  meta = public.sales_tool_connections.meta || excluded.meta,
  updated_at = now();
