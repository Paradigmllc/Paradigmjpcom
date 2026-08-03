from __future__ import annotations

import os
import re
from pathlib import Path
from textwrap import dedent

ROOT = Path.cwd()
APP = Path("src/app") if (ROOT / "src/app").is_dir() else Path("app")
LIB = Path("src/lib") if (ROOT / "src").is_dir() else Path("lib")
CORE = LIB / "media-os"


def write_if_missing(path: Path, content: str) -> None:
    target = ROOT / path
    if target.exists():
        print(f"Preserving existing file: {path}")
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(dedent(content).lstrip(), encoding="utf-8")
    print(f"Created: {path}")


def rel_import(source: Path, target: Path) -> str:
    relative = os.path.relpath(target, source.parent).replace(os.sep, "/")
    if not relative.startswith("."):
        relative = "./" + relative
    return re.sub(r"\.(ts|tsx)$", "", relative)


# The guarded part-one bootstrap used a direct PostgREST JSON expression for public
# insights. Replace only that exact generated implementation with stable RPCs.
store_path = ROOT / CORE / "store.ts"
if store_path.exists():
    store_text = store_path.read_text(encoding="utf-8")
    start = store_text.find("export async function publicInsights()")
    end = store_text.find("export async function acceptLead", start)
    if start >= 0 and end > start and "public_slug:content->>slug" in store_text[start:end]:
        replacement = dedent(
            '''
            export async function publicInsights(): Promise<Array<{ slug: string; title: string; summary: string; published_at: string }>> {
              return rpc("media_os_public_insights", {});
            }

            export async function publicInsight(slug: string): Promise<MediaOsArtifact | null> {
              return rpc("media_os_public_insight", { p_slug: safeSlug(slug) });
            }

            '''
        )
        store_path.write_text(store_text[:start] + replacement + store_text[end:], encoding="utf-8")
        print("Patched generated public insight reads to use RPCs.")

