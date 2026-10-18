from __future__ import annotations

import json
import os
from pathlib import Path
from textwrap import dedent

ROOT = Path.cwd()
LIB = Path("src/lib") if (ROOT / "src").is_dir() else Path("lib")
CORE = LIB / "media-os"
MIGRATIONS = Path("supabase/migrations")


def write_if_missing(path: Path, content: str) -> None:
    target = ROOT / path
    if target.exists():
        print(f"Preserving existing file: {path}")
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(dedent(content).lstrip(), encoding="utf-8")
    print(f"Created: {path}")


package = {}
package_path = ROOT / "package.json"
if package_path.exists():
    package = json.loads(package_path.read_text(encoding="utf-8"))
deps = {**package.get("dependencies", {}), **package.get("devDependencies", {})}
if "vitest" in deps:
    test_import = 'import { describe, expect, it } from "vitest";'
    equal = "expect(actual).toEqual(expected);"
    truthy = "expect(actual).toBe(true);"
    falsy = "expect(actual).toBe(false);"
elif "jest" in deps or "@jest/globals" in deps:
    test_import = 'import { describe, expect, it } from "@jest/globals";'
    equal = "expect(actual).toEqual(expected);"
    truthy = "expect(actual).toBe(true);"
    falsy = "expect(actual).toBe(false);"
else:
    test_import = 'import { strict as assert } from "node:assert";\nimport { describe, it } from "node:test";'
    equal = "assert.deepEqual(actual, expected);"
    truthy = "assert.equal(actual, true);"
    falsy = "assert.equal(actual, false);"

write_if_missing(
    CORE / "quality.test.ts",
    f'''
    {test_import}
    import {{ extractEvidenceMarkers, validateArtifactQuality }} from "./quality";
    import type {{ MediaOsArtifactContent, MediaOsEvidence }} from "./types";

    const evidence: MediaOsEvidence[] = [{{
      id: "EV-OFFICIAL-2026", memo_id: "memo-1", title: "Official source", source_url: "https://example.com/report",
      excerpt: "The source reports a measurable market result.", source_type: "official", published_at: "2026-07-01T00:00:00.000Z",
      retrieved_at: "2026-07-31T00:00:00.000Z", metadata: {{}}, created_at: "2026-07-31T00:00:00.000Z",
    }}];

    function content(claimIds: string[]): MediaOsArtifactContent {{
      return {{ slug: "validated-topic", title: "Validated topic", summary: "Evidence-linked summary", body: ["The market grew 12% [EV-OFFICIAL-2026]."],
        claims: [{{ text: "The market grew 12%.", evidenceIds: claimIds }}], evidence: evidence.map((item) => ({{ id: item.id, title: item.title, source_url: item.source_url, excerpt: item.excerpt }})),
        callToAction: "Review the evidence", deliveryMode: "internal-publish", metadata: {{}}, }};
    }}

    describe("Media OS quality gates", () => {{
      it("extracts stable evidence markers", () => {{ const actual = extractEvidenceMarkers("A [EV-OFFICIAL-2026] B [EV-SECOND-2]"); const expected = ["EV-OFFICIAL-2026", "EV-SECOND-2"]; {equal} }});
      it("accepts supported numeric claims", () => {{ const actual = validateArtifactQuality({{ channel: "pseo", content: content([evidence[0].id]), evidence, declarationEvidenceIds: [evidence[0].id] }}).length === 0; {truthy} }});
      it("blocks unsupported numeric claims", () => {{ const actual = validateArtifactQuality({{ channel: "pseo", content: content([]), evidence, declarationEvidenceIds: [evidence[0].id] }}).some((issue) => issue.code === "UNSUPPORTED_CLAIM"); {truthy} }});
      it("blocks unknown evidence IDs", () => {{ const actual = validateArtifactQuality({{ channel: "pseo", content: content(["EV-UNKNOWN-1"]), evidence, declarationEvidenceIds: [evidence[0].id] }}).some((issue) => issue.code === "UNKNOWN_EVIDENCE_ID"); {truthy} }});
    }});
    ''',
)

write_if_missing(
    CORE / "signatures.test.ts",
    f'''
    {test_import}
    import {{ signInstruction, verifyInstruction }} from "./signatures";

    describe("Media OS signed human instructions", () => {{
      it("accepts an unmodified, unexpired instruction", () => {{
        const signed = signInstruction({{ action: "human_publish", artifactId: "artifact-1", channel: "linkedin", revision: 2, expiresAt: new Date(Date.now() + 60_000).toISOString() }}, "test-secret");
        const actual = verifyInstruction(signed.payload, signed.signature, "test-secret"); {truthy}
      }});
      it("rejects tampering", () => {{
        const signed = signInstruction({{ action: "human_outreach", artifactId: "artifact-2", channel: "commercial", revision: 1, expiresAt: new Date(Date.now() + 60_000).toISOString() }}, "test-secret");
        const actual = verifyInstruction({{ ...signed.payload, revision: 99 }}, signed.signature, "test-secret"); {falsy}
      }});
      it("rejects expired instructions", () => {{
        const signed = signInstruction({{ action: "human_publish", artifactId: "artifact-3", channel: "x", revision: 1, expiresAt: new Date(Date.now() - 1_000).toISOString() }}, "test-secret");
        const actual = verifyInstruction(signed.payload, signed.signature, "test-secret"); {falsy}
      }});
    }});
    ''',
)

