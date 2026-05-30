-- Segment-aware video strategy, loss simulator, and customer-facing claim guard.

alter table public.sales_video_jobs
  add column if not exists target_segment text not null default 'agency_white_label',
  add column if not exists offer_angle text not null default 'lost_revenue',
  add column if not exists loss_simulation jsonb not null default '{}'::jsonb,
  add column if not exists claim_guard jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sales_video_jobs_target_segment_check'
  ) then
    alter table public.sales_video_jobs
      add constraint sales_video_jobs_target_segment_check
      check (
        target_segment in (
          'agency_white_label',
          'saas_marketing',
          'ec_brand',
          'local_smb',
          'youtube_creator',
          'jaas_bundle',
          'gtm_engineering'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sales_video_jobs_offer_angle_check'
  ) then
    alter table public.sales_video_jobs
      add constraint sales_video_jobs_offer_angle_check
      check (
        offer_angle in (
          'lost_revenue',
          'competitor_momentum',
          'market_window',
          'production_cost',
          'japan_entry_gap',
          'local_trust_gap'
        )
      );
  end if;
end $$;

create index if not exists idx_sales_video_jobs_segment_status
  on public.sales_video_jobs (target_segment, status, created_at desc);

comment on column public.sales_video_jobs.target_segment is
  'Segment chosen for template selection, such as agency white label, SaaS marketing, EC brand, local SMB, JaaS, or GTM engineering.';

comment on column public.sales_video_jobs.offer_angle is
  'Primary persuasion angle selected before Dify narration generation.';

comment on column public.sales_video_jobs.loss_simulation is
  'Operator-estimate loss simulation. Customer-facing copy must label this as an estimate.';

comment on column public.sales_video_jobs.claim_guard is
  'Dify/customer copy guard. Legal, penalty, market size, CAGR, and benchmark claims require primary-source verification.';

notify pgrst, 'reload schema';