console_path = APP / "work/media-os/media-os-console.tsx"
types_import = rel_import(console_path, CORE / "types.ts")
write_if_missing(
    console_path,
    f'''
    "use client";

    import type {{ CSSProperties, FormEvent }} from "react";
    import {{ useCallback, useEffect, useMemo, useRef, useState }} from "react";
    import type {{ MediaOsAdminSnapshot, MediaOsArtifact, MediaOsMemo }} from "{types_import}";

    type MemoDraft = {{ id: string; slug: string; title: string; summary: string; researchBody: string; declarationEvidenceIds: string }};
    type ApiError = Error & {{ status?: number; code?: string }};

    const emptyDraft: MemoDraft = {{ id: "", slug: "", title: "", summary: "", researchBody: "", declarationEvidenceIds: "" }};
    const card: CSSProperties = {{ border: "1px solid #d9dde7", borderRadius: 14, padding: 18, background: "#fff", boxShadow: "0 8px 28px rgba(15,23,42,.05)" }};
    const input: CSSProperties = {{ width: "100%", border: "1px solid #c7cedb", borderRadius: 9, padding: "10px 12px", font: "inherit", boxSizing: "border-box" }};
    const button: CSSProperties = {{ border: 0, borderRadius: 9, padding: "10px 14px", fontWeight: 700, cursor: "pointer", background: "#111827", color: "white" }};
    const secondary: CSSProperties = {{ ...button, background: "#e8edf5", color: "#111827" }};
    const danger: CSSProperties = {{ ...button, background: "#991b1b" }};
    const grid: CSSProperties = {{ display: "grid", gap: 14 }};

    function draftFrom(memo: MediaOsMemo | null): MemoDraft {{
      if (!memo) return emptyDraft;
      return {{ id: memo.id, slug: memo.slug, title: memo.title, summary: memo.summary, researchBody: memo.research_body, declarationEvidenceIds: memo.declaration_evidence_ids.join(", ") }};
    }}

    async function api(action: string, payload: Record<string, unknown> = {{}}): Promise<unknown> {{
      const response = await fetch("/api/media-os/admin", {{
        method: "POST",
        credentials: "same-origin",
        headers: {{ "content-type": "application/json" }},
        body: JSON.stringify({{ action, ...payload }}),
      }});
      const body = (await response.json().catch(() => ({{}}))) as {{ error?: string; code?: string; data?: unknown }};
      if (!response.ok) {{
        const error = new Error(body.error || `Request failed (${{response.status}})`) as ApiError;
        error.status = response.status;
        error.code = body.code;
        throw error;
      }}
      return body.data;
    }}

    function Stage({{ value }}: {{ value: number }}): JSX.Element {{
      return <span style={{{{ borderRadius: 999, padding: "4px 9px", background: value === 2 ? "#dcfce7" : value === 1 ? "#fef3c7" : "#eef2f7", fontSize: 12, fontWeight: 800 }}}}>承認 ${{value}} / 2</span>;
    }}

    function ArtifactCard({{ artifact, busy, onRun }}: {{ artifact: MediaOsArtifact; busy: boolean; onRun: (action: string, payload: Record<string, unknown>) => Promise<void> }}): JSX.Element {{
      const [scheduledAt, setScheduledAt] = useState(artifact.scheduled_at ? artifact.scheduled_at.slice(0, 16) : "");
      const [externalUrl, setExternalUrl] = useState(artifact.external_url || "");
      const external = artifact.channel !== "pseo";
      const errors = artifact.quality_issues.filter((issue) => issue.severity === "error");
      return (
        <article style={{{{ ...card, display: "grid", gap: 12 }}}}>
          <div style={{{{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}}}>
            <div><strong style={{{{ textTransform: "uppercase" }}}}>{{artifact.channel}}</strong> <span style={{{{ color: "#64748b" }}}}>rev.{{artifact.revision}} / source {{artifact.source_revision}}</span></div>
            <div style={{{{ display: "flex", gap: 8, alignItems: "center" }}}}><Stage value={{artifact.approval_stage}} /><span>{{artifact.state}}</span></div>
          </div>
          <h3 style={{{{ margin: 0 }}}}>{{artifact.content.title}}</h3>
          <p style={{{{ margin: 0, color: "#475569" }}}}>{{artifact.content.summary}}</p>
          {{errors.length > 0 && <div style={{{{ padding: 12, borderRadius: 9, background: "#fee2e2", color: "#7f1d1d" }}}}>{{errors.map((item) => item.message).join(" / ")}}</div>}}
          <details><summary>生成本文・根拠を確認</summary><div style={{{{ display: "grid", gap: 8, marginTop: 10 }}}}>{{artifact.content.body.map((paragraph, index) => <p key={{index}} style={{{{ margin: 0, whiteSpace: "pre-wrap" }}}}>{{paragraph}}</p>)}}<pre style={{{{ overflow: "auto", background: "#f8fafc", padding: 12 }}}}>{{JSON.stringify(artifact.content.evidence, null, 2)}}</pre></div></details>
          <div style={{{{ display: "flex", gap: 8, flexWrap: "wrap" }}}}>
            <button disabled={{busy}} style={{secondary}} onClick={{() => onRun("approveArtifact", {{ artifactId: artifact.id, expectedRevision: artifact.revision, stage: 1 }})}}>一次承認</button>
            <button disabled={{busy || artifact.approval_stage < 1}} style={{button}} onClick={{() => onRun("approveArtifact", {{ artifactId: artifact.id, expectedRevision: artifact.revision, stage: 2 }})}}>二次承認</button>
            <button disabled={{busy || artifact.state !== "error"}} style={{secondary}} onClick={{() => onRun("retryArtifact", {{ artifactId: artifact.id, expectedRevision: artifact.revision }})}}>再試行</button>
          </div>
          <div style={{{{ display: "grid", gridTemplateColumns: "minmax(220px,1fr) auto", gap: 8 }}}}>
            <input style={{input}} type="datetime-local" value={{scheduledAt}} onChange={{(event) => setScheduledAt(event.target.value)}} />
            <button disabled={{busy || artifact.approval_stage < 2 || !scheduledAt}} style={{secondary}} onClick={{() => onRun("scheduleArtifact", {{ artifactId: artifact.id, expectedRevision: artifact.revision, scheduledAt: new Date(scheduledAt).toISOString() }})}}>予約</button>
          </div>
          {{external && <div style={{{{ display: "grid", gridTemplateColumns: "minmax(220px,1fr) auto", gap: 8 }}}}>
            <input style={{input}} type="url" placeholder="人手公開後の外部URL" value={{externalUrl}} onChange={{(event) => setExternalUrl(event.target.value)}} />
            <button disabled={{busy || artifact.approval_stage < 2 || !externalUrl}} style={{secondary}} onClick={{() => onRun("confirmExternalPublication", {{ artifactId: artifact.id, expectedRevision: artifact.revision, externalUrl }})}}>公開URLを確定</button>
          </div>}}
          {{artifact.instruction_payload && <details><summary>署名付き・人手実行指示書</summary><pre style={{{{ overflow: "auto", background: "#f8fafc", padding: 12 }}}}>{{JSON.stringify({{ payload: artifact.instruction_payload, signature: artifact.instruction_signature }}, null, 2)}}</pre></details>}}
        </article>
      );
    }}

    export default function MediaOsConsole(): JSX.Element {{
      const [snapshot, setSnapshot] = useState<MediaOsAdminSnapshot | null>(null);
      const [selectedId, setSelectedId] = useState("");
      const [draft, setDraft] = useState<MemoDraft>(emptyDraft);
      const [dirty, setDirty] = useState(false);
      const [remoteChanged, setRemoteChanged] = useState(false);
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState("");
      const [notice, setNotice] = useState("");
      const [evidence, setEvidence] = useState({{ title: "", sourceUrl: "", excerpt: "", sourceType: "web", publishedAt: "" }});
      const dirtyRef = useRef(false);
      const selectedRef = useRef("");
      const revisionRef = useRef(0);
      useEffect(() => {{ dirtyRef.current = dirty; }}, [dirty]);
      useEffect(() => {{ selectedRef.current = selectedId; }}, [selectedId]);

      const load = useCallback(async (force = false, requestedId?: string): Promise<void> => {{
        const id = requestedId ?? selectedRef.current;
        const response = await fetch(`/api/media-os/admin${{id ? `?memo=${{encodeURIComponent(id)}}` : ""}}`, {{ credentials: "same-origin", cache: "no-store" }});
        if (response.status === 401) {{ window.location.assign(`/login?next=${{encodeURIComponent("/work/media-os")}}`); return; }}
        if (!response.ok) throw new Error(`管理データを取得できませんでした (${{response.status}})`);
        const next = (await response.json()) as MediaOsAdminSnapshot;
        setSnapshot(next);
        const memo = next.selectedMemo;
        if (memo && !selectedRef.current) {{ selectedRef.current = memo.id; setSelectedId(memo.id); }}
        if (force || !dirtyRef.current) {{
          const nextDraft = draftFrom(memo);
          setDraft(nextDraft);
          setDirty(false);
          dirtyRef.current = false;
          revisionRef.current = memo?.revision || 0;
          setRemoteChanged(false);
        }} else if (memo && memo.id === selectedRef.current && memo.revision !== revisionRef.current) {{
          setRemoteChanged(true);
        }}
      }}, []);

      useEffect(() => {{
        void load(true).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "取得に失敗しました。"));
        const timer = window.setInterval(() => void load(false).catch(() => undefined), 15_000);
        return () => window.clearInterval(timer);
      }}, [load]);

      const selectedMemo = snapshot?.memos.find((memo) => memo.id === selectedId) || snapshot?.selectedMemo || null;
      const artifacts = snapshot?.artifacts || [];
      const updateDraft = (patch: Partial<MemoDraft>): void => {{ setDraft((value) => ({{ ...value, ...patch }})); setDirty(true); dirtyRef.current = true; }};

      const run = async (action: string, payload: Record<string, unknown>): Promise<void> => {{
        setBusy(true); setError(""); setNotice("");
        try {{
          const result = await api(action, payload) as {{ id?: string }} | undefined;
          const nextId = result?.id || selectedRef.current;
          if (nextId) {{ selectedRef.current = nextId; setSelectedId(nextId); }}
          setNotice("処理が完了しました。");
          await load(true, nextId);
        }} catch (reason) {{
          const apiError = reason as ApiError;
          if (apiError.status === 409) setRemoteChanged(true);
          setError(apiError.message || "処理に失敗しました。");
        }} finally {{ setBusy(false); }}
      }};

      const saveMemo = async (event: FormEvent): Promise<void> => {{
        event.preventDefault();
        const declarationEvidenceIds = draft.declarationEvidenceIds.split(",").map((value) => value.trim()).filter(Boolean);
        if (draft.id && selectedMemo) await run("updateMemo", {{ id: draft.id, expectedRevision: selectedMemo.revision, slug: draft.slug, title: draft.title, summary: draft.summary, researchBody: draft.researchBody, declarationEvidenceIds }});
        else await run("createMemo", {{ slug: draft.slug, title: draft.title, summary: draft.summary, researchBody: draft.researchBody }});
      }};

      const selectMemo = async (id: string): Promise<void> => {{
        selectedRef.current = id; setSelectedId(id); setDirty(false); dirtyRef.current = false; setRemoteChanged(false);
        await load(true, id).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "取得に失敗しました。"));
      }};

      const addEvidence = async (event: FormEvent): Promise<void> => {{
        event.preventDefault();
        if (!selectedMemo) return;
        await run("addEvidence", {{ memoId: selectedMemo.id, ...evidence }});
        setEvidence({{ title: "", sourceUrl: "", excerpt: "", sourceType: "web", publishedAt: "" }});
      }};

      const analytics = useMemo(() => snapshot?.analytics.reduce((sum, row) => sum + Number(row.count || 0), 0) || 0, [snapshot]);

      return (
        <main style={{{{ maxWidth: 1480, margin: "0 auto", padding: "32px 20px 80px", background: "#f6f8fb", minHeight: "100vh", color: "#111827" }}}}>
          <header style={{{{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 22 }}}}>
            <div><p style={{{{ margin: 0, color: "#64748b", fontWeight: 800 }}}}>PARADIGM INTERNAL</p><h1 style={{{{ margin: "4px 0" }}}}>Japan Market Entry Media OS</h1><p style={{{{ margin: 0, color: "#475569" }}}}>一つの承認済みリサーチメモから、根拠付き5媒体成果物を安全に管理します。</p></div>
            <div style={{{{ display: "flex", gap: 8 }}}}><button style={{secondary}} onClick={{() => {{ selectedRef.current = ""; setSelectedId(""); setDraft(emptyDraft); setDirty(true); dirtyRef.current = true; setRemoteChanged(false); }}}}>新規メモ</button><button style={{secondary}} onClick={{() => void load(true)}}>最新化</button></div>
          </header>
          {{error && <div style={{{{ ...card, borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b", marginBottom: 14 }}}}>{{error}}</div>}}
          {{notice && <div style={{{{ ...card, borderColor: "#bbf7d0", background: "#f0fdf4", color: "#166534", marginBottom: 14 }}}}>{{notice}}</div>}}
          {{remoteChanged && <div style={{{{ ...card, borderColor: "#fde68a", background: "#fffbeb", marginBottom: 14 }}}}><strong>別の更新を検知しました。</strong> 未保存入力は保持しています。古いリビジョンの送信は409で停止します。<button style={{{{ ...secondary, marginLeft: 10 }}}} onClick={{() => void load(true)}}>最新版を読み込む</button></div>}}
          <div style={{{{ display: "grid", gridTemplateColumns: "minmax(220px,300px) minmax(0,1fr)", gap: 18, alignItems: "start" }}}}>
            <aside style={{{{ ...card, position: "sticky", top: 20, display: "grid", gap: 8 }}}}>
              <strong>リサーチメモ</strong>
              {{snapshot?.memos.map((memo) => <button key={{memo.id}} style={{{{ ...secondary, textAlign: "left", background: memo.id === selectedId ? "#dbeafe" : "#eef2f7" }}}} onClick={{() => void selectMemo(memo.id)}}><span style={{{{ display: "block" }}}}>{{memo.title}}</span><small>rev.{{memo.revision}} / 承認 {{memo.approval_stage}}/2</small></button>)}}
              {{snapshot?.memos.length === 0 && <span style={{{{ color: "#64748b" }}}}>まだメモがありません。</span>}}
            </aside>
            <section style={{{{ display: "grid", gap: 18 }}}}>
              <form onSubmit={{saveMemo}} style={{{{ ...card, ...grid }}}}>
                <div style={{{{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}}}><h2 style={{{{ margin: 0 }}}}>リサーチメモ</h2>{{selectedMemo && <div style={{{{ display: "flex", gap: 8, alignItems: "center" }}}}><Stage value={{selectedMemo.approval_stage}} /><span>rev.{{selectedMemo.revision}}</span></div>}}</div>
                <label>英語スラッグ<input style={{input}} value={{draft.slug}} onChange={{(event) => updateDraft({{ slug: event.target.value }})}} placeholder="japan-market-topic" /></label>
                <label>タイトル<input required style={{input}} value={{draft.title}} onChange={{(event) => updateDraft({{ title: event.target.value }})}} /></label>
                <label>要約<textarea required style={{{{ ...input, minHeight: 90 }}}} value={{draft.summary}} onChange={{(event) => updateDraft({{ summary: event.target.value }})}} /></label>
                <label>調査本文<textarea style={{{{ ...input, minHeight: 260 }}}} value={{draft.researchBody}} onChange={{(event) => updateDraft({{ researchBody: event.target.value }})}} /></label>
                <label>宣言する根拠ID（カンマ区切り）<input style={{input}} value={{draft.declarationEvidenceIds}} onChange={{(event) => updateDraft({{ declarationEvidenceIds: event.target.value }})}} placeholder="EV-..., EV-..." /></label>
                <div style={{{{ display: "flex", gap: 8, flexWrap: "wrap" }}}}><button disabled={{busy || !dirty}} style={{button}} type="submit">保存</button>{{selectedMemo && <><button disabled={{busy || dirty}} type="button" style={{secondary}} onClick={{() => void run("approveMemo", {{ memoId: selectedMemo.id, expectedRevision: selectedMemo.revision, stage: 1 }})}}>一次承認</button><button disabled={{busy || dirty || selectedMemo.approval_stage < 1}} type="button" style={{button}} onClick={{() => void run("approveMemo", {{ memoId: selectedMemo.id, expectedRevision: selectedMemo.revision, stage: 2 }})}}>二次承認</button><button disabled={{busy || dirty || selectedMemo.approval_stage < 2}} type="button" style={{button}} onClick={{() => void run("generateArtifacts", {{ memoId: selectedMemo.id, expectedRevision: selectedMemo.revision }})}}>5媒体を生成</button></>}}</div>
              </form>
              {{selectedMemo && <form onSubmit={{addEvidence}} style={{{{ ...card, ...grid }}}}><h2 style={{{{ margin: 0 }}}}>根拠ソース</h2><div style={{{{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}}}><input required style={{input}} placeholder="根拠タイトル" value={{evidence.title}} onChange={{(event) => setEvidence((value) => ({{ ...value, title: event.target.value }}))}} /><input required style={{input}} type="url" placeholder="https://..." value={{evidence.sourceUrl}} onChange={{(event) => setEvidence((value) => ({{ ...value, sourceUrl: event.target.value }}))}} /></div><textarea required style={{{{ ...input, minHeight: 100 }}}} placeholder="引用ではなく、検証可能な短い要約" value={{evidence.excerpt}} onChange={{(event) => setEvidence((value) => ({{ ...value, excerpt: event.target.value }}))}} /><button disabled={{busy}} style={{secondary}} type="submit">根拠を追加</button><div style={{grid}}>{{snapshot?.evidence.map((item) => <div key={{item.id}} style={{{{ borderTop: "1px solid #e2e8f0", paddingTop: 10 }}}}><strong>{{item.id}} — {{item.title}}</strong><p style={{{{ margin: "5px 0", color: "#475569" }}}}>{{item.excerpt}}</p><a href={{item.source_url}} target="_blank" rel="noreferrer">ソースを開く</a> <button disabled={{busy}} type="button" style={{{{ ...danger, padding: "5px 9px", marginLeft: 8 }}}} onClick={{() => void run("removeEvidence", {{ memoId: selectedMemo.id, evidenceId: item.id }})}}>削除</button></div>)}}</div></form>}}
              {{artifacts.length > 0 && <section style={{grid}}><h2 style={{{{ margin: 0 }}}}>生成成果物</h2>{{artifacts.map((artifact) => <ArtifactCard key={{artifact.id}} artifact={{artifact}} busy={{busy}} onRun={{run}} />)}}</section>}}
              <section style={{{{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}}}><div style={{card}}><h2>同意済みリード</h2><p>合計 {{snapshot?.leads.length || 0}} 件</p>{{snapshot?.leads.slice(0, 20).map((lead) => <p key={{lead.id}}><strong>{{lead.email}}</strong><br />{{lead.company || lead.name || "—"}} / {{lead.insight_slug}}</p>)}}</div><div style={{card}}><h2>分析・監査</h2><p>計測イベント {{analytics}} 件</p><details><summary>監査履歴（最新100件）</summary><pre style={{{{ whiteSpace: "pre-wrap", fontSize: 12 }}}}>{{JSON.stringify(snapshot?.audit || [], null, 2)}}</pre></details></div></section>
            </section>
          </div>
        </main>
      );
    }}
    ''',
)

