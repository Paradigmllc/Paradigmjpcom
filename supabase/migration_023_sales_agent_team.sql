-- Sales OS autonomous agent team command ledger.
-- Telegram (@aiparadigmbot), Hermes Agent, Paperclip, OpenCode, and OpenClaw
-- write intent and execution evidence here while Supabase remains the SSOT.

create table if not exists public.sales_agent_commands (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'telegram',
  chat_id text,
  telegram_user text,
  command_text text not null,
  intent text not null,
  autonomy_level text not null default 'copilot',
  status text not null default 'queued',
  approval_required boolean not null default true,
  approved_by text,
  approved_at timestamptz,
  run_summary text,
  result_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint sales_agent_commands_source_check
    check (source in ('telegram', 'hermes_agent', 'paperclip', 'opencode', 'openclaw', 'n8n', 'dashboard')),
  constraint sales_agent_commands_intent_check
    check (intent in (
      'status_report',
      'run_enrichment',
      'run_outreach_dry_run',
      'prepare_assets',
      'sync_twenty',
      'manual_review',
      'unknown'
    )),
  constraint sales_agent_commands_autonomy_level_check
    check (autonomy_level in ('observe', 'copilot', 'autopilot_guarded')),
  constraint sales_agent_commands_status_check
    check (status in ('queued', 'running', 'completed', 'blocked', 'failed'))
);

create index if not exists idx_sales_agent_commands_status
  on public.sales_agent_commands (status, created_at desc);
create index if not exists idx_sales_agent_commands_intent
  on public.sales_agent_commands (intent, created_at desc);
create index if not exists idx_sales_agent_commands_chat
  on public.sales_agent_commands (chat_id, created_at desc)
  where chat_id is not null;

create table if not exists public.sales_agent_events (
  id uuid primary key default gen_random_uuid(),
  command_id uuid references public.sales_agent_commands (id) on delete cascade,
  agent_role text not null,
  event_type text not null,
  status text not null default 'info',
  title text not null,
  message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint sales_agent_events_agent_role_check
    check (agent_role in ('ceo_hermes', 'paperclip_operator', 'opencode_engineer', 'openclaw_researcher', 'outreach_worker', 'system')),
  constraint sales_agent_events_status_check
    check (status in ('info', 'success', 'warning', 'error'))
);

create index if not exists idx_sales_agent_events_command
  on public.sales_agent_events (command_id, created_at desc);
create index if not exists idx_sales_agent_events_role
  on public.sales_agent_events (agent_role, created_at desc);

drop trigger if exists trg_sales_agent_commands_touch on public.sales_agent_commands;
create trigger trg_sales_agent_commands_touch
before update on public.sales_agent_commands
for each row execute function public.sales_touch_updated_at();

alter table public.sales_agent_commands enable row level security;
alter table public.sales_agent_events enable row level security;

drop policy if exists sales_agent_commands_service_role_all on public.sales_agent_commands;
create policy sales_agent_commands_service_role_all
  on public.sales_agent_commands for all to service_role
  using (true) with check (true);

drop policy if exists sales_agent_events_service_role_all on public.sales_agent_events;
create policy sales_agent_events_service_role_all
  on public.sales_agent_events for all to service_role
  using (true) with check (true);

grant select, insert, update, delete on table public.sales_agent_commands to service_role;
grant select, insert, update, delete on table public.sales_agent_events to service_role;

comment on table public.sales_agent_commands is
  'Telegram/Hermes/Paperclip/OpenCode/OpenClaw command ledger. Supabase is the SSOT; live outreach stays approval-gated.';
comment on table public.sales_agent_events is
  'Execution events for the autonomous sales agent team, used by the dashboard, Slack summaries, and audit review.';
comment on column public.sales_agent_commands.autonomy_level is
  'observe = read only, copilot = prepare and queue work, autopilot_guarded = execute safe jobs but keep live outreach approval gates.';
