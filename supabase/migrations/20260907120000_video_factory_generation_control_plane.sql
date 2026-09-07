begin;

create table if not exists public.video_factory_generation_policies (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  enabled boolean not null default true,
  daily_budget_cents integer not null check (daily_budget_cents between 0 and 10000000),
  per_run_budget_cents integer not null check (per_run_budget_cents between 0 and daily_budget_cents),
  per_run_llm_token_limit integer not null check (per_run_llm_token_limit between 0 and 10000000),
  per_run_gpu_seconds_limit integer not null check (per_run_gpu_seconds_limit between 0 and 86400),
  max_attempts integer not null check (max_attempts between 1 and 10),
  circuit_failure_threshold integer not null check (circuit_failure_threshold between 1 and 20),
  circuit_cooldown_minutes integer not null check (circuit_cooldown_minutes between 1 and 1440),
  reservation_ttl_minutes integer not null check (reservation_ttl_minutes between 1 and 240),
  updated_by text not null check (char_length(updated_by) between 2 and 200),
  updated_at timestamptz not null default now()
);

insert into public.video_factory_generation_policies (
  id, enabled, daily_budget_cents, per_run_budget_cents,
  per_run_llm_token_limit, per_run_gpu_seconds_limit, max_attempts,
  circuit_failure_threshold, circuit_cooldown_minutes,
  reservation_ttl_minutes, updated_by
) values (
  'studio-default', false, 5000, 1200, 30000, 900, 2, 3, 30, 20,
  'migration:20260907120000'
) on conflict (id) do nothing;

create table if not exists public.video_factory_provider_health (
  provider text primary key check (provider in ('vast_oss', 'runway', 'kling', 'seedance', 'heygen')),
  circuit_state text not null default 'closed' check (circuit_state in ('closed', 'open', 'half_open')),
  consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  opened_at timestamptz,
  retry_after timestamptz,
  last_failure_fingerprint text,
  last_success_at timestamptz,
  updated_at timestamptz not null default now(),
  check ((circuit_state = 'open' and retry_after is not null) or circuit_state <> 'open')
);

insert into public.video_factory_provider_health (provider)
select provider from unnest(array['vast_oss', 'runway', 'kling', 'seedance', 'heygen']) provider
on conflict (provider) do nothing;

create table if not exists public.video_factory_generation_runs (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique check (char_length(idempotency_key) between 8 and 200),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  project_id text check (project_id is null or project_id ~ '^[a-z0-9][a-z0-9-]{0,71}$'),
  shot_kind text not null check (shot_kind in ('avatar', 'cinematic', 'product', 'social', 'broll', 'motion_graphics')),
  quality_tier text not null check (quality_tier in ('economy', 'balanced', 'premium')),
  requested_provider text not null check (requested_provider in ('auto', 'vast_oss', 'runway', 'kling', 'seedance', 'heygen')),
  selected_provider text not null check (selected_provider in ('vast_oss', 'runway', 'kling', 'seedance', 'heygen')),
  state text not null check (state in ('blocked', 'reserved', 'queued', 'running', 'retryable', 'succeeded', 'failed', 'cancelled', 'cache_hit')),
  decision text not null check (decision in ('allow', 'block', 'reuse')),
  block_reason text,
  estimated_cost_cents integer not null check (estimated_cost_cents >= 0),
  reserved_cost_cents integer not null default 0 check (reserved_cost_cents >= 0),
  actual_cost_cents integer not null default 0 check (actual_cost_cents >= 0),
  estimated_llm_tokens integer not null default 0 check (estimated_llm_tokens >= 0),
  llm_tokens_used integer not null default 0 check (llm_tokens_used >= 0),
  estimated_gpu_seconds integer not null default 0 check (estimated_gpu_seconds >= 0),
  gpu_seconds_used integer not null default 0 check (gpu_seconds_used >= 0),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null check (max_attempts between 1 and 10),
  cache_source_run_id uuid references public.video_factory_generation_runs(id),
  requested_by text not null check (char_length(requested_by) between 2 and 200),
  expires_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((state = 'blocked' and block_reason is not null) or state <> 'blocked'),
  check ((decision = 'reuse' and cache_source_run_id is not null) or decision <> 'reuse')
);