admin_page = APP / "work/media-os/page.tsx"
console_import = rel_import(admin_page, console_path)
write_if_missing(
    admin_page,
    f'''
    import type {{ Metadata }} from "next";
    import MediaOsConsole from "{console_import}";

    export const metadata: Metadata = {{ title: "Japan Market Entry Media OS | Paradigm" }};
    export const dynamic = "force-dynamic";

    export default function MediaOsAdminPage(): JSX.Element {{
      return <MediaOsConsole />;
    }}
    ''',
)

list_page = APP / "en/japan-market-insights/page.tsx"
list_store_import = rel_import(list_page, CORE / "store.ts")
write_if_missing(
    list_page,
    f'''
    import type {{ Metadata }} from "next";
    import Link from "next/link";
    import {{ publicInsights }} from "{list_store_import}";

    export const metadata: Metadata = {{
      title: "Japan Market Insights | Paradigm",
      description: "Evidence-linked research for companies evaluating entry into the Japanese market.",
      alternates: {{ canonical: "/en/japan-market-insights" }},
    }};
    export const dynamic = "force-dynamic";

    export default async function JapanMarketInsightsPage(): Promise<JSX.Element> {{
      const insights = await publicInsights().catch(() => []);
      return <main style={{{{ maxWidth: 1040, margin: "0 auto", padding: "72px 22px 100px" }}}}><p style={{{{ fontWeight: 800, letterSpacing: ".08em" }}}}>PARADIGM RESEARCH</p><h1 style={{{{ fontSize: "clamp(2.3rem,6vw,4.8rem)", lineHeight: 1, maxWidth: 900 }}}}>Japan Market Insights</h1><p style={{{{ maxWidth: 760, fontSize: 19, lineHeight: 1.7, color: "#475569" }}}}>Decision-grade, evidence-linked briefs for international teams evaluating Japan. Each published claim retains its source references and limitations.</p><section style={{{{ display: "grid", gap: 16, marginTop: 44 }}}}>{{insights.map((item) => <article key={{item.slug}} style={{{{ border: "1px solid #d9dde7", borderRadius: 16, padding: 24 }}}}><p style={{{{ marginTop: 0, color: "#64748b" }}}}>{{new Date(item.published_at).toLocaleDateString("en-US")}}</p><h2>{{item.title}}</h2><p style={{{{ color: "#475569", lineHeight: 1.7 }}}}>{{item.summary}}</p><Link href={{`/en/japan-market-insights/${{item.slug}}`}}>Read the evidence-linked brief →</Link></article>)}}{{insights.length === 0 && <div style={{{{ border: "1px dashed #94a3b8", borderRadius: 16, padding: 30, color: "#475569" }}}}>Approved research briefs will appear here after internal publication.</div>}}</section></main>;
    }}
    ''',
)