write_if_missing(
    MIGRATIONS / "202607310001_media_os_core.sql",
    r'''
    begin;

    create extension if not exists pgcrypto;

    create table if not exists public.media_os_memos (
      id uuid primary key default gen_random_uuid(),
      slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
      title text not null check (char_length(title) between 1 and 240),
      summary text not null check (char_length(summary) between 1 and 2000),
      research_body text not null default '' check (char_length(research_body) <= 80000),
      declaration_evidence_ids text[] not null default '{}',
      status text not null default 'draft' check (status in ('draft','review','approved','archived')),
      revision integer not null default 1 check (revision > 0),
      approval_stage smallint not null default 0 check (approval_stage between 0 and 2),
      stage1_approved_by text,
      stage1_approved_at timestamptz,
      stage2_approved_by text,
      stage2_approved_at timestamptz,
      approved_at timestamptz,
      created_by text not null,
      updated_by text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists public.media_os_evidence (
      id text primary key check (id ~ '^EV-[A-Z0-9][A-Z0-9-]{2,63}$'),
      memo_id uuid not null references public.media_os_memos(id) on delete cascade,
      title text not null check (char_length(title) between 1 and 300),
      source_url text not null check (source_url ~ '^https?://'),
      excerpt text not null check (char_length(excerpt) between 1 and 8000),
      source_type text not null default 'web' check (char_length(source_type) between 1 and 60),
      published_at timestamptz,
      retrieved_at timestamptz not null default now(),
      metadata jsonb not null default '{}'::jsonb,
      created_by text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create index if not exists media_os_evidence_memo_idx on public.media_os_evidence(memo_id, created_at);

    create table if not exists public.media_os_artifacts (
      id uuid primary key default gen_random_uuid(),
      memo_id uuid not null references public.media_os_memos(id) on delete cascade,
      channel text not null check (channel in ('pseo','youtube','x','linkedin','commercial')),
      source_revision integer not null check (source_revision > 0),
      revision integer not null default 1 check (revision > 0),
      state text not null default 'draft' check (state in ('draft','approved','scheduled','publishing','awaiting_human','published','stale','error')),
      approval_stage smallint not null default 0 check (approval_stage between 0 and 2),
      stage1_approved_by text,
      stage1_approved_at timestamptz,
      stage2_approved_by text,
      stage2_approved_at timestamptz,
      content jsonb not null,
      quality_issues jsonb not null default '[]'::jsonb,
      quality_error_count integer not null default 0 check (quality_error_count >= 0),
      instruction_payload jsonb,
      instruction_signature text,
      instruction_expires_at timestamptz,
      scheduled_at timestamptz,
      external_url text,
      published_at timestamptz,
      last_error text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (memo_id, channel)
    );
    create index if not exists media_os_artifacts_publish_idx on public.media_os_artifacts(channel, state, scheduled_at);

    create table if not exists public.media_os_approval_events (
      id bigint generated always as identity primary key,
      entity_type text not null check (entity_type in ('memo','artifact')),
      entity_id uuid not null,
      stage smallint not null check (stage in (1,2)),
      revision integer not null,
      actor text not null,
      created_at timestamptz not null default now()
    );

    create table if not exists public.media_os_audit_log (
      id bigint generated always as identity primary key,
      entity_type text not null,
      entity_id text not null,
      action text not null,
      actor text not null,
      before_state jsonb,
      after_state jsonb,
      created_at timestamptz not null default now()
    );
    create index if not exists media_os_audit_entity_idx on public.media_os_audit_log(entity_type, entity_id, created_at desc);

    create table if not exists public.media_os_publish_jobs (
      id uuid primary key default gen_random_uuid(),
      artifact_id uuid not null unique references public.media_os_artifacts(id) on delete cascade,
      state text not null default 'pending' check (state in ('pending','claimed','completed','failed','cancelled')),
      due_at timestamptz not null,
      claimed_by text,
      claim_token uuid,
      claimed_at timestamptz,
      completed_at timestamptz,
      attempt_count integer not null default 0 check (attempt_count >= 0),
      last_error text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create index if not exists media_os_publish_jobs_claim_idx on public.media_os_publish_jobs(state, due_at);

    create or replace function public.media_os_set_updated_at()
    returns trigger
    language plpgsql
    security definer
    set search_path = public, pg_temp
    as $$
    begin
      new.updated_at := now();
      return new;
    end;
    $$;

    create or replace function public.media_os_memo_revision_guard()
    returns trigger
    language plpgsql
    security definer
    set search_path = public, pg_temp
    as $$
    begin
      if row(new.slug, new.title, new.summary, new.research_body, new.declaration_evidence_ids)
         is distinct from row(old.slug, old.title, old.summary, old.research_body, old.declaration_evidence_ids) then
        new.revision := old.revision + 1;
        new.status := 'draft';
        new.approval_stage := 0;
        new.stage1_approved_by := null;
        new.stage1_approved_at := null;
        new.stage2_approved_by := null;
        new.stage2_approved_at := null;
        new.approved_at := null;
      elsif new.revision < old.revision then
        raise exception 'revision_regression' using errcode = 'P0001';
      end if;
      new.updated_at := now();
      return new;
    end;
    $$;

    create or replace function public.media_os_invalidate_artifacts_after_memo_change()
    returns trigger
    language plpgsql
    security definer
    set search_path = public, pg_temp
    as $$
    begin
      if new.revision <> old.revision then
        update public.media_os_artifacts
           set state = 'stale', approval_stage = 0, stage1_approved_by = null, stage1_approved_at = null,
               stage2_approved_by = null, stage2_approved_at = null, scheduled_at = null,
               last_error = 'Source memo changed; regenerate from the approved revision.', updated_at = now()
         where memo_id = new.id and state <> 'stale';
        update public.media_os_publish_jobs j
           set state = 'cancelled', updated_at = now(), last_error = 'Source memo revision changed.'
          from public.media_os_artifacts a
         where j.artifact_id = a.id and a.memo_id = new.id and j.state in ('pending','claimed','failed');
      end if;
      return new;
    end;
    $$;

    create or replace function public.media_os_touch_memo_from_evidence()
    returns trigger
    language plpgsql
    security definer
    set search_path = public, pg_temp
    as $$
    declare
      v_memo_id uuid;
      v_actor text;
    begin
      if tg_op = 'UPDATE' and new.memo_id <> old.memo_id then
        raise exception 'evidence_memo_is_immutable' using errcode = 'P0001';
      end if;
      v_memo_id := case when tg_op = 'DELETE' then old.memo_id else new.memo_id end;
      v_actor := case when tg_op = 'DELETE' then old.created_by else new.created_by end;
      update public.media_os_memos
         set revision = revision + 1, status = 'draft', approval_stage = 0,
             stage1_approved_by = null, stage1_approved_at = null, stage2_approved_by = null,
             stage2_approved_at = null, approved_at = null, updated_by = coalesce(v_actor, 'system'), updated_at = now()
       where id = v_memo_id;
      return case when tg_op = 'DELETE' then old else new end;
    end;
    $$;

    create or replace function public.media_os_artifact_revision_guard()
    returns trigger
    language plpgsql
    security definer
    set search_path = public, pg_temp
    as $$
    begin
      if row(new.source_revision, new.content, new.quality_issues, new.quality_error_count, new.instruction_payload, new.instruction_signature, new.instruction_expires_at)
         is distinct from row(old.source_revision, old.content, old.quality_issues, old.quality_error_count, old.instruction_payload, old.instruction_signature, old.instruction_expires_at) then
        new.revision := old.revision + 1;
        new.state := 'draft';
        new.approval_stage := 0;
        new.stage1_approved_by := null;
        new.stage1_approved_at := null;
        new.stage2_approved_by := null;
        new.stage2_approved_at := null;
        new.scheduled_at := null;
        new.external_url := null;
        new.published_at := null;
        new.last_error := null;
      elsif new.revision < old.revision then
        raise exception 'revision_regression' using errcode = 'P0001';
      end if;
      new.updated_at := now();
      return new;
    end;
    $$;

    create or replace function public.media_os_prevent_audit_mutation()
    returns trigger
    language plpgsql
    security definer
    set search_path = public, pg_temp
    as $$
    begin
      raise exception 'audit_log_is_immutable' using errcode = 'P0001';
    end;
    $$;

    drop trigger if exists media_os_memo_revision_guard on public.media_os_memos;
    create trigger media_os_memo_revision_guard before update on public.media_os_memos for each row execute function public.media_os_memo_revision_guard();
    drop trigger if exists media_os_memo_invalidate_artifacts on public.media_os_memos;
    create trigger media_os_memo_invalidate_artifacts after update on public.media_os_memos for each row execute function public.media_os_invalidate_artifacts_after_memo_change();
    drop trigger if exists media_os_evidence_updated_at on public.media_os_evidence;
    create trigger media_os_evidence_updated_at before update on public.media_os_evidence for each row execute function public.media_os_set_updated_at();
    drop trigger if exists media_os_evidence_touch_memo on public.media_os_evidence;
    create trigger media_os_evidence_touch_memo after insert or update or delete on public.media_os_evidence for each row execute function public.media_os_touch_memo_from_evidence();
    drop trigger if exists media_os_artifact_revision_guard on public.media_os_artifacts;
    create trigger media_os_artifact_revision_guard before update on public.media_os_artifacts for each row execute function public.media_os_artifact_revision_guard();
    drop trigger if exists media_os_publish_jobs_updated_at on public.media_os_publish_jobs;
    create trigger media_os_publish_jobs_updated_at before update on public.media_os_publish_jobs for each row execute function public.media_os_set_updated_at();
    drop trigger if exists media_os_audit_immutable on public.media_os_audit_log;
    create trigger media_os_audit_immutable before update or delete on public.media_os_audit_log for each row execute function public.media_os_prevent_audit_mutation();

    create or replace function public.media_os_approve_memo(p_memo_id uuid, p_expected_revision integer, p_stage integer, p_actor text)
    returns public.media_os_memos
    language plpgsql
    security definer
    set search_path = public, pg_temp
    as $$
    declare v_memo public.media_os_memos;
    begin
      select * into v_memo from public.media_os_memos where id = p_memo_id for update;
      if not found then raise exception 'memo_not_found' using errcode = 'P0001'; end if;
      if v_memo.revision <> p_expected_revision then raise exception 'stale_revision' using errcode = 'P0001'; end if;
      if p_stage = 1 then
        if v_memo.approval_stage >= 1 then
          if v_memo.stage1_approved_by = p_actor then return v_memo; end if;
          raise exception 'approval_stage_already_completed' using errcode = 'P0001';
        end if;
        update public.media_os_memos set status = 'review', approval_stage = 1, stage1_approved_by = p_actor, stage1_approved_at = now(), updated_by = p_actor where id = p_memo_id returning * into v_memo;
      elsif p_stage = 2 then
        if v_memo.approval_stage < 1 then raise exception 'stage_one_approval_required' using errcode = 'P0001'; end if;
        if v_memo.stage1_approved_by = p_actor then raise exception 'two_distinct_approvers_required' using errcode = 'P0001'; end if;
        if v_memo.approval_stage = 2 then return v_memo; end if;
        update public.media_os_memos set status = 'approved', approval_stage = 2, stage2_approved_by = p_actor, stage2_approved_at = now(), approved_at = now(), updated_by = p_actor where id = p_memo_id returning * into v_memo;
      else raise exception 'invalid_approval_stage' using errcode = 'P0001';
      end if;
      insert into public.media_os_approval_events(entity_type, entity_id, stage, revision, actor) values ('memo', p_memo_id, p_stage, v_memo.revision, p_actor);
      insert into public.media_os_audit_log(entity_type, entity_id, action, actor, after_state) values ('memo', p_memo_id::text, 'approval_stage_' || p_stage::text, p_actor, to_jsonb(v_memo));
      return v_memo;
    end;
    $$;

    create or replace function public.media_os_generation_snapshot(p_memo_id uuid, p_expected_revision integer)
    returns jsonb
    language plpgsql
    security definer
    set search_path = public, pg_temp
    as $$
    declare v_memo public.media_os_memos; v_evidence jsonb;
    begin
      select * into v_memo from public.media_os_memos where id = p_memo_id for update;
      if not found then raise exception 'memo_not_found' using errcode = 'P0001'; end if;
      if v_memo.revision <> p_expected_revision then raise exception 'stale_revision' using errcode = 'P0001'; end if;
      if v_memo.status <> 'approved' or v_memo.approval_stage <> 2 or v_memo.approved_at is null then raise exception 'memo_not_fully_approved' using errcode = 'P0001'; end if;
      select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at), '[]'::jsonb) into v_evidence from public.media_os_evidence e where e.memo_id = p_memo_id;
      if jsonb_array_length(v_evidence) = 0 then raise exception 'evidence_required' using errcode = 'P0001'; end if;
      if exists (select 1 from unnest(v_memo.declaration_evidence_ids) declared where not exists (select 1 from public.media_os_evidence e where e.memo_id = p_memo_id and e.id = declared)) then raise exception 'declaration_evidence_mismatch' using errcode = 'P0001'; end if;
      return jsonb_build_object('memo', to_jsonb(v_memo), 'evidence', v_evidence);
    end;
    $$;

    create or replace function public.media_os_store_artifacts(p_memo_id uuid, p_expected_revision integer, p_actor text, p_artifacts jsonb)
    returns jsonb
    language plpgsql
    security definer
    set search_path = public, pg_temp
    as $$
    declare v_memo public.media_os_memos; v_item jsonb; v_channel text; v_result jsonb; v_count integer;
    begin
      select * into v_memo from public.media_os_memos where id = p_memo_id for update;
      if not found then raise exception 'memo_not_found' using errcode = 'P0001'; end if;
      if v_memo.revision <> p_expected_revision then raise exception 'stale_revision' using errcode = 'P0001'; end if;
      if v_memo.status <> 'approved' or v_memo.approval_stage <> 2 then raise exception 'memo_not_fully_approved' using errcode = 'P0001'; end if;
      if jsonb_typeof(p_artifacts) <> 'array' or jsonb_array_length(p_artifacts) <> 5 then raise exception 'five_channel_artifacts_required' using errcode = 'P0001'; end if;
      select count(distinct item->>'channel') into v_count from jsonb_array_elements(p_artifacts) item where item->>'channel' in ('pseo','youtube','x','linkedin','commercial');
      if v_count <> 5 then raise exception 'invalid_channel_set' using errcode = 'P0001'; end if;
      for v_item in select value from jsonb_array_elements(p_artifacts) loop
        v_channel := v_item->>'channel';
        if coalesce((v_item->>'quality_error_count')::integer, 0) <> 0 then raise exception 'quality_gate_failed' using errcode = 'P0001'; end if;
        insert into public.media_os_artifacts(memo_id, channel, source_revision, content, quality_issues, quality_error_count, instruction_payload, instruction_signature, instruction_expires_at)
        values (p_memo_id, v_channel, p_expected_revision, v_item->'content', coalesce(v_item->'quality_issues','[]'::jsonb), coalesce((v_item->>'quality_error_count')::integer,0), nullif(v_item->'instruction_payload','null'::jsonb), nullif(v_item->>'instruction_signature',''), nullif(v_item->>'instruction_expires_at','')::timestamptz)
        on conflict (memo_id, channel) do update set source_revision = excluded.source_revision, content = excluded.content, quality_issues = excluded.quality_issues, quality_error_count = excluded.quality_error_count, instruction_payload = excluded.instruction_payload, instruction_signature = excluded.instruction_signature, instruction_expires_at = excluded.instruction_expires_at, updated_at = now();
      end loop;
      select coalesce(jsonb_agg(to_jsonb(a) order by a.channel), '[]'::jsonb) into v_result from public.media_os_artifacts a where a.memo_id = p_memo_id;
      insert into public.media_os_audit_log(entity_type, entity_id, action, actor, after_state) values ('memo', p_memo_id::text, 'artifacts_generated', p_actor, jsonb_build_object('source_revision',p_expected_revision,'channels',5));
      return v_result;
    end;
    $$;

    create or replace function public.media_os_approve_artifact(p_artifact_id uuid, p_expected_revision integer, p_stage integer, p_actor text)
    returns public.media_os_artifacts
    language plpgsql
    security definer
    set search_path = public, pg_temp
    as $$
    declare v_artifact public.media_os_artifacts; v_memo public.media_os_memos;
    begin
      select * into v_artifact from public.media_os_artifacts where id = p_artifact_id for update;
      if not found then raise exception 'artifact_not_found' using errcode = 'P0001'; end if;
      if v_artifact.revision <> p_expected_revision then raise exception 'stale_revision' using errcode = 'P0001'; end if;
      select * into v_memo from public.media_os_memos where id = v_artifact.memo_id for update;
      if v_memo.status <> 'approved' or v_memo.approval_stage <> 2 or v_artifact.source_revision <> v_memo.revision then raise exception 'artifact_source_is_stale' using errcode = 'P0001'; end if;
      if v_artifact.quality_error_count <> 0 then raise exception 'quality_gate_failed' using errcode = 'P0001'; end if;
      if p_stage = 1 then
        if v_artifact.approval_stage >= 1 then
          if v_artifact.stage1_approved_by = p_actor then return v_artifact; end if;
          raise exception 'approval_stage_already_completed' using errcode = 'P0001';
        end if;
        update public.media_os_artifacts set approval_stage = 1, stage1_approved_by = p_actor, stage1_approved_at = now() where id = p_artifact_id returning * into v_artifact;
      elsif p_stage = 2 then
        if v_artifact.approval_stage < 1 then raise exception 'stage_one_approval_required' using errcode = 'P0001'; end if;
        if v_artifact.stage1_approved_by = p_actor then raise exception 'two_distinct_approvers_required' using errcode = 'P0001'; end if;
        if v_artifact.approval_stage = 2 then return v_artifact; end if;
        update public.media_os_artifacts set state = 'approved', approval_stage = 2, stage2_approved_by = p_actor, stage2_approved_at = now() where id = p_artifact_id returning * into v_artifact;
      else raise exception 'invalid_approval_stage' using errcode = 'P0001';
      end if;
      insert into public.media_os_approval_events(entity_type, entity_id, stage, revision, actor) values ('artifact', p_artifact_id, p_stage, v_artifact.revision, p_actor);
      insert into public.media_os_audit_log(entity_type, entity_id, action, actor, after_state) values ('artifact', p_artifact_id::text, 'approval_stage_' || p_stage::text, p_actor, to_jsonb(v_artifact));
      return v_artifact;
    end;
    $$;

    create or replace function public.media_os_schedule_artifact(p_artifact_id uuid, p_expected_revision integer, p_scheduled_at timestamptz, p_actor text)
    returns public.media_os_artifacts
    language plpgsql
    security definer
    set search_path = public, pg_temp
    as $$
    declare v_artifact public.media_os_artifacts; v_memo public.media_os_memos;
    begin
      select * into v_artifact from public.media_os_artifacts where id = p_artifact_id for update;
      if not found then raise exception 'artifact_not_found' using errcode = 'P0001'; end if;
      if v_artifact.revision <> p_expected_revision then raise exception 'stale_revision' using errcode = 'P0001'; end if;
      select * into v_memo from public.media_os_memos where id = v_artifact.memo_id for update;
      if v_artifact.approval_stage <> 2 or v_artifact.quality_error_count <> 0 or v_memo.status <> 'approved' or v_artifact.source_revision <> v_memo.revision then raise exception 'artifact_not_publishable' using errcode = 'P0001'; end if;
      update public.media_os_artifacts set state = 'scheduled', scheduled_at = p_scheduled_at, last_error = null where id = p_artifact_id returning * into v_artifact;
      if v_artifact.channel = 'pseo' then
        insert into public.media_os_publish_jobs(artifact_id, state, due_at) values (p_artifact_id, 'pending', p_scheduled_at)
        on conflict (artifact_id) do update set state = 'pending', due_at = excluded.due_at, claimed_by = null, claim_token = null, claimed_at = null, completed_at = null, last_error = null, updated_at = now();
      end if;
      insert into public.media_os_audit_log(entity_type, entity_id, action, actor, after_state) values ('artifact', p_artifact_id::text, 'scheduled', p_actor, jsonb_build_object('scheduled_at',p_scheduled_at,'human_controlled',v_artifact.channel <> 'pseo'));
      return v_artifact;
    end;
    $$;

    create or replace function public.media_os_retry_artifact(p_artifact_id uuid, p_expected_revision integer, p_actor text)
    returns public.media_os_artifacts
    language plpgsql
    security definer
    set search_path = public, pg_temp
    as $$
    declare v_artifact public.media_os_artifacts;
    begin
      select * into v_artifact from public.media_os_artifacts where id = p_artifact_id for update;
      if not found then raise exception 'artifact_not_found' using errcode = 'P0001'; end if;
      if v_artifact.revision <> p_expected_revision then raise exception 'stale_revision' using errcode = 'P0001'; end if;
      if v_artifact.state <> 'error' or v_artifact.approval_stage <> 2 then raise exception 'artifact_not_retryable' using errcode = 'P0001'; end if;
      update public.media_os_artifacts set state = case when channel = 'pseo' then 'scheduled' else 'awaiting_human' end, scheduled_at = coalesce(scheduled_at, now()), last_error = null where id = p_artifact_id returning * into v_artifact;
      if v_artifact.channel = 'pseo' then
        insert into public.media_os_publish_jobs(artifact_id, state, due_at) values (p_artifact_id, 'pending', coalesce(v_artifact.scheduled_at,now()))
        on conflict (artifact_id) do update set state = 'pending', due_at = excluded.due_at, claimed_by = null, claim_token = null, claimed_at = null, last_error = null, updated_at = now();
      end if;
      insert into public.media_os_audit_log(entity_type, entity_id, action, actor, after_state) values ('artifact', p_artifact_id::text, 'retry_requested', p_actor, to_jsonb(v_artifact));
      return v_artifact;
    end;
    $$;

    create or replace function public.media_os_confirm_external_publication(p_artifact_id uuid, p_expected_revision integer, p_external_url text, p_actor text)
    returns public.media_os_artifacts
    language plpgsql
    security definer
    set search_path = public, pg_temp
    as $$
    declare v_artifact public.media_os_artifacts;
    begin
      select * into v_artifact from public.media_os_artifacts where id = p_artifact_id for update;
      if not found then raise exception 'artifact_not_found' using errcode = 'P0001'; end if;
      if v_artifact.revision <> p_expected_revision then raise exception 'stale_revision' using errcode = 'P0001'; end if;
      if v_artifact.channel = 'pseo' then raise exception 'pseo_uses_internal_publisher' using errcode = 'P0001'; end if;
      if v_artifact.approval_stage <> 2 or v_artifact.state not in ('approved','scheduled','awaiting_human') then raise exception 'artifact_not_publishable' using errcode = 'P0001'; end if;
      update public.media_os_artifacts set state = 'published', external_url = p_external_url, published_at = now(), last_error = null where id = p_artifact_id returning * into v_artifact;
      insert into public.media_os_audit_log(entity_type, entity_id, action, actor, after_state) values ('artifact', p_artifact_id::text, 'external_publication_confirmed', p_actor, jsonb_build_object('external_url',p_external_url,'human_controlled',true));
      return v_artifact;
    end;
    $$;

    create or replace function public.media_os_claim_publish_job(p_worker_id text)
    returns jsonb
    language plpgsql
    security definer
    set search_path = public, pg_temp
    as $$
    declare v_job public.media_os_publish_jobs; v_artifact public.media_os_artifacts; v_token uuid;
    begin
      select j.* into v_job
        from public.media_os_publish_jobs j
        join public.media_os_artifacts a on a.id = j.artifact_id
        join public.media_os_memos m on m.id = a.memo_id
       where j.state = 'pending' and j.due_at <= now() and a.channel = 'pseo' and a.state = 'scheduled'
         and a.approval_stage = 2 and a.quality_error_count = 0 and a.source_revision = m.revision and m.status = 'approved'
       order by j.due_at, j.created_at for update of j skip locked limit 1;
      if not found then return null; end if;
      v_token := gen_random_uuid();
      update public.media_os_publish_jobs set state = 'claimed', claimed_by = p_worker_id, claim_token = v_token, claimed_at = now(), attempt_count = attempt_count + 1, updated_at = now() where id = v_job.id returning * into v_job;
      update public.media_os_artifacts set state = 'publishing', last_error = null where id = v_job.artifact_id returning * into v_artifact;
      return jsonb_build_object('id',v_job.id,'claim_token',v_token,'artifact',to_jsonb(v_artifact));
    end;
    $$;

    create or replace function public.media_os_complete_publish_job(p_job_id uuid, p_claim_token text, p_actor text)
    returns jsonb
    language plpgsql
    security definer
    set search_path = public, pg_temp
    as $$
    declare v_job public.media_os_publish_jobs; v_artifact public.media_os_artifacts;
    begin
      select * into v_job from public.media_os_publish_jobs where id = p_job_id for update;
      if not found or v_job.state <> 'claimed' or v_job.claim_token::text <> p_claim_token then raise exception 'invalid_publish_claim' using errcode = 'P0001'; end if;
      update public.media_os_artifacts set state = 'published', published_at = now(), last_error = null where id = v_job.artifact_id and channel = 'pseo' returning * into v_artifact;
      if not found then raise exception 'pseo_artifact_not_found' using errcode = 'P0001'; end if;
      update public.media_os_publish_jobs set state = 'completed', completed_at = now(), claim_token = null, updated_at = now() where id = p_job_id;
      insert into public.media_os_audit_log(entity_type, entity_id, action, actor, after_state) values ('artifact', v_artifact.id::text, 'pseo_published', p_actor, to_jsonb(v_artifact));
      return to_jsonb(v_artifact);
    end;
    $$;

    create or replace function public.media_os_fail_publish_job(p_job_id uuid, p_claim_token text, p_error text)
    returns void
    language plpgsql
    security definer
    set search_path = public, pg_temp
    as $$
    declare v_job public.media_os_publish_jobs;
    begin
      select * into v_job from public.media_os_publish_jobs where id = p_job_id for update;
      if not found or v_job.state <> 'claimed' or v_job.claim_token::text <> p_claim_token then raise exception 'invalid_publish_claim' using errcode = 'P0001'; end if;
      update public.media_os_publish_jobs set state = 'failed', last_error = left(p_error,2000), claim_token = null, updated_at = now() where id = p_job_id;
      update public.media_os_artifacts set state = 'error', last_error = left(p_error,2000) where id = v_job.artifact_id;
    end;
    $$;

    create or replace function public.media_os_public_insights()
    returns table(slug text, title text, summary text, published_at timestamptz)
    language sql
    stable
    security definer
    set search_path = public, pg_temp
    as $$
      select a.content->>'slug', a.content->>'title', a.content->>'summary', a.published_at
        from public.media_os_artifacts a
       where a.channel = 'pseo' and a.state = 'published' and a.published_at is not null
       order by a.published_at desc limit 100;
    $$;

    create or replace function public.media_os_public_insight(p_slug text)
    returns jsonb
    language sql
    stable
    security definer
    set search_path = public, pg_temp
    as $$
      select to_jsonb(a) from public.media_os_artifacts a
       where a.channel = 'pseo' and a.state = 'published' and a.content->>'slug' = p_slug
       order by a.published_at desc limit 1;
    $$;

    create or replace function public.media_os_health()
    returns jsonb
    language sql
    stable
    security definer
    set search_path = public, pg_temp
    as $$
      select jsonb_build_object('schema_version',1,'memos',(select count(*) from public.media_os_memos),'artifacts',(select count(*) from public.media_os_artifacts),'pending_jobs',(select count(*) from public.media_os_publish_jobs where state='pending'),'checked_at',now());
    $$;

    alter table public.media_os_memos enable row level security;
    alter table public.media_os_evidence enable row level security;
    alter table public.media_os_artifacts enable row level security;
    alter table public.media_os_approval_events enable row level security;
    alter table public.media_os_audit_log enable row level security;
    alter table public.media_os_publish_jobs enable row level security;

    revoke all on table public.media_os_memos, public.media_os_evidence, public.media_os_artifacts, public.media_os_approval_events, public.media_os_audit_log, public.media_os_publish_jobs from public, anon, authenticated;
    grant all on table public.media_os_memos, public.media_os_evidence, public.media_os_artifacts, public.media_os_approval_events, public.media_os_audit_log, public.media_os_publish_jobs to service_role;
    grant usage, select on all sequences in schema public to service_role;

    revoke all on function public.media_os_approve_memo(uuid,integer,integer,text), public.media_os_generation_snapshot(uuid,integer), public.media_os_store_artifacts(uuid,integer,text,jsonb), public.media_os_approve_artifact(uuid,integer,integer,text), public.media_os_schedule_artifact(uuid,integer,timestamptz,text), public.media_os_retry_artifact(uuid,integer,text), public.media_os_confirm_external_publication(uuid,integer,text,text), public.media_os_claim_publish_job(text), public.media_os_complete_publish_job(uuid,text,text), public.media_os_fail_publish_job(uuid,text,text), public.media_os_public_insights(), public.media_os_public_insight(text), public.media_os_health() from public, anon, authenticated;
    grant execute on function public.media_os_approve_memo(uuid,integer,integer,text), public.media_os_generation_snapshot(uuid,integer), public.media_os_store_artifacts(uuid,integer,text,jsonb), public.media_os_approve_artifact(uuid,integer,integer,text), public.media_os_schedule_artifact(uuid,integer,timestamptz,text), public.media_os_retry_artifact(uuid,integer,text), public.media_os_confirm_external_publication(uuid,integer,text,text), public.media_os_claim_publish_job(text), public.media_os_complete_publish_job(uuid,text,text), public.media_os_fail_publish_job(uuid,text,text), public.media_os_public_insights(), public.media_os_public_insight(text), public.media_os_health() to service_role;

    commit;
    ''',
)

