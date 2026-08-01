create or replace function public.sales_reconcile_list_lead_twenty_batch(p_rows jsonb)
returns table(company_id uuid, twenty_company_id text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) not between 1 and 60 then
    raise exception 'sales_reconcile_list_lead_twenty_batch requires 1-60 rows';
  end if;

  return query
  with input_rows as (
    select *
    from jsonb_to_recordset(p_rows) as x(
      company_id uuid,
      twenty_company_id text,
      summary text,
      source_name text,
      next_action text,
      updated_at timestamptz
    )
  ), updated as (
    update public.sales_companies as company
    set report_url = null,
        pipeline_status = 'pending',
        updated_at = coalesce(input.updated_at, now()),
        meta = coalesce(company.meta, '{}'::jsonb) || jsonb_build_object(
          'list_only', true,
          'skip_enrichment', true,
          'twenty', coalesce(company.meta->'twenty', '{}'::jsonb) || jsonb_build_object(
            'id', input.twenty_company_id,
            'summary', coalesce(input.summary, ''),
            'salesStatus', null,
            'dataStatus', '',
            'lastError', '',
            'sourceName', coalesce(input.source_name, 'codex_verification'),
            'nextAction', coalesce(input.next_action, '候補レビュー待ち（未送信）'),
            'updatedAt', coalesce(input.updated_at, now())
          )
        )
    from input_rows as input
    where company.id = input.company_id
      and company.meta->>'list_only' = 'true'
      and company.meta->>'skip_enrichment' = 'true'
    returning company.id, input.twenty_company_id
  )
  select updated.id, updated.twenty_company_id from updated;
end;
$$;

create or replace function public.sales_finalize_lead_candidate_promotions(p_run_id uuid, p_rows jsonb)
returns table(item_id uuid, review_status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) not between 1 and 60 then
    raise exception 'sales_finalize_lead_candidate_promotions requires 1-60 rows';
  end if;

  create temporary table promotion_finalization_input on commit drop as
  select *
  from jsonb_to_recordset(p_rows) as x(
    item_id uuid,
    candidate_id uuid,
    company_id uuid,
    twenty_company_id text,
    ok boolean,
    error text,
    promotion_attempts integer
  );

  update public.sales_lead_candidate_run_items as item
  set status = 'promoted',
      review_status = 'approved',
      company_id = input.company_id,
      twenty_synced = true,
      twenty_company_id = input.twenty_company_id,
      promotion_attempts = least(greatest(coalesce(input.promotion_attempts, 0), 0), 20),
      promotion_error = null,
      processed_at = now()
  from promotion_finalization_input as input
  where item.id = input.item_id
    and item.run_id = p_run_id
    and item.review_status = 'promoting'
    and input.ok = true;

  update public.sales_lead_candidate_domains as candidate
  set status = 'promoted',
      company_id = input.company_id,
      updated_at = now()
  from promotion_finalization_input as input
  where candidate.id = input.candidate_id
    and input.ok = true;

  update public.sales_lead_candidate_run_items as item
  set review_status = 'promotion_failed',
      promotion_attempts = least(greatest(coalesce(input.promotion_attempts, 0), 0), 20),
      promotion_error = left(coalesce(input.error, 'Twenty batch promotion failed'), 2000)
  from promotion_finalization_input as input
  where item.id = input.item_id
    and item.run_id = p_run_id
    and item.review_status = 'promoting'
    and input.ok = false;

  return query
  select item.id, item.review_status
  from public.sales_lead_candidate_run_items as item
  join promotion_finalization_input as input on input.item_id = item.id
  where item.run_id = p_run_id;
end;
$$;

revoke all on function public.sales_reconcile_list_lead_twenty_batch(jsonb) from public, anon, authenticated;
revoke all on function public.sales_finalize_lead_candidate_promotions(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.sales_reconcile_list_lead_twenty_batch(jsonb) to service_role;
grant execute on function public.sales_finalize_lead_candidate_promotions(uuid, jsonb) to service_role;