lead_form_path = APP / "en/japan-market-insights/[slug]/lead-form.tsx"
write_if_missing(
    lead_form_path,
    r'''
    "use client";

    import Script from "next/script";
    import { useEffect, useState } from "react";

    declare global { interface Window { mediaOsTurnstileComplete?: (token: string) => void; } }

    export default function LeadForm({ insightSlug }: { insightSlug: string }): JSX.Element {
      const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
      const [turnstileToken, setTurnstileToken] = useState("");
      const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
      const [message, setMessage] = useState("");
      useEffect(() => {
        window.mediaOsTurnstileComplete = (token: string) => setTurnstileToken(token);
        let sessionId = window.sessionStorage.getItem("media-os-session");
        if (!sessionId) { sessionId = window.crypto.randomUUID(); window.sessionStorage.setItem("media-os-session", sessionId); }
        void fetch("/api/media-os/analytics", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ insightSlug, eventName: "page_view", sessionId }) });
        return () => { delete window.mediaOsTurnstileComplete; };
      }, [insightSlug]);

      async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault(); setStatus("sending"); setMessage("");
        const form = new FormData(event.currentTarget);
        const honeypot = String(form.get("website") || "");
        const payload = { insightSlug, name: form.get("name"), email: form.get("email"), company: form.get("company"), companyWebsite: form.get("companyWebsite"), message: form.get("message"), website: honeypot, consent: form.get("consent") === "on", turnstileToken };
        const response = await fetch("/api/media-os/leads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) { setStatus("error"); setMessage(body.error || "Submission failed. Please review the form and try again."); return; }
        setStatus("sent"); setMessage("Thank you. Paradigm will review the context before any follow-up."); event.currentTarget.reset();
      }

      const field: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 9, padding: "11px 12px", font: "inherit" };
      return <section id="consultation" style={{ border: "1px solid #cbd5e1", borderRadius: 18, padding: 24, marginTop: 48 }}><h2>Discuss a controlled Japan-market validation</h2><p style={{ color: "#475569", lineHeight: 1.7 }}>Your details are used only to assess this request. No automated outreach or social engagement is triggered.</p><form onSubmit={submit} style={{ display: "grid", gap: 12 }}><div aria-hidden="true" data-honeypot="true" style={{ position: "absolute", left: "-10000px", height: 1, overflow: "hidden" }}><label>Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" /></label></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><input style={field} name="name" maxLength={160} placeholder="Name" /><input style={field} required name="email" type="email" maxLength={254} placeholder="Work email" /></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><input style={field} name="company" maxLength={240} placeholder="Company" /><input style={field} name="companyWebsite" type="url" placeholder="https://company.com" /></div><textarea style={{ ...field, minHeight: 120 }} name="message" maxLength={4000} placeholder="What are you evaluating in Japan?" /><label style={{ display: "flex", alignItems: "flex-start", gap: 9 }}><input required name="consent" type="checkbox" />I consent to Paradigm storing these details to review and respond to this request.</label>{siteKey && <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" /><div className="cf-turnstile" data-sitekey={siteKey} data-callback="mediaOsTurnstileComplete" /></>}<button disabled={status === "sending" || Boolean(siteKey && !turnstileToken)} style={{ border: 0, borderRadius: 9, padding: "12px 16px", fontWeight: 800, background: "#111827", color: "white", cursor: "pointer" }}>{status === "sending" ? "Submitting…" : "Request a review"}</button>{message && <p role="status" style={{ color: status === "error" ? "#991b1b" : "#166534" }}>{message}</p>}</form></section>;
    }
    ''',
)

