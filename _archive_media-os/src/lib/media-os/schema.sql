pragma foreign_keys = on;

create table if not exists channels (
  id text primary key,
  slug text not null unique,
  name text not null,
  language text not null check (language in ('ja','en')),
  format text not null,
  status text not null check (status in ('incubating','scaling','paused')),
  created_at text not null default current_timestamp
);

create table if not exists cases (
  id text primary key,
  slug text not null unique,
  subject text not null,
  summary text not null,
  created_at text not null default current_timestamp
);

create table if not exists sources (
  id text primary key,
  case_id text not null references cases(id) on delete cascade,
  publisher text not null,
  title text not null,
  url text not null unique,
  source_type text not null,
  authority_tier integer not null check (authority_tier between 1 and 4),
  rights_note text not null,
  retrieved_at text not null
);

create table if not exists episodes (
  id text primary key,
  channel_id text not null references channels(id),
  case_id text not null references cases(id),
  title text not null,
  language text not null check (language in ('ja','en')),
  status text not null,
  risk_level text not null check (risk_level in ('low','medium','high')),
  originality_note text not null,
  created_at text not null default current_timestamp,
  updated_at text not null default current_timestamp
);

create table if not exists claims (
  id text primary key,
  episode_id text not null references episodes(id) on delete cascade,
  source_id text not null references sources(id),
  statement text not null,
  status text not null check (status in ('confirmed','alleged','disputed','hypothesis','dramatized','rejected')),
  locator text not null,
  notes text not null default '',
  created_at text not null default current_timestamp
);

create table if not exists scenes (
  id text primary key,
  episode_id text not null references episodes(id) on delete cascade,
  ordinal integer not null,
  scene_type text not null check (scene_type in ('drama','evidence_room','timeline','outro')),
  start_seconds real not null,
  duration_seconds real not null,
  narration text not null,
  claim_ids_json text not null default '[]',
  visual_brief text not null,
  unique (episode_id, ordinal)
);

create table if not exists production_jobs (
  id text primary key,
  episode_id text not null references episodes(id) on delete cascade,
  renderer text not null,
  status text not null check (status in ('queued','running','review_required','approved','failed','cancelled')),
  progress integer not null default 0 check (progress between 0 and 100),
  review_gate text not null,
  output_manifest_json text not null default '{}',
  error_message text,
  created_at text not null default current_timestamp,
  updated_at text not null default current_timestamp
);

create table if not exists production_job_metrics (
  job_id text primary key references production_jobs(id) on delete cascade,
  phase text not null default 'queued',
  detail text not null default '',
  completed_units integer,
  total_units integer,
  elapsed_seconds real,
  estimated_remaining_seconds real,
  free_disk_gib real,
  estimated_required_gib real,
  cost_usd real not null default 0,
  updated_at text not null default current_timestamp
);

create table if not exists research_artifacts (
  id text primary key,
  episode_id text not null references episodes(id) on delete cascade,
  job_id text not null references production_jobs(id) on delete cascade,
  provider text not null,
  source_url text not null,
  content_path text not null,
  content_sha256 text not null,
  claim_ids_json text not null,
  retrieved_at text not null,
  unique(job_id, source_url)
);

create table if not exists generated_visual_assets (
  id text primary key,
  episode_id text not null references episodes(id) on delete cascade,
  job_id text not null references production_jobs(id) on delete cascade,
  scene_ordinal integer not null,
  provider text not null,
  output_path text not null,
  output_sha256 text not null,
  workflow_sha256 text not null,
  prompt_sha256 text not null,
  rights_json text not null,
  provenance_json text not null,
  cost_usd real not null default 0,
  created_at text not null default current_timestamp,
  unique(job_id, id)
);

create table if not exists production_profiles (
  id text primary key,
  registry_version text not null,
  label text not null,
  output_kind text not null check (output_kind in ('image','video','composition')),
  compositing_role text not null,
  readiness text not null check (readiness in ('production','preview','blocked')),
  generator text not null,
  workflow_path text,
  workflow_path_env text,
  binding_path_env text,
  bindings_json text not null default '{}',
  visual_modes_json text not null,
  required_capabilities_json text not null,
  quality_contract_json text not null,
  updated_at text not null default current_timestamp
);

