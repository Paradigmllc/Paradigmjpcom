-- YouTube 自動運用の審査基盤
--
-- 公開前ゲートは構造とポリシー適合しか測れない。事実の正確さは人間が確認するしかないため、
-- 「レンダリング済みだが未承認」の状態を持たせ、承認されるまで公開経路に進ませない。
--
-- 設計方針:
--   - 台本とゲート結果は jsonb でそのまま保存する。審査時に何を見て判断したのかを再現できないと
--     後から問題が起きたときに検証できない。
--   - 判断の履歴を別表に残す。status の上書きだけだと誰がいつ何を理由に通したのか消える。

begin;

create extension if not exists pgcrypto;

/* ───── チャンネル ───── */

create table if not exists public.yt_channels (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  -- src/lib/youtube/formats/definitions の形式ID。DB側では列挙にしない。
  -- 形式はコード側でファイル1枚追加すれば増える設計なので、制約を張ると追随できなくなる。
  format_id text not null,
  locale text not null default 'ja',
  -- このチャンネルで何を検証するのか。形式定義の hypothesis を写す。
  hypothesis text not null,
  youtube_channel_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

/* ───── 動画 ───── */

create table if not exists public.yt_videos (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references public.yt_channels(id) on delete set null,
  format_id text not null,
  status text not null default 'review_required'
    check (status in ('draft','rendering','review_required','approved','rejected','published','failed')),

  title text not null,
  description text not null default '',
  tags text[] not null default '{}',
  thumbnail_text text[] not null default '{}',

  -- VideoScript 全文。審査画面がシーンとナレーションと出典を出すのに使う。
  script jsonb not null,
  -- PolicyGateResult。警告付きで通過したのか無傷で通過したのかを残す。
  gate jsonb not null default '{}'::jsonb,
  -- 企画の出所(IdeaCandidate)。なぜこの題材を選んだのかを審査者に見せる。
  research jsonb not null default '{}'::jsonb,

  video_url text,
  duration_sec numeric(10,2),
  llm_calls integer,
  warnings text[] not null default '{}',

  reviewer_note text,
  reviewed_by text,
  reviewed_at timestamptz,
  published_at timestamptz,
  youtube_video_id text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists yt_videos_status_created_idx
  on public.yt_videos (status, created_at desc);
create index if not exists yt_videos_channel_idx
  on public.yt_videos (channel_id, created_at desc);

/* ───── 審査履歴 ───── */

create table if not exists public.yt_review_events (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.yt_videos(id) on delete cascade,
  action text not null check (action in ('submitted','approved','rejected','published','reverted')),
  note text,
  actor text not null default 'unknown',
  created_at timestamptz not null default now()
);

create index if not exists yt_review_events_video_idx
  on public.yt_review_events (video_id, created_at desc);

/* ───── 更新時刻 ───── */

create or replace function public.yt_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists yt_channels_touch on public.yt_channels;
create trigger yt_channels_touch before update on public.yt_channels
  for each row execute function public.yt_touch_updated_at();

drop trigger if exists yt_videos_touch on public.yt_videos;
create trigger yt_videos_touch before update on public.yt_videos
  for each row execute function public.yt_touch_updated_at();

/* ───── RLS ───── */
-- 審査前の動画は未公開の制作物。service role 以外に読ませない。

alter table public.yt_channels enable row level security;
alter table public.yt_videos enable row level security;
alter table public.yt_review_events enable row level security;

drop policy if exists yt_channels_service on public.yt_channels;
create policy yt_channels_service on public.yt_channels
  for all to service_role using (true) with check (true);

drop policy if exists yt_videos_service on public.yt_videos;
create policy yt_videos_service on public.yt_videos
  for all to service_role using (true) with check (true);

drop policy if exists yt_review_events_service on public.yt_review_events;
create policy yt_review_events_service on public.yt_review_events
  for all to service_role using (true) with check (true);

commit;
