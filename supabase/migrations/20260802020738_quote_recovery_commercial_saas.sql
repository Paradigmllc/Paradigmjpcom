-- Quote Recovery commercial SaaS core.
-- Customer data is intentionally server-only: every table is protected by RLS,
-- anon/authenticated grants are revoked, and application routes verify both the
-- session and the organization membership before using the service-role client.

create table if not exists public.quote_recovery_users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  display_name text not null,
  email_verified_at timestamptz,
  failed_login_count integer not null default 0 check (failed_login_count >= 0),
  locked_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists quote_recovery_users_email_unique
  on public.quote_recovery_users (lower(email));

create table if not exists public.quote_recovery_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  created_by uuid not null references public.quote_recovery_users(id) on delete restrict,
  plan text not null default 'starter' check (plan in ('starter', 'team')),
  subscription_status text not null default 'incomplete'
    check (subscription_status in ('incomplete', 'active', 'past_due', 'unpaid', 'canceled', 'paused')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  last_stripe_event_created bigint not null default 0,
  seat_limit integer not null default 3 check (seat_limit between 1 and 1000),
  monthly_quote_limit integer not null default 2000 check (monthly_quote_limit between 1 and 1000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quote_recovery_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.quote_recovery_organizations(id) on delete cascade,
  user_id uuid not null references public.quote_recovery_users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.quote_recovery_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.quote_recovery_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.quote_recovery_password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.quote_recovery_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.quote_recovery_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.quote_recovery_organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'member')),
  token_hash text not null unique,
  invited_by uuid not null references public.quote_recovery_users(id) on delete restrict,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.quote_recovery_imports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.quote_recovery_organizations(id) on delete cascade,
  imported_by uuid not null references public.quote_recovery_users(id) on delete restrict,
  file_name text not null,
  source_rows integer not null check (source_rows >= 0),
  imported_rows integer not null check (imported_rows >= 0),
  rejected_rows integer not null check (rejected_rows >= 0),
  open_amount bigint not null default 0 check (open_amount >= 0),
  stale_amount bigint not null default 0 check (stale_amount >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.quote_recovery_quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.quote_recovery_organizations(id) on delete cascade,
  import_id uuid references public.quote_recovery_imports(id) on delete set null,
  external_quote_id text not null,
  customer_name text not null,
  quote_date date not null,
  amount bigint not null check (amount >= 0),
  owner_name text,
  last_contact_date date,
  next_action_date date,
  status text not null default 'open',
  recovery_score integer not null default 0 check (recovery_score between 0 and 100),
  recovery_priority text not null default 'watch' check (recovery_priority in ('urgent', 'high', 'watch', 'closed')),
  recovery_reasons jsonb not null default '[]'::jsonb check (jsonb_typeof(recovery_reasons) = 'array'),
  created_by uuid not null references public.quote_recovery_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, external_quote_id)
);

create table if not exists public.quote_recovery_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.quote_recovery_organizations(id) on delete cascade,
  quote_id uuid not null references public.quote_recovery_quotes(id) on delete cascade,
  created_by uuid not null references public.quote_recovery_users(id) on delete restrict,
  activity_type text not null check (activity_type in ('call', 'email', 'meeting', 'note', 'status_change', 'next_action')),
  note text not null check (char_length(note) between 1 and 4000),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.quote_recovery_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.quote_recovery_organizations(id) on delete cascade,
  user_id uuid references public.quote_recovery_users(id) on delete cascade,
  notification_type text not null,
  title text not null,
  message text not null,
  link text,
  read_at timestamptz,
  delivery_status jsonb not null default '{}'::jsonb check (jsonb_typeof(delivery_status) = 'object'),
  created_at timestamptz not null default now()
);

