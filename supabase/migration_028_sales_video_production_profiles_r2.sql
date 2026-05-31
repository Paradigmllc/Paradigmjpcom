-- Professional video production profiles and Cloudflare R2 asset manifests.

alter table public.sales_video_jobs
  add column if not exists production_genre text not null default 'executive_diagnostic',
  add column if not exists voice_style text not null default 'calm_consultant',
  add column if not exists avatar_style text not null default 'none',
  add column if not exists caption_style text not null default 'clean_lower_third',
  add column if not exists story_framework text not null default 'problem_agitate_solve',
  add column if not exists quality_tier text not null default 'professional',
  add column if not exists r2_bucket text,
  add column if not exists r2_asset_prefix text,
  add column if not exists asset_manifest jsonb not null default '{}'::jsonb,
  add column if not exists delivery_formats jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sales_video_jobs_production_genre_check') then
    alter table public.sales_video_jobs
      add constraint sales_video_jobs_production_genre_check
      check (production_genre in (
        'executive_diagnostic',
        'product_demo',
        'case_study',
        'ugc_ad',
        'shorts_reel',
        'webinar_cutdown',
        'explainer_animation',
        'avatar_pitch',
        'testimonial_style',
        'local_service_ad',
        'japan_entry_pitch',
        'subscription_series'
      ));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sales_video_jobs_voice_style_check') then
    alter table public.sales_video_jobs
      add constraint sales_video_jobs_voice_style_check
      check (voice_style in (
        'calm_consultant',
        'energetic_founder',
        'premium_narrator',
        'friendly_local',
        'bilingual_ja_en',
        'no_voice_music_caption'
      ));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sales_video_jobs_avatar_style_check') then
    alter table public.sales_video_jobs
      add constraint sales_video_jobs_avatar_style_check
      check (avatar_style in (
        'none',
        'subtle_presenter',
        'executive_advisor',
        'founder_operator',
        'studio_avatar',
        'brand_character'
      ));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sales_video_jobs_caption_style_check') then
    alter table public.sales_video_jobs
      add constraint sales_video_jobs_caption_style_check
      check (caption_style in (
        'burned_in_bilingual',
        'clean_lower_third',
        'karaoke_highlight',
        'srt_vtt_only',
        'social_safe_area'
      ));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sales_video_jobs_story_framework_check') then
    alter table public.sales_video_jobs
      add constraint sales_video_jobs_story_framework_check
      check (story_framework in (
        'problem_agitate_solve',
        'before_after_bridge',
        'aida',
        'case_study_arc',
        'myth_truth_proof',
        'three_act_demo'
      ));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sales_video_jobs_quality_tier_check') then
    alter table public.sales_video_jobs
      add constraint sales_video_jobs_quality_tier_check
      check (quality_tier in ('draft', 'professional', 'premium'));
  end if;
end $$;

create index if not exists idx_sales_video_jobs_production_profile
  on public.sales_video_jobs (production_genre, quality_tier, status, created_at desc);

create index if not exists idx_sales_video_jobs_r2_prefix
  on public.sales_video_jobs (r2_asset_prefix)
  where r2_asset_prefix is not null;

comment on column public.sales_video_jobs.production_genre is
  'Professional video genre used by Dify, n8n, HyperFrames, Remotion, OpenMontage, ComfyUI, and delivery QA.';

comment on column public.sales_video_jobs.voice_style is
  'Voice direction for OSS TTS, narration, or no-voice caption-only delivery.';

comment on column public.sales_video_jobs.avatar_style is
  'Avatar/presenter direction. Heavy avatar generation can be routed through ComfyUI or an external renderer.';

comment on column public.sales_video_jobs.caption_style is
  'Subtitle style and delivery mode, including burned-in bilingual captions or SRT/VTT-only.';

comment on column public.sales_video_jobs.story_framework is
  'Narrative framework used to keep mass-produced videos varied and strategy-led.';

comment on column public.sales_video_jobs.asset_manifest is
  'Cloudflare R2 manifest listing required outputs: master, proxy, subtitles, thumbnail, transcript, source manifest, and metadata.';

comment on column public.sales_video_jobs.delivery_formats is
  'Platform-specific render formats generated or expected for the job.';

notify pgrst, 'reload schema';
