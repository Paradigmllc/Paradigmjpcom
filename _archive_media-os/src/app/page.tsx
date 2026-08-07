import { ProductionControls } from "@/components/production-controls";
import { isStudioEnabled } from "@/lib/media-os/auth";
import { getDashboardSnapshot } from "@/lib/media-os/repository";
import { createSignedPilotReviewPath, createSignedReviewPath } from "@/lib/media-os/review-signing";
import type { ClaimStatus, DistributionAsset, EpisodeStatus, JobStatus } from "@/lib/media-os/types";

export const dynamic = "force-dynamic";

const episodeStatusLabel: Record<EpisodeStatus, string> = {
  research: "調査", script: "台本", storyboard: "絵コンテ", rendering: "レンダー中",
  review: "レビュー", approved: "承認済み", published: "公開済み", blocked: "停止",
};

const jobStatusLabel: Record<JobStatus, string> = {
  queued: "待機", running: "実行中", review_required: "要レビュー",
  approved: "承認済み", failed: "失敗", cancelled: "中止",
};

function compactDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return "--";
  const rounded = Math.max(0, Math.round(seconds));
  return rounded >= 3600 ? `${Math.floor(rounded / 3600)}h ${Math.floor((rounded % 3600) / 60)}m` : `${Math.floor(rounded / 60)}m ${rounded % 60}s`;
}

const claimStatusStyle: Record<ClaimStatus, string> = {
  confirmed: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  alleged: "border-amber-400/25 bg-amber-400/10 text-amber-100",
  disputed: "border-orange-400/25 bg-orange-400/10 text-orange-100",
  hypothesis: "border-sky-400/25 bg-sky-400/10 text-sky-100",
  dramatized: "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-100",
  rejected: "border-red-400/25 bg-red-400/10 text-red-100",
};

const platformLabel: Record<DistributionAsset["platform"], string> = {
  youtube_watch: "YouTube",
  youtube_shorts: "Shorts",
  tiktok: "TikTok",
  instagram_reels: "Instagram",
};

const qualityCategoryLabel: Record<string, string> = {
  pacing: "テンポ",
  entertainment: "娯楽性",
  host: "司会者演出",
  visual: "画づくり",
  motion: "演出",
  evidence: "根拠",
  audio: "音響・語り",
  technical: "技術",
  structure: "構成",
  originality: "独自性",
  safety: "安全性",
  sourceIntegrity: "出典整合性",
  visualDirection: "映像設計",
  narrative: "物語構成",
  policySafety: "ポリシー安全性",
};

const qualityCategoryMaximum: Record<string, number> = {
  pacing: 25, entertainment: 25, host: 15, safety: 15,
  visual: 35, motion: 20, evidence: 15, audio: 20, technical: 10,
  sourceIntegrity: 25, originality: 25, visualDirection: 20, narrative: 15, policySafety: 15,
};