create table if not exists visual_asset_quality_reports (
  id text primary key,
  asset_id text not null,
  episode_id text not null references episodes(id) on delete cascade,
  job_id text not null references production_jobs(id) on delete cascade,
  profile_id text not null references production_profiles(id),
  status text not null check (status in ('pass','blocked')),
  score integer not null check (score between 0 and 100),
  report_json text not null,
  created_at text not null default current_timestamp,
  unique(job_id, asset_id)
);

create table if not exists episode_quality_reports (
  id text primary key,
  episode_id text not null references episodes(id) on delete cascade,
  job_id text not null references production_jobs(id) on delete cascade,
  gate_version text not null,
  status text not null check (status in ('pass','blocked')),
  score integer not null check (score between 0 and 100),
  threshold integer not null check (threshold between 0 and 100),
  nearest_peer_similarity real,
  report_json text not null,
  created_at text not null default current_timestamp
);

create table if not exists creative_pilots (
  id text primary key,
  episode_id text not null references episodes(id) on delete cascade,
  job_id text not null references production_jobs(id) on delete cascade,
  format_family text not null,
  duration_seconds real not null check (duration_seconds between 45 and 120),
  shot_count integer not null check (shot_count > 0),
  avatar_share real not null check (avatar_share between 0 and 1),
  presentation_share real not null check (presentation_share between 0 and 1),
  visual_mode_count integer not null check (visual_mode_count > 0),
  asset_request_count integer not null check (asset_request_count >= 0),
  preview_ready integer not null default 0 check (preview_ready in (0,1)),
  preview_path text,
  render_ready integer not null default 0 check (render_ready in (0,1)),
  status text not null check (status in ('pass','blocked')),
  score integer not null check (score between 0 and 100),
  manifest_path text not null,
  report_path text not null,
  created_at text not null default current_timestamp,
  unique(job_id)
);

create table if not exists distribution_assets (
  id text primary key,
  episode_id text not null references episodes(id) on delete cascade,
  parent_asset_id text references distribution_assets(id) on delete cascade,
  platform text not null check (platform in ('youtube_watch','youtube_shorts','tiktok','instagram_reels')),
  format text not null check (format in ('longform','summary','highlight','teaser')),
  aspect_ratio text not null check (aspect_ratio in ('16:9','9:16','1:1')),
  duration_seconds integer not null check (duration_seconds > 0),
  editor text not null check (editor in ('hyperframes','ffmpeg','opencut')),
  caption_mode text not null check (caption_mode in ('none','burned_in','sidecar')),
  status text not null check (status in ('planned','rendering','review_required','approved','published','blocked')),
  source_segments_json text not null default '[]',
  output_path text,
  edit_manifest_json text not null default '{}',
  created_at text not null default current_timestamp,
  updated_at text not null default current_timestamp,
  check (
    (format = 'longform' and parent_asset_id is null) or
    (format <> 'longform' and parent_asset_id is not null)
  )
);

create table if not exists audit_events (
  id integer primary key autoincrement,
  entity_type text not null,
  entity_id text not null,
  event_type text not null,
  payload_json text not null default '{}',
  created_at text not null default current_timestamp
);

create index if not exists claims_episode_status_idx on claims(episode_id, status);
create index if not exists jobs_episode_created_idx on production_jobs(episode_id, created_at desc);
create index if not exists quality_episode_created_idx on episode_quality_reports(episode_id, created_at desc);
create unique index if not exists quality_job_idx on episode_quality_reports(job_id);
create index if not exists creative_pilots_episode_created_idx on creative_pilots(episode_id, created_at desc);
create index if not exists distribution_episode_platform_idx on distribution_assets(episode_id, platform, status);
create index if not exists distribution_parent_idx on distribution_assets(parent_asset_id);
create index if not exists visual_quality_job_idx on visual_asset_quality_reports(job_id, status);