write_if_missing(
    MIGRATIONS / "202607310002_media_os_leads_analytics.sql",
    r'''
    begin;

    create table if not exists public.media_os_leads (
      id uuid primary key default gen_random_uuid(),
      insight_slug text not null check (insight_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
      email text not null check (char_length(email) between 3 and 254),
      name text,
      company text,
      website text,
      message text,
      consent boolean not null check (consent is true),
      consented_at timestamptz not null default now(),
      ip_hash text not null check (char_length(ip_hash) = 64),
      user_agent_hash text not null check (char_length(user_agent_hash) = 64),
      created_at timestamptz not null default now()
    );
    create index if not exists media_os_leads_rate_idx on public.media_os_leads(ip_hash, created_at desc);
    create index if not exists media_os_leads_created_idx on public.media_os_leads(created_at desc);

    create table if not exists public.media_os_analytics_events (
      id bigint generated always as identity primary key,
      insight_slug text not null,
      event_name text not null check (event_name in ('page_view','lead_open','lead_submit')),
      session_hash text not null check (char_length(session_hash) = 64),
      ip_hash text not null check (char_length(ip_hash) = 64),
      created_at timestamptz not null default now()
    );
    create index if not exists media_os_analytics_summary_idx on public.media_os_analytics_events(insight_slug, event_name, created_at desc);
    create index if not exists media_os_analytics_rate_idx on public.media_os_analytics_events(session_hash, created_at desc);

    create or replace function public.media_os_accept_lead(p_insight_slug text, p_email text, p_name text, p_company text, p_website text, p_message text, p_consent boolean, p_ip_hash text, p_user_agent_hash text)
    returns jsonb
    language plpgsql
    security definer
    set search_path = public, pg_temp
    as $$
    declare v_id uuid; v_recent integer;
    begin
      if p_consent is distinct from true then raise exception 'consent_required' using errcode = 'P0001'; end if;
      if p_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'invalid_email' using errcode = 'P0001'; end if;
      perform pg_advisory_xact_lock(hashtextextended(p_ip_hash, 73031));
      select count(*) into v_recent from public.media_os_leads where ip_hash = p_ip_hash and created_at > now() - interval '1 hour';
      if v_recent >= 5 then raise exception 'rate_limited' using errcode = 'P0001'; end if;
      insert into public.media_os_leads(insight_slug,email,name,company,website,message,consent,consented_at,ip_hash,user_agent_hash)
      values (p_insight_slug,lower(p_email),nullif(p_name,''),nullif(p_company,''),nullif(p_website,''),nullif(p_message,''),true,now(),p_ip_hash,p_user_agent_hash)
      returning id into v_id;
      insert into public.media_os_analytics_events(insight_slug,event_name,session_hash,ip_hash) values (p_insight_slug,'lead_submit',p_user_agent_hash,p_ip_hash);
      return jsonb_build_object('id',v_id);
    end;
    $$;

    create or replace function public.media_os_record_analytics(p_insight_slug text, p_event_name text, p_session_hash text, p_ip_hash text)
    returns void
    language plpgsql
    security definer
    set search_path = public, pg_temp
    as $$
    declare v_recent integer;
    begin
      if p_event_name not in ('page_view','lead_open','lead_submit') then raise exception 'invalid_analytics_event' using errcode = 'P0001'; end if;
      perform pg_advisory_xact_lock(hashtextextended(p_session_hash, 73032));
      select count(*) into v_recent from public.media_os_analytics_events where session_hash = p_session_hash and created_at > now() - interval '1 hour';
      if v_recent < 120 then insert into public.media_os_analytics_events(insight_slug,event_name,session_hash,ip_hash) values (p_insight_slug,p_event_name,p_session_hash,p_ip_hash); end if;
    end;
    $$;

    create or replace function public.media_os_analytics_summary()
    returns table(insight_slug text, event_name text, count bigint)
    language sql
    stable
    security definer
    set search_path = public, pg_temp
    as $$
      select e.insight_slug, e.event_name, count(*) from public.media_os_analytics_events e where e.created_at > now() - interval '90 days' group by e.insight_slug, e.event_name order by e.insight_slug, e.event_name;
    $$;

    alter table public.media_os_leads enable row level security;
    alter table public.media_os_analytics_events enable row level security;
    revoke all on table public.media_os_leads, public.media_os_analytics_events from public, anon, authenticated;
    grant all on table public.media_os_leads, public.media_os_analytics_events to service_role;
    grant usage, select on all sequences in schema public to service_role;
    revoke all on function public.media_os_accept_lead(text,text,text,text,text,text,boolean,text,text), public.media_os_record_analytics(text,text,text,text), public.media_os_analytics_summary() from public, anon, authenticated;
    grant execute on function public.media_os_accept_lead(text,text,text,text,text,text,boolean,text,text), public.media_os_record_analytics(text,text,text,text), public.media_os_analytics_summary() to service_role;

    commit;
    ''',
)

