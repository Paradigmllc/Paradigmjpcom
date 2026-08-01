-- Migration 065: OpenClaw as primary orchestrator — tool_connections ledger update.
-- 2026-07-06: Trigger.dev decommissioned. OpenClaw replaces it as the pipeline orchestrator.

-- 1. Expand slug CHECK to include 'openclaw' (new orchestrator).
alter table public.sales_tool_connections
  drop constraint if exists sales_tool_connections_slug_check;

alter table public.sales_tool_connections
  add constraint sales_tool_connections_slug_check
    check (slug = any (array[
      'supabase','twenty','nocodb','appsmith','metabase',
      'n8n','trigger_dev','trigger-dev',
      'calcom','docuseal','notion','directus','keystatic',
      'chatwoot','livekit','dify','crawl4ai','searxng',
      'openclaw'
    ]));

-- 2. Expand status CHECK to include 'inactive' (decommissioned tools).
alter table public.sales_tool_connections
  drop constraint if exists sales_tool_connections_status_check;

alter table public.sales_tool_connections
  add constraint sales_tool_connections_status_check
    check (status = any (array['active','planned','disabled','error','inactive']));

-- 3. Mark trigger-dev as inactive (decommissioned).
update public.sales_tool_connections
set
  status = 'inactive',
  meta = meta || '{"primary_orchestrator":false,"decommissioned":"2026-07-06","replaced_by":"openclaw"}'::jsonb,
  updated_at = now()
where slug = 'trigger-dev'
  and status = 'active';

-- Also decommission trigger_dev if it exists
update public.sales_tool_connections
set
  status = 'inactive',
  meta = meta || '{"primary_orchestrator":false,"decommissioned":"2026-07-06","replaced_by":"openclaw"}'::jsonb,
  updated_at = now()
where slug = 'trigger_dev'
  and status = 'active';

-- 4. Insert openclaw as the new primary orchestrator (skip if exists).
insert into public.sales_tool_connections
  (slug, display_name, role, interface_type, deployment_type, base_url, health_url, status, owner, meta)
select 'openclaw', 'OpenClaw Pipeline', 
  'Primary pipeline orchestrator: lead-discovery → diagnosis-output → crm-sync → outreach-exec. Replaces Trigger.dev (decommissioned 2026-07-06).',
  'automation', 'oss_self_hosted', null, null, 'active', 'Paradigm',
  '{"primary_orchestrator":true,"replaces":"trigger-dev","skills":["lead-discovery","diagnosis-output","crm-sync","outreach-exec"]}'::jsonb
where not exists (select 1 from public.sales_tool_connections where slug = 'openclaw');

notify pgrst, 'reload schema';
