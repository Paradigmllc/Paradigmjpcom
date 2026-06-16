-- Sales OS post-outreach OSS tools.
-- Registers Chatwoot, LiveKit, Directus, and Keystatic as first-class
-- operational surfaces without opening new public tables.

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
      'calcom',
      'docuseal',
      'notion',
      'directus',
      'keystatic',
      'chatwoot',
      'livekit',
      'trigger_dev',
      'trigger-dev',
      'dify',
      'crawl4ai',
      'searxng'
    )
  );

alter table public.sales_tool_connections
  drop constraint if exists sales_tool_connections_interface_type_check;

alter table public.sales_tool_connections
  add constraint sales_tool_connections_interface_type_check
  check (
    interface_type in (
      'database',
      'crm',
      'spreadsheet',
      'operator_console',
      'bi',
      'automation',
      'scheduling',
      'contract',
      'legacy_workspace',
      'cms',
      'demo_cms',
      'inbox',
      'voice',
      'crawler',
      'ai',
      'search'
    )
  );

insert into public.sales_tool_connections
  (slug, display_name, role, interface_type, deployment_type, base_url, health_url, status, owner, meta)
values
  (
    'chatwoot',
    'Chatwoot OSS',
    'Unified inbox for email replies, site chat, and social DMs after outreach lands. Webhooks return replies to sales_activity_log and sales_operator_queue_items.',
    'inbox',
    'oss_self_hosted',
    'https://chatwoot.paradigmjp.com',
    null,
    'planned',
    'Paradigm',
    '{"dns":"chatwoot.paradigmjp.com","webhook":"/api/sales/chatwoot/webhook","n8n_env":"N8N_POST_OUTREACH_WEBHOOK_URL","connects_to":["sales_activity_log","sales_operator_queue_items"]}'::jsonb
  ),
  (
    'livekit',
    'LiveKit OSS',
    'Realtime voice and WebRTC lane for AI discovery calls. Webhooks return call context to activity logs and meeting-prep queue.',
    'voice',
    'oss_self_hosted',
    'https://livekit.paradigmjp.com',
    null,
    'planned',
    'Paradigm',
    '{"dns":"livekit.paradigmjp.com","webhook":"/api/sales/livekit/webhook","n8n_env":"N8N_LIVEKIT_DISCOVERY_WEBHOOK_URL","connects_to":["sales_activity_log","sales_operator_queue_items"]}'::jsonb
  ),
  (
    'directus',
    'Directus OSS',
    'Asset, proposal, and slide content management studio for sales materials when the dedicated Directus service is deployed.',
    'cms',
    'oss_self_hosted',
    'https://directus.paradigmjp.com',
    null,
    'planned',
    'Paradigm',
    '{"dns":"directus.paradigmjp.com","fallback":"Revenue OS internal asset studio","env":["DIRECTUS_BASE_URL","DIRECTUS_TOKEN"]}'::jsonb
  ),
  (
    'keystatic',
    'Keystatic OSS',
    'Git-backed CMS for Astro demo-site edits and safe non-engineering content updates.',
    'demo_cms',
    'oss_self_hosted',
    'https://keystatic.paradigmjp.com',
    null,
    'planned',
    'Paradigm',
    '{"dns":"keystatic.paradigmjp.com","fallback":"Revenue OS internal demo-site workbench","env":["KEYSTATIC_BASE_URL"]}'::jsonb
  )
on conflict (slug) do update set
  display_name = excluded.display_name,
  role = excluded.role,
  interface_type = excluded.interface_type,
  deployment_type = excluded.deployment_type,
  base_url = excluded.base_url,
  health_url = excluded.health_url,
  status = case
    when public.sales_tool_connections.status = 'active' then public.sales_tool_connections.status
    else excluded.status
  end,
  owner = excluded.owner,
  meta = public.sales_tool_connections.meta || excluded.meta,
  updated_at = now();

notify pgrst, 'reload schema';