write_if_missing(
    Path("docs/media-os.md"),
    r'''
    # Japan Market Entry Media OS

    The Media OS turns one evidence-linked research memo into five controlled outputs: pSEO, YouTube, X, LinkedIn, and a commercial brief. The pSEO artifact can be published by the internal worker only after two-stage approval. External channels produce expiring HMAC-signed instructions and always require a human to publish or contact a lead.

    ## Required server environment

    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY`
    - `MEDIA_OS_SIGNING_SECRET`
    - `MEDIA_OS_IP_HASH_SECRET`
    - `MEDIA_OS_PUBLISHER_TOKEN`
    - `MEDIA_OS_ADMIN_EMAILS` or an authenticated user metadata role of `admin`, `owner`, `staff`, `editor`, or `internal`
    - Optional Turnstile pair: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`

    Apply both `202607310001_media_os_core.sql` and `202607310002_media_os_leads_analytics.sql` before enabling the publisher. Run the publisher endpoint with an authenticated scheduler and the publisher bearer token. Never expose the service role, signing secret, hash secret, or publisher token to browser code.

    ## Safety invariants

    Memo and evidence edits advance the memo revision and invalidate every approval, generated artifact, and queued publication. Generation locks the approved memo revision, stores all five artifacts atomically, and rejects unsupported claims or unknown evidence IDs. Artifact changes also invalidate approvals. Two distinct actors are required for the two approval stages. Publish jobs use `FOR UPDATE SKIP LOCKED`; lead limits use transaction advisory locks. Audit rows are append-only. Public forms require consent, include a honeypot, optionally verify Turnstile, validate public URLs, and store only keyed hashes of network identifiers.
    ''',
)