create table if not exists public.quote_recovery_usage_monthly (
  organization_id uuid not null references public.quote_recovery_organizations(id) on delete cascade,
  period_start date not null,
  import_count integer not null default 0 check (import_count >= 0),
  quote_row_count integer not null default 0 check (quote_row_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (organization_id, period_start)
);

create table if not exists public.quote_recovery_stripe_events (
  event_id text primary key,
  event_type text not null,
  object_id text,
  payload_digest text not null,
  event_created bigint not null,
  processed_at timestamptz,
  processing_error text,
  received_at timestamptz not null default now()
);

create table if not exists public.quote_recovery_audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid references public.quote_recovery_organizations(id) on delete set null,
  actor_user_id uuid references public.quote_recovery_users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists quote_recovery_memberships_user_idx on public.quote_recovery_memberships(user_id);
create index if not exists quote_recovery_sessions_active_idx on public.quote_recovery_sessions(token_hash, expires_at) where revoked_at is null;
create index if not exists quote_recovery_quotes_org_priority_idx on public.quote_recovery_quotes(organization_id, recovery_priority, recovery_score desc);
create index if not exists quote_recovery_quotes_org_next_action_idx on public.quote_recovery_quotes(organization_id, next_action_date);
create index if not exists quote_recovery_imports_org_created_idx on public.quote_recovery_imports(organization_id, created_at desc);
create index if not exists quote_recovery_notifications_unread_idx on public.quote_recovery_notifications(organization_id, user_id, created_at desc) where read_at is null;
create index if not exists quote_recovery_audit_org_created_idx on public.quote_recovery_audit_logs(organization_id, created_at desc);

create or replace function public.quote_recovery_create_account(
  p_email text,
  p_password_hash text,
  p_display_name text,
  p_organization_name text,
  p_organization_slug text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_organization_id uuid;
begin
  insert into public.quote_recovery_users(email, password_hash, display_name)
  values (lower(trim(p_email)), p_password_hash, trim(p_display_name))
  returning id into v_user_id;

  insert into public.quote_recovery_organizations(name, slug, created_by)
  values (trim(p_organization_name), p_organization_slug, v_user_id)
  returning id into v_organization_id;

  insert into public.quote_recovery_memberships(organization_id, user_id, role)
  values (v_organization_id, v_user_id, 'owner');

  insert into public.quote_recovery_audit_logs(organization_id, actor_user_id, action, target_type, target_id)
  values (v_organization_id, v_user_id, 'organization.created', 'organization', v_organization_id::text);

  return jsonb_build_object('user_id', v_user_id, 'organization_id', v_organization_id);
end;
$$;

revoke all on function public.quote_recovery_create_account(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.quote_recovery_create_account(text, text, text, text, text) to service_role;

create or replace function public.quote_recovery_record_usage(
  p_organization_id uuid,
  p_period_start date,
  p_quote_rows integer
) returns public.quote_recovery_usage_monthly
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result public.quote_recovery_usage_monthly;
begin
  insert into public.quote_recovery_usage_monthly(organization_id, period_start, import_count, quote_row_count)
  values (p_organization_id, p_period_start, 1, p_quote_rows)
  on conflict (organization_id, period_start) do update
    set import_count = public.quote_recovery_usage_monthly.import_count + 1,
        quote_row_count = public.quote_recovery_usage_monthly.quote_row_count + excluded.quote_row_count,
        updated_at = now()
  returning * into result;
  return result;
end;
$$;

revoke all on function public.quote_recovery_record_usage(uuid, date, integer) from public, anon, authenticated;
grant execute on function public.quote_recovery_record_usage(uuid, date, integer) to service_role;

create or replace function public.quote_recovery_accept_invitation_create_user(
  p_token_hash text,
  p_email text,
  p_password_hash text,
  p_display_name text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  invitation public.quote_recovery_invitations;
  v_user_id uuid;
begin
  select * into invitation
  from public.quote_recovery_invitations
  where token_hash = p_token_hash
    and accepted_at is null
    and expires_at > now()
  for update;
  if invitation.id is null then raise exception 'Invitation is invalid or expired'; end if;
  if lower(invitation.email) <> lower(trim(p_email)) then raise exception 'Invitation email does not match'; end if;

  insert into public.quote_recovery_users(email, password_hash, display_name)
  values (lower(trim(p_email)), p_password_hash, trim(p_display_name))
  returning id into v_user_id;

  insert into public.quote_recovery_memberships(organization_id, user_id, role)
  values (invitation.organization_id, v_user_id, invitation.role);

  update public.quote_recovery_invitations set accepted_at = now() where id = invitation.id;
  insert into public.quote_recovery_audit_logs(organization_id, actor_user_id, action, target_type, target_id)
  values (invitation.organization_id, v_user_id, 'membership.invitation_accepted', 'membership', v_user_id::text);
  return jsonb_build_object('user_id', v_user_id, 'organization_id', invitation.organization_id);
end;
$$;

revoke all on function public.quote_recovery_accept_invitation_create_user(text, text, text, text) from public, anon, authenticated;
grant execute on function public.quote_recovery_accept_invitation_create_user(text, text, text, text) to service_role;

create or replace function public.quote_recovery_reset_password(
  p_token_hash text,
  p_password_hash text
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  reset_row public.quote_recovery_password_resets;
begin
  select * into reset_row
  from public.quote_recovery_password_resets
  where token_hash = p_token_hash
    and consumed_at is null
    and expires_at > now()
  for update;
  if reset_row.id is null then return false; end if;
  update public.quote_recovery_users
    set password_hash = p_password_hash, failed_login_count = 0, locked_until = null, updated_at = now()
    where id = reset_row.user_id;
  update public.quote_recovery_password_resets set consumed_at = now() where id = reset_row.id;
  update public.quote_recovery_sessions set revoked_at = now() where user_id = reset_row.user_id and revoked_at is null;
  return true;
end;
$$;

revoke all on function public.quote_recovery_reset_password(text, text) from public, anon, authenticated;
grant execute on function public.quote_recovery_reset_password(text, text) to service_role;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'quote_recovery_users', 'quote_recovery_organizations', 'quote_recovery_memberships',
    'quote_recovery_sessions', 'quote_recovery_password_resets', 'quote_recovery_invitations',
    'quote_recovery_imports', 'quote_recovery_quotes', 'quote_recovery_activities',
    'quote_recovery_notifications', 'quote_recovery_usage_monthly',
    'quote_recovery_stripe_events', 'quote_recovery_audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on table public.%I to service_role', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_service_role_all', table_name);
    execute format(
      'create policy %I on public.%I for all to service_role using (true) with check (true)',
      table_name || '_service_role_all',
      table_name
    );
  end loop;
end;
$$;

grant usage, select on sequence public.quote_recovery_audit_logs_id_seq to service_role;

comment on table public.quote_recovery_users is 'Server-only Quote Recovery customer identities; password hashes are never exposed to browser roles.';
comment on table public.quote_recovery_quotes is 'Tenant-scoped quote recovery records imported after a paid organization activates its subscription.';
comment on table public.quote_recovery_stripe_events is 'Stripe webhook idempotency ledger; raw event payloads are not persisted.';

notify pgrst, 'reload schema';