detail_page = APP / "en/japan-market-insights/[slug]/page.tsx"
detail_store_import = rel_import(detail_page, CORE / "store.ts")
lead_import = rel_import(detail_page, lead_form_path)
write_if_missing(
    detail_page,
    f'''
    import type {{ Metadata }} from "next";
    import Link from "next/link";
    import {{ notFound }} from "next/navigation";
    import {{ publicInsight }} from "{detail_store_import}";
    import LeadForm from "{lead_import}";

    type Props = {{ params: Promise<{{ slug: string }}> | {{ slug: string }} }};
    export const dynamic = "force-dynamic";

    export async function generateMetadata({{ params }}: Props): Promise<Metadata> {{
      const {{ slug }} = await Promise.resolve(params);
      const artifact = await publicInsight(slug).catch(() => null);
      if (!artifact) return {{ title: "Japan Market Insight | Paradigm" }};
      return {{ title: `${{artifact.content.title}} | Paradigm`, description: artifact.content.summary, alternates: {{ canonical: `/en/japan-market-insights/${{artifact.content.slug}}` }} }};
    }}

    export default async function JapanMarketInsightPage({{ params }}: Props): Promise<JSX.Element> {{
      const {{ slug }} = await Promise.resolve(params);
      const artifact = await publicInsight(slug).catch(() => null);
      if (!artifact) notFound();
      const content = artifact.content;
      return <main style={{{{ maxWidth: 900, margin: "0 auto", padding: "56px 22px 100px" }}}}><Link href="/en/japan-market-insights">← All insights</Link><header style={{{{ margin: "44px 0" }}}}><p style={{{{ fontWeight: 800, letterSpacing: ".08em" }}}}>EVIDENCE-LINKED JAPAN MARKET BRIEF</p><h1 style={{{{ fontSize: "clamp(2.1rem,6vw,4.4rem)", lineHeight: 1.03 }}}}>{{content.title}}</h1><p style={{{{ fontSize: 20, lineHeight: 1.7, color: "#475569" }}}}>{{content.summary}}</p></header><article style={{{{ display: "grid", gap: 22, fontSize: 18, lineHeight: 1.8 }}}}>{{content.body.map((paragraph, index) => <p key={{index}} style={{{{ margin: 0, whiteSpace: "pre-wrap" }}}}>{{paragraph}}</p>)}}</article><section style={{{{ marginTop: 52, borderTop: "1px solid #cbd5e1", paddingTop: 28 }}}}><h2>Claims and evidence IDs</h2>{{content.claims.map((claim, index) => <div key={{index}} style={{{{ marginBottom: 16 }}}}><p>{{claim.text}}</p><code>{{claim.evidenceIds.join(", ") || "No factual evidence ID required"}}</code></div>)}}<h2 style={{{{ marginTop: 36 }}}}>Evidence register</h2>{{content.evidence.map((item) => <article key={{item.id}} style={{{{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, marginBottom: 12 }}}}><strong>{{item.id}} — {{item.title}}</strong><p style={{{{ color: "#475569" }}}}>{{item.excerpt}}</p><a href={{item.source_url}} target="_blank" rel="noreferrer nofollow">Open source</a></article>)}}</section><LeadForm insightSlug={{content.slug}} /></main>;
    }}
    ''',
)