function durationLabel(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function MessageCard({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-20">
      <section className="w-full rounded-2xl border border-red-400/20 bg-red-950/20 p-8">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-200">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-black">{title}</h1>
        <p className="mt-3 text-sm leading-7 text-red-100/70">{body}</p>
      </section>
    </main>
  );
}

export default function Home() {
  if (!isStudioEnabled()) {
    return <MessageCard eyebrow="Fail closed" title="Media OS Studio is disabled" body="Production requires explicit studio enablement and admin authentication." />;
  }

  let snapshot: ReturnType<typeof getDashboardSnapshot>;

  try {
    snapshot = getDashboardSnapshot();
  } catch (error) {
    console.error("[media-os-page] dashboard failed", error);
    return <MessageCard eyebrow="Database error" title="Studioを読み込めませんでした" body="SQLiteの初期化またはスキーマ読込に失敗しました。サーバーログに原因を記録しています。" />;
  }

  const activeEpisode = snapshot.episodes.find((episode) => episode.language === "ja") ?? snapshot.episodes[0];
  const episodeClaims = activeEpisode ? snapshot.claims.filter((claim) => claim.episodeId === activeEpisode.id) : [];
  const activeJobs = activeEpisode ? snapshot.jobs.filter((job) => job.episodeId === activeEpisode.id) : [];
  const activeQualityReports = activeEpisode ? snapshot.qualityReports.filter((report) => report.episodeId === activeEpisode.id) : [];
  const episodeAssets = activeEpisode ? snapshot.assets.filter((asset) => asset.episodeId === activeEpisode.id) : [];
  const activeCreativePilot = activeEpisode
    ? snapshot.creativePilots.find((pilot) => pilot.episodeId === activeEpisode.id)
    : undefined;
  const readyProviders = snapshot.readiness.filter((item) => item.ready).length;
  const reviewHref = activeEpisode ? createSignedReviewPath(activeEpisode.id) : null;
  const pilotReviewHref = activeEpisode && activeCreativePilot?.previewReady
    ? createSignedPilotReviewPath(activeEpisode.id)
    : null;

    return (
      <main className="mx-auto min-h-screen w-full max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-[#d4a72c] shadow-[0_0_22px_rgba(212,167,44,0.7)]" />
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#b8b3a5]">Evidence-led production control</p>
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl">YouTube Media OS</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#a8a397]">調査・主張・出典・脚本・レンダー・承認を一つの台帳でつなぎ、日英チャンネルを並行検証します。</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[["Channels", snapshot.channels.length], ["Episodes", snapshot.episodes.length], ["Providers", `${readyProviders}/${snapshot.readiness.length}`]].map(([label, value]) => (
              <div key={label} className="min-w-24 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3">
                <div className="text-xl font-black tabular-nums">{value}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#817d73]">{label}</div>
              </div>
            ))}
          </div>
        </header>

        <section className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_1.9fr_1fr]">
          <aside className="rounded-2xl border border-white/10 bg-[#181713]/90 p-4 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-[0.16em]">Portfolio</h2>
              <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-[#8f8a7f]">10–20 lanes</span>
            </div>
            <div className="mt-4 space-y-3">
              {snapshot.channels.map((channel) => (
                <article key={channel.id} className="rounded-xl border border-white/8 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-bold">{channel.name}</p><p className="mt-1 font-mono text-[11px] text-[#827d72]">{channel.slug}</p></div>
                    <span className="rounded-md border border-white/10 px-2 py-1 text-[10px] font-black uppercase text-[#c7c2b5]">{channel.language}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-[#9d988c]">
                    <span>{channel.format.replaceAll("_", " ")}</span>
                    <span>{snapshot.episodes.filter((episode) => episode.channelId === channel.id).length} episode</span>
                  </div>
                </article>
              ))}
            </div>
          </aside>

          <section className="rounded-2xl border border-white/10 bg-[#181713]/90 p-4 shadow-2xl shadow-black/20 sm:p-5">
            {activeEpisode ? (
              <>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-[#d4a72c]/15 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#e7c768]">Pilot case</span>
                      <span className="rounded-md border border-white/10 px-2 py-1 text-[10px] font-bold text-[#a9a396]">{episodeStatusLabel[activeEpisode.status]}</span>
                      <span className="rounded-md border border-orange-300/15 px-2 py-1 text-[10px] font-bold text-orange-100/80">Risk {activeEpisode.riskLevel}</span>
                    </div>
                    <h2 className="mt-4 max-w-2xl text-2xl font-black leading-tight tracking-[-0.025em] sm:text-3xl">{activeEpisode.title}</h2>
                    <p className="mt-3 text-sm text-[#969084]">{activeEpisode.confirmedCount} confirmed · {activeEpisode.allegedCount} alleged · {activeEpisode.sourceCount} primary sources</p>
                  </div>
                  <div className="flex flex-col items-stretch gap-2 sm:items-end">
                    <ProductionControls
                      episodeId={activeEpisode.id}
                      pilotApprovalEnabled={activeCreativePilot?.previewReady === true && activeCreativePilot.renderReady !== true}
                      professionalMasterEnabled={activeCreativePilot?.renderReady === true}
                    />
                    {reviewHref ? <a
                      href={reviewHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-[#d4a72c]/40 bg-[#d4a72c]/10 px-4 py-2 text-center text-xs font-black text-[#e7c768] transition hover:bg-[#d4a72c]/20"
                    >
                      完成マスターを確認
                    </a> : null}
                  </div>
                </div>

                <section className="mt-6 rounded-xl border border-fuchsia-300/25 bg-fuchsia-300/[0.055] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-200">Entertainment pilot</p>
                      <h3 className="mt-2 text-lg font-black">90秒でフック・キャラクター・映像テンポを先に検証</h3>
                      <p className="mt-2 max-w-2xl text-xs leading-6 text-[#aaa497]">15分本編へGPU費用を投じる前に、アバターを常時表示せず、再現映像・漫画・一次資料・図解をショット単位で切り替える演出設計を審査します。</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-black ${activeCreativePilot?.status === "pass" ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100" : "border-white/10 bg-white/5 text-[#9d978a]"}`}>
                      {activeCreativePilot ? `演出設計 ${activeCreativePilot.score}/100 · ${activeCreativePilot.previewReady ? "90秒試写確認可" : "素材・試写待ち"}` : "未生成"}
                    </span>
                  </div>
                  {pilotReviewHref ? (
                    <a
                      href={pilotReviewHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex rounded-lg border border-fuchsia-300/35 bg-fuchsia-300/10 px-4 py-2 text-xs font-black text-fuchsia-100 transition hover:bg-fuchsia-300/20"
                    >
                      90秒エンタメ試写を確認
                    </a>
                  ) : null}
                  {activeCreativePilot ? (
                    <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                      {[
                        ["形式", activeCreativePilot.formatFamily.replaceAll("_", " ")],
                        ["尺", `${activeCreativePilot.durationSeconds}秒`],
                        ["ショット", activeCreativePilot.shotCount],
                        ["司会者", `${(activeCreativePilot.avatarShare * 100).toFixed(1)}%`],
                        ["プレゼン画面", `${(activeCreativePilot.presentationShare * 100).toFixed(1)}%`],
                        ["GPU素材", activeCreativePilot.assetRequestCount],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-lg border border-white/8 bg-black/20 p-3">
                          <p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#817b71]">{label}</p>
                          <p className="mt-2 break-words font-mono text-sm font-black text-[#eee9df]">{value}</p>
                        </div>
                      ))}
                    </div>
                  ) : <p className="mt-4 rounded-lg border border-dashed border-white/10 p-3 text-xs text-[#817b71]">「90秒エンタメ演出を設計」を実行すると、3案の企画、ショット表、アバター出演率、ComfyUI素材指示、演出QCが生成されます。</p>}
                </section>

                <section className="mt-6 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.045] p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Dynamic production profiles</p>
                      <h3 className="mt-2 text-lg font-black">紙芝居ではなく、ショットごとに最適な生成・合成方式へ分岐</h3>
                      <p className="mt-2 max-w-3xl text-xs leading-6 text-[#aaa497]">実写ホスト、Wan系フルモーション、漫画パララックス、アニメ、証拠図解を別ワークフローとして管理し、未承認モデルや同期検証なしの素材は自動停止します。</p>
                    </div>
                    <span className="rounded-full border border-cyan-200/25 bg-cyan-200/10 px-3 py-1 font-mono text-xs font-black text-cyan-100">
                      {snapshot.productionProfiles.filter((profile) => profile.productionReady).length}/{snapshot.productionProfiles.length} master ready
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {snapshot.productionProfiles.map((profile) => (
                      <article key={profile.id} className="rounded-lg border border-white/8 bg-black/20 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div><p className="text-xs font-black text-[#eee9df]">{profile.label}</p><p className="mt-1 font-mono text-[9px] text-[#777268]">{profile.generator}</p></div>
                          <span className={`rounded border px-2 py-1 text-[9px] font-black uppercase ${profile.productionReady ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100" : profile.workflowReady ? "border-amber-300/25 bg-amber-300/10 text-amber-100" : "border-red-300/20 bg-red-300/[0.08] text-red-100"}`}>{profile.productionReady ? "master" : profile.workflowReady ? "preview" : "blocked"}</span>
                        </div>
                        <p className="mt-3 text-[10px] uppercase tracking-[0.12em] text-cyan-100/80">{profile.outputKind} · {profile.compositingRole.replaceAll("_", " ")}</p>
                        <p className="mt-2 text-[10px] leading-5 text-[#8f897e]">{profile.productionReady ? profile.visualModes.join(" / ") : profile.blocker}</p>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d4a72c]">Master → Distribution</p>
                      <p className="mt-1 text-sm text-[#b8b2a5]">10〜20分の本編を編集マスターにし、要約・縦型切り抜きを派生</p>
                    </div>
                    <span className="font-mono text-xs text-[#817d73]">{episodeAssets.length} assets</span>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {episodeAssets.map((asset) => (
                      <article key={asset.id} className={`rounded-lg border p-3 ${asset.parentAssetId ? "border-white/8 bg-white/[0.025]" : "border-[#d4a72c]/35 bg-[#d4a72c]/[0.07]"}`}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-black">{platformLabel[asset.platform]} · {asset.format}</span>
                          <span className="font-mono text-xs text-[#d8b84e]">{durationLabel(asset.durationSeconds)}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase text-[#777268]">
                          <span>{asset.aspectRatio} · {asset.editor}</span>
                          <span>{asset.status.replaceAll("_", " ")}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <div className="mt-6 rounded-xl border border-[#d4a72c]/20 bg-[#d4a72c]/[0.055] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#d4a72c]">Evidence Room</p><p className="mt-1 text-sm text-[#b8b2a5]">主張ごとにステータス・出典・該当箇所を固定</p></div>
                    <div className="font-mono text-2xl font-black tabular-nums">{activeEpisode.claimCount}</div>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {episodeClaims.map((claim, index) => (
                    <article key={claim.id} className="rounded-xl border border-white/8 bg-black/20 p-4">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 font-mono text-xs text-[#6f6b62]">{String(index + 1).padStart(2, "0")}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${claimStatusStyle[claim.status]}`}>{claim.status}</span>
                            <a href={claim.sourceUrl} target="_blank" rel="noopener noreferrer" className="truncate text-xs font-semibold text-[#d4a72c] underline decoration-[#d4a72c]/30 underline-offset-4 hover:decoration-[#d4a72c]">{claim.sourceTitle}</a>
                          </div>
                          <p className="mt-3 text-sm font-medium leading-7 text-[#e4e0d6]">{claim.statement}</p>
                          <p className="mt-2 font-mono text-[10px] leading-5 text-[#777268]">{claim.locator}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : <div className="flex min-h-96 items-center justify-center rounded-xl border border-dashed border-white/15 text-sm text-[#8e897e]">最初の調査案件を登録すると、ここに証拠台帳が表示されます。</div>}
          </section>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-white/10 bg-[#181713]/90 p-4 shadow-2xl shadow-black/20">
              <h2 className="text-sm font-black uppercase tracking-[0.16em]">Quality gate</h2>
              <div className="mt-4 space-y-3">
                {activeQualityReports.length > 0 ? activeQualityReports.slice(0, 3).map((report) => (
                  <article key={report.id} className={`rounded-xl border p-3 ${report.status === "pass" ? "border-emerald-300/20 bg-emerald-300/[0.06]" : "border-red-300/20 bg-red-300/[0.06]"}`}>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#9d978a]">{report.kind === "professional_render" ? "技術マスター品質" : report.kind === "creative_plan" ? "YouTube演出設計品質" : "構成品質"}</p>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-xs font-black uppercase tracking-[0.12em]">{report.status}</span>
                      <span className="font-mono text-2xl font-black tabular-nums">{report.score}<span className="text-xs text-[#777268]">/100</span></span>
                    </div>
                    <div className="mt-2 flex justify-between font-mono text-[10px] text-[#777268]">
                      <span>threshold {report.threshold}</span>
                      <span>{report.nearestPeerSimilarity === null ? "no peer" : `${(report.nearestPeerSimilarity * 100).toFixed(1)}% nearest`}</span>
                    </div>
                    {report.blockerIds.length > 0 ? <p className="mt-2 break-words font-mono text-[10px] leading-5 text-red-200">{report.blockerIds.join(" / ")}</p> : null}
                    {Object.keys(report.categoryScores).length > 0 ? (
                      <div className="mt-3 space-y-2 border-t border-white/8 pt-3">
                        {Object.entries(report.categoryScores).map(([category, score]) => (
                          <div key={category}>
                            <div className="flex items-center justify-between text-[10px] text-[#9d978a]">
                              <span>{qualityCategoryLabel[category] ?? category}</span>
                              <span className="font-mono tabular-nums">{score}</span>
                            </div>
                            <div className="mt-1 h-1 overflow-hidden bg-white/5">
                              <div className="h-full bg-[#d4a72c]" style={{ width: `${Math.min(100, (score / (qualityCategoryMaximum[category] ?? 100)) * 100)}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                )) : <p className="rounded-xl border border-dashed border-white/10 p-4 text-xs leading-6 text-[#807b70]">長尺構成の品質監査はまだ実行されていません。</p>}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#181713]/90 p-4 shadow-2xl shadow-black/20">
              <h2 className="text-sm font-black uppercase tracking-[0.16em]">Production queue</h2>
              <div className="mt-4 space-y-3">
                {activeJobs.length > 0 ? activeJobs.map((job) => (
                  <article key={job.id} className="rounded-xl border border-white/8 bg-black/20 p-3">
                    <div className="flex items-center justify-between gap-3"><span className="text-xs font-bold">{job.renderer}</span><span className="text-[10px] font-bold text-[#d8b84e]">{jobStatusLabel[job.status]}</span></div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-[#d4a72c]" style={{ width: `${job.progress}%` }} /></div>
                    <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-[#777268]"><span>{job.reviewGate}</span><span>{job.progress}%</span></div>
                    {job.phase ? (
                      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/8 pt-3 font-mono text-[10px] text-[#9d978a]">
                        <span className="col-span-2 truncate text-[#d8b84e]">{job.phase} · {job.detail}</span>
                        <span>{job.totalUnits ? `${job.completedUnits ?? 0}/${job.totalUnits} frames` : "units --"}</span>
                        <span className="text-right">ETA {compactDuration(job.estimatedRemainingSeconds)}</span>
                        <span>disk {job.freeDiskGiB === null ? "--" : `${job.freeDiskGiB.toFixed(1)} GiB`}</span>
                        <span className="text-right">cost ${job.costUsd.toFixed(3)}</span>
                      </div>
                    ) : null}
                    {job.errorMessage ? <p className="mt-2 text-xs text-red-200">{job.errorMessage}</p> : null}
                  </article>
                )) : <p className="rounded-xl border border-dashed border-white/10 p-4 text-xs leading-6 text-[#807b70]">レンダー待ちジョブはありません。</p>}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#181713]/90 p-4 shadow-2xl shadow-black/20">
              <h2 className="text-sm font-black uppercase tracking-[0.16em]">Provider readiness</h2>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-black/20 p-2"><p className="font-mono text-lg font-black">{snapshot.providerArtifacts.researchDocuments}</p><p className="text-[9px] text-[#777268]">研究資料</p></div>
                <div className="rounded-lg bg-black/20 p-2"><p className="font-mono text-lg font-black">{snapshot.providerArtifacts.generatedVisuals}</p><p className="text-[9px] text-[#777268]">生成素材</p></div>
                <div className="rounded-lg bg-black/20 p-2"><p className="font-mono text-lg font-black">${snapshot.providerArtifacts.gpuCostUsd.toFixed(2)}</p><p className="text-[9px] text-[#777268]">GPU原価</p></div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-emerald-300/[0.06] p-2"><p className="font-mono text-lg font-black text-emerald-100">{snapshot.providerArtifacts.visualQualityPassed}</p><p className="text-[9px] text-[#777268]">素材QA合格</p></div>
                <div className="rounded-lg bg-red-300/[0.06] p-2"><p className="font-mono text-lg font-black text-red-100">{snapshot.providerArtifacts.visualQualityBlocked}</p><p className="text-[9px] text-[#777268]">素材QA停止</p></div>
              </div>
              <div className="mt-4 space-y-3">
                {snapshot.readiness.map((provider) => (
                  <div key={provider.name} className="flex gap-3">
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${provider.ready ? "bg-emerald-400" : "bg-white/20"}`} />
                    <div><p className="text-xs font-bold">{provider.name}</p><p className="mt-1 text-[11px] leading-5 text-[#777268]">{provider.detail}</p></div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </section>
      </main>
    );
}