create table if not exists public.video_factory_generation_attempts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.video_factory_generation_runs(id) on delete restrict,
  attempt_number integer not null check (attempt_number between 1 and 10),
  provider text not null check (provider in ('vast_oss', 'runway', 'kling', 'seedance', 'heygen')),
  external_request_id text,
  state text not null check (state in ('submitted', 'callback_received', 'succeeded', 'failed', 'cancelled')),
  cost_cents integer not null default 0 check (cost_cents >= 0),
  llm_tokens integer not null default 0 check (llm_tokens >= 0),
  gpu_seconds integer not null default 0 check (gpu_seconds >= 0),
  failure_fingerprint text,
  failure_message text,
  callback_received_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (run_id, attempt_number),
  unique (provider, external_request_id)
);

create table if not exists public.video_factory_generation_quality_reviews (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.video_factory_generation_runs(id) on delete restrict,
  identity_score integer not null check (identity_score between 0 and 100),
  motion_score integer not null check (motion_score between 0 and 100),
  prompt_score integer not null check (prompt_score between 0 and 100),
  artifact_score integer not null check (artifact_score between 0 and 100),
  audio_score integer not null check (audio_score between 0 and 100),
  commercial_score integer not null check (commercial_score between 0 and 100),
  overall_score numeric(5,2) generated always as (
    round((identity_score + motion_score + prompt_score + artifact_score + audio_score + commercial_score)::numeric / 6, 2)
  ) stored,
  approved boolean not null,
  reviewer text not null check (char_length(reviewer) between 2 and 200),
  note text not null check (char_length(note) between 10 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.video_factory_generation_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.video_factory_generation_runs(id) on delete restrict,
  event_type text not null check (char_length(event_type) between 3 and 80),
  actor text not null check (char_length(actor) between 2 and 200),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists video_factory_generation_runs_recent_idx
  on public.video_factory_generation_runs (created_at desc);
create index if not exists video_factory_generation_runs_budget_idx
  on public.video_factory_generation_runs (created_at, state, expires_at);
create index if not exists video_factory_generation_runs_cache_idx
  on public.video_factory_generation_runs (content_hash, quality_tier, selected_provider, completed_at desc)
  where state = 'succeeded';
create index if not exists video_factory_generation_attempts_run_idx
  on public.video_factory_generation_attempts (run_id, attempt_number desc);
create index if not exists video_factory_generation_events_recent_idx
  on public.video_factory_generation_events (created_at desc);

create or replace function public.video_factory_reserve_generation_run(
  p_idempotency_key text,
  p_content_hash text,
  p_project_id text,
  p_shot_kind text,
  p_quality_tier text,
  p_requested_provider text,
  p_estimated_cost_cents integer,
  p_estimated_llm_tokens integer,
  p_estimated_gpu_seconds integer,
  p_requested_by text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  policy_row public.video_factory_generation_policies%rowtype;
  health_row public.video_factory_provider_health%rowtype;
  existing_run public.video_factory_generation_runs%rowtype;
  cached_run public.video_factory_generation_runs%rowtype;
  created_run public.video_factory_generation_runs%rowtype;
  selected text;
  used_today bigint;
  reason text;
  decision text := 'allow';
  run_state text := 'reserved';
begin
  perform pg_advisory_xact_lock(hashtextextended('video_factory_generation_budget', 0));

  select * into existing_run from public.video_factory_generation_runs
  where idempotency_key = p_idempotency_key;
  if found then
    if row(existing_run.content_hash, existing_run.project_id, existing_run.shot_kind,
      existing_run.quality_tier, existing_run.requested_provider, existing_run.estimated_cost_cents,
      existing_run.estimated_llm_tokens, existing_run.estimated_gpu_seconds, existing_run.requested_by)
      is distinct from row(p_content_hash, nullif(p_project_id, ''), p_shot_kind,
      p_quality_tier, p_requested_provider, p_estimated_cost_cents,
      p_estimated_llm_tokens, p_estimated_gpu_seconds, p_requested_by) then
      raise exception 'generation idempotency payload conflict' using errcode = '22023';
    end if;
    return jsonb_build_object('run', to_jsonb(existing_run), 'idempotent_replay', true);
  end if;

  select * into policy_row from public.video_factory_generation_policies
  where id = 'studio-default' for update;
  if not found then raise exception 'generation policy not configured'; end if;

  selected := case
    when p_requested_provider <> 'auto' then p_requested_provider
    when p_shot_kind = 'avatar' then 'heygen'
    when p_quality_tier = 'premium' then 'kling'
    when p_quality_tier = 'balanced' then 'seedance'
    else 'vast_oss'
  end;

  select * into health_row from public.video_factory_provider_health
  where provider = selected for update;
  if health_row.circuit_state = 'open' and health_row.retry_after <= now() then
    update public.video_factory_provider_health set circuit_state = 'half_open', updated_at = now()
    where provider = selected;
    health_row.circuit_state := 'half_open';
    health_row.updated_at := now();
  end if;

  -- Conservative accounting: active work never loses its reservation at midnight
  -- or expiry. Only an unstarted, expired reservation can release unused funds.
  select coalesce(sum(case
    when state in ('queued', 'running', 'retryable') then greatest(actual_cost_cents, reserved_cost_cents)
    when state = 'reserved' and expires_at > now() then greatest(actual_cost_cents, reserved_cost_cents)
    else actual_cost_cents end), 0)
  into used_today
  from public.video_factory_generation_runs
  where greatest(created_at, completed_at, updated_at) >= ((now() at time zone 'Asia/Tokyo')::date at time zone 'Asia/Tokyo')
    or state in ('queued', 'running', 'retryable')
    or (state = 'reserved' and expires_at > now());

  -- Reuse remains disabled until artifact identity, rights, project scope and
  -- the latest human review can all be verified. A prompt hash is not an asset.

  if not policy_row.enabled then reason := 'policy_disabled';
  elsif cached_run.id is not null then
    decision := 'reuse'; run_state := 'cache_hit';
  elsif health_row.provider is null then reason := 'provider_not_configured';
  elsif health_row.circuit_state = 'open' then reason := 'provider_circuit_open';
  elsif health_row.circuit_state = 'half_open' and exists (
    select 1 from public.video_factory_generation_runs
    where selected_provider = selected and (
      state in ('queued', 'running', 'retryable')
      or (state = 'reserved' and expires_at > now())
    )
  ) then reason := 'provider_half_open_probe_in_progress';
  elsif p_estimated_cost_cents > policy_row.per_run_budget_cents then reason := 'per_run_cost_limit';
  elsif used_today + p_estimated_cost_cents > policy_row.daily_budget_cents then reason := 'daily_cost_limit';
  elsif p_estimated_llm_tokens > policy_row.per_run_llm_token_limit then reason := 'llm_token_limit';
  elsif selected = 'vast_oss' and p_estimated_gpu_seconds > policy_row.per_run_gpu_seconds_limit then reason := 'gpu_time_limit';
  end if;

  if reason is not null then decision := 'block'; run_state := 'blocked'; end if;

  insert into public.video_factory_generation_runs (
    idempotency_key, content_hash, project_id, shot_kind, quality_tier,
    requested_provider, selected_provider, state, decision, block_reason,
    estimated_cost_cents, reserved_cost_cents, estimated_llm_tokens,
    estimated_gpu_seconds, max_attempts, cache_source_run_id, requested_by,
    expires_at, completed_at
  ) values (
    p_idempotency_key, p_content_hash, nullif(p_project_id, ''), p_shot_kind, p_quality_tier,
    p_requested_provider, selected, run_state, decision, reason,
    p_estimated_cost_cents,
    case when decision = 'allow' then p_estimated_cost_cents else 0 end,
    p_estimated_llm_tokens, p_estimated_gpu_seconds, policy_row.max_attempts,
    case when decision = 'reuse' then cached_run.id else null end, p_requested_by,
    case when decision = 'allow' then now() + make_interval(mins => policy_row.reservation_ttl_minutes) else null end,
    case when decision = 'reuse' then now() else null end
  ) returning * into created_run;

  insert into public.video_factory_generation_events (run_id, event_type, actor, payload)
  values (created_run.id, 'preflight_' || decision, p_requested_by,
    jsonb_build_object('reason', reason, 'provider', selected, 'used_today_cents', used_today));

  return jsonb_build_object(
    'run', to_jsonb(created_run), 'idempotent_replay', false,
    'daily_used_cents', used_today, 'daily_budget_cents', policy_row.daily_budget_cents
  );
end;
$$;

create or replace function public.video_factory_record_generation_attempt(
  p_run_id uuid,
  p_state text,
  p_external_request_id text,
  p_cost_cents integer,
  p_llm_tokens integer,
  p_gpu_seconds integer,
  p_failure_fingerprint text,
  p_failure_message text,
  p_actor text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_row public.video_factory_generation_runs%rowtype;
  policy_row public.video_factory_generation_policies%rowtype;
  attempt_no integer;
  next_state text;
  effective_state text;
  effective_fingerprint text;
  effective_message text;
begin
  perform pg_advisory_xact_lock(hashtextextended('video_factory_generation_budget', 0));
  select * into run_row from public.video_factory_generation_runs where id = p_run_id for update;
  if not found then raise exception 'generation run not found'; end if;
  if run_row.state not in ('reserved', 'queued', 'running', 'retryable') then raise exception 'generation run is terminal'; end if;
  if run_row.expires_at is not null and run_row.expires_at <= now() and run_row.state = 'reserved' then raise exception 'generation reservation expired'; end if;
  if p_state not in ('succeeded', 'failed', 'cancelled') then raise exception 'invalid attempt terminal state'; end if;
  attempt_no := run_row.attempt_count + 1;
  if attempt_no > run_row.max_attempts then raise exception 'generation attempt limit reached'; end if;

  select * into policy_row from public.video_factory_generation_policies where id = 'studio-default';
  effective_state := p_state;
  effective_fingerprint := nullif(p_failure_fingerprint, '');
  effective_message := nullif(p_failure_message, '');
  if run_row.actual_cost_cents + p_cost_cents > policy_row.per_run_budget_cents then
    effective_state := 'failed'; effective_fingerprint := 'cost_limit_overrun'; effective_message := 'Actual provider cost exceeded the enforced per-run ceiling';
  elsif run_row.llm_tokens_used + p_llm_tokens > policy_row.per_run_llm_token_limit then
    effective_state := 'failed'; effective_fingerprint := 'llm_token_limit_overrun'; effective_message := 'Actual LLM tokens exceeded the enforced per-run ceiling';
  elsif run_row.selected_provider = 'vast_oss' and run_row.gpu_seconds_used + p_gpu_seconds > policy_row.per_run_gpu_seconds_limit then
    effective_state := 'failed'; effective_fingerprint := 'gpu_time_limit_overrun'; effective_message := 'Actual GPU time exceeded the enforced per-run ceiling';
  end if;

  insert into public.video_factory_generation_attempts (
    run_id, attempt_number, provider, external_request_id, state, cost_cents,
    llm_tokens, gpu_seconds, failure_fingerprint, failure_message,
    callback_received_at, completed_at
  ) values (
    p_run_id, attempt_no, run_row.selected_provider, nullif(p_external_request_id, ''), effective_state,
    p_cost_cents, p_llm_tokens, p_gpu_seconds, effective_fingerprint,
    effective_message, now(), now()
  );

  if effective_state = 'succeeded' then
    next_state := 'succeeded';
    update public.video_factory_provider_health set
      circuit_state = 'closed', consecutive_failures = 0, opened_at = null,
      retry_after = null, last_success_at = now(), updated_at = now()
    where provider = run_row.selected_provider;
  else
    -- No automatic retry until a fresh atomic attempt claim reserves its cost.
    next_state := effective_state;
  end if;

  if effective_state = 'failed' then
    update public.video_factory_provider_health set
      consecutive_failures = consecutive_failures + 1,
      circuit_state = case when consecutive_failures + 1 >= policy_row.circuit_failure_threshold then 'open' else circuit_state end,
      opened_at = case when consecutive_failures + 1 >= policy_row.circuit_failure_threshold then now() else opened_at end,
      retry_after = case when consecutive_failures + 1 >= policy_row.circuit_failure_threshold then now() + make_interval(mins => policy_row.circuit_cooldown_minutes) else retry_after end,
      last_failure_fingerprint = effective_fingerprint, updated_at = now()
    where provider = run_row.selected_provider;
  end if;

  update public.video_factory_generation_runs set
    state = next_state, attempt_count = attempt_no,
    actual_cost_cents = actual_cost_cents + p_cost_cents,
    llm_tokens_used = llm_tokens_used + p_llm_tokens,
    gpu_seconds_used = gpu_seconds_used + p_gpu_seconds,
    started_at = coalesce(started_at, now()), updated_at = now(),
    completed_at = case when next_state in ('succeeded', 'failed', 'cancelled') then now() else null end
  where id = p_run_id returning * into run_row;

  insert into public.video_factory_generation_events (run_id, event_type, actor, payload)
  values (p_run_id, 'attempt_' || effective_state, p_actor,
    jsonb_build_object('attempt_number', attempt_no, 'next_state', next_state, 'failure_fingerprint', effective_fingerprint));
  return to_jsonb(run_row);
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'video_factory_generation_policies', 'video_factory_provider_health',
    'video_factory_generation_runs', 'video_factory_generation_attempts',
    'video_factory_generation_quality_reviews', 'video_factory_generation_events'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on table public.%I from public, anon, authenticated, service_role', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_service_role_all', table_name);
    execute format('create policy %I on public.%I for all to service_role using (true) with check (true)', table_name || '_service_role_all', table_name);
  end loop;
end
$$;

grant select, update on table public.video_factory_generation_policies to service_role;
grant select on table public.video_factory_provider_health to service_role;
grant select on table public.video_factory_generation_runs to service_role;
grant select on table public.video_factory_generation_attempts to service_role;
grant select, insert on table public.video_factory_generation_quality_reviews to service_role;
grant select, insert on table public.video_factory_generation_events to service_role;

revoke all on function public.video_factory_reserve_generation_run(text,text,text,text,text,text,integer,integer,integer,text) from public, anon, authenticated;
grant execute on function public.video_factory_reserve_generation_run(text,text,text,text,text,text,integer,integer,integer,text) to service_role;
revoke all on function public.video_factory_record_generation_attempt(uuid,text,text,integer,integer,integer,text,text,text) from public, anon, authenticated;
grant execute on function public.video_factory_record_generation_attempt(uuid,text,text,integer,integer,integer,text,text,text) to service_role;

comment on table public.video_factory_generation_runs is 'Auditable cost, token, GPU-time, idempotency, and cache ledger for video generation.';
comment on table public.video_factory_generation_attempts is 'Append-only provider callback outcomes and failure fingerprints.';
comment on table public.video_factory_generation_quality_reviews is 'Append-only human quality comparison rubric for generated video.';
comment on function public.video_factory_reserve_generation_run is 'Atomic no-cost preflight enforcing budget, cache, retry, and provider circuit guards.';

commit;
