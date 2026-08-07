import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const globalDatabase = globalThis as unknown as {
  mediaOsDatabase?: DatabaseSync;
};

function databasePath(): string {
  const configured = process.env.MEDIA_OS_DATABASE_PATH?.trim();
  const value = configured && configured.length > 0 ? configured : ".data/media-os.sqlite";
  if (value === ":memory:") return value;
  return isAbsolute(value)
    ? value
    : resolve(/* turbopackIgnore: true */ process.cwd(), value);
}

function seedDatabase(db: DatabaseSync): void {
  const profileRegistryPath = resolve(process.cwd(), "config", "comfyui", "production-profiles.json");
  if (!existsSync(profileRegistryPath)) throw new Error(`Production profile registry missing: ${profileRegistryPath}`);
  const profileRegistry = JSON.parse(readFileSync(profileRegistryPath, "utf8")) as {
    version: string;
    profiles: Array<{
      id: string;
      label: string;
      outputKind: string;
      compositingRole: string;
      readiness: string;
      generator: string;
      workflowPath?: string;
      workflowPathEnv?: string;
      bindingPathEnv?: string;
      bindings?: object;
      visualModes: string[];
      requiredCapabilities: string[];
      quality: object;
    }>;
  };
  const insertProfile = db.prepare(`
    insert into production_profiles (
      id,registry_version,label,output_kind,compositing_role,readiness,generator,
      workflow_path,workflow_path_env,binding_path_env,bindings_json,visual_modes_json,
      required_capabilities_json,quality_contract_json,updated_at
    ) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,current_timestamp)
    on conflict(id) do update set registry_version=excluded.registry_version,label=excluded.label,
      output_kind=excluded.output_kind,compositing_role=excluded.compositing_role,
      readiness=excluded.readiness,generator=excluded.generator,workflow_path=excluded.workflow_path,
      workflow_path_env=excluded.workflow_path_env,binding_path_env=excluded.binding_path_env,
      bindings_json=excluded.bindings_json,visual_modes_json=excluded.visual_modes_json,
      required_capabilities_json=excluded.required_capabilities_json,
      quality_contract_json=excluded.quality_contract_json,updated_at=current_timestamp
  `);
  for (const profile of profileRegistry.profiles) {
    insertProfile.run(profile.id, profileRegistry.version, profile.label, profile.outputKind,
      profile.compositingRole, profile.readiness, profile.generator, profile.workflowPath ?? null,
      profile.workflowPathEnv ?? null, profile.bindingPathEnv ?? null, JSON.stringify(profile.bindings ?? {}),
      JSON.stringify(profile.visualModes), JSON.stringify(profile.requiredCapabilities), JSON.stringify(profile.quality));
  }
  const insertChannel = db.prepare(
    "insert or ignore into channels (id,slug,name,language,format,status) values (?,?,?,?,?,?)",
  );
  const channels = [
    ["channel-ledger-ja", "ledger-rooms-ja", "帳簿の裏側", "ja", "investigative_docudrama"],
    ["channel-whistle-ja", "whistle-files-ja", "告発ファイル", "ja", "audio_document_drama"],
    ["channel-breach-ja", "breach-path-ja", "侵入経路", "ja", "animated_systems_teardown"],
    ["channel-regulation-ja", "regulation-front-ja", "規制の現場", "ja", "courtroom_manga"],
    ["channel-medical-ja", "medical-money-ja", "医療マネーの構造", "ja", "restrained_explainer"],
    ["channel-failure-ja", "failure-blueprint-ja", "失敗の設計図", "ja", "engineering_diagram_drama"],
    ["channel-whistle-en", "whistle-lines-en", "Whistle Lines", "en", "investigative_docudrama"],
    ["channel-breach-en", "breach-ledger-en", "Breach Ledger", "en", "animated_network_reconstruction"],
    ["channel-compliance-en", "compliance-casefiles-en", "Compliance Casefiles", "en", "courtroom_graphic_novel"],
    ["channel-collapse-en", "collapse-mechanics-en", "Collapse Mechanics", "en", "motion_infographic_documentary"],
    ["channel-fineprint-en", "fine-print-en", "The Fine Print", "en", "screenlife_investigation"],
    ["channel-ai-en", "ai-accountability-en", "AI Accountability Files", "en", "legal_evidence_drama"],
  ] as const;
  for (const channel of channels) {
    insertChannel.run(...channel, "incubating");
  }

  db.prepare("insert or ignore into cases (id,slug,subject,summary) values (?,?,?,?)").run(
    "case-enron",
    "enron",
    "Enron Corporation",
    "Primary-source pilot covering financial-reporting manipulation allegations, investigation, and convictions.",
  );

  const insertSource = db.prepare(
    "insert or ignore into sources (id,case_id,publisher,title,url,source_type,authority_tier,rights_note,retrieved_at) values (?,?,?,?,?,?,?,?,?)",
  );
  const retrievedAt = "2026-08-02T00:00:00.000Z";
  insertSource.run(
    "src-sec-skilling",
    "case-enron",
    "U.S. Securities and Exchange Commission",
    "Richard A. Causey and Jeffrey K. Skilling",
    "https://www.sec.gov/enforcement-litigation/litigation-releases/lr-18582",
    "enforcement_release",
    1,
    "Public U.S. government record; quote sparingly and retain attribution.",
    retrievedAt,
  );
  insertSource.run(
    "src-sec-complaint",
    "case-enron",
    "U.S. Securities and Exchange Commission",
    "Complaint: Jeffrey K. Skilling and Richard A. Causey",
    "https://www.sec.gov/litigation/complaints/comp18582.htm",
    "civil_complaint",
    1,
    "Allegations must remain labeled as allegations unless supported by a final judgment or conviction.",
    retrievedAt,
  );
  insertSource.run(
    "src-doj-skilling",
    "case-enron",
    "U.S. Department of Justice",
    "United States v. Jeffrey K. Skilling",
    "https://www.justice.gov/criminal/criminal-vns/case/united-states-v-jeffrey-k-skilling",
    "criminal_case_record",
    1,
    "Public U.S. government case record.",
    retrievedAt,
  );
  insertSource.run(
    "src-fbi-enron",
    "case-enron",
    "Federal Bureau of Investigation",
    "Enron",
    "https://www.fbi.gov/history/cases-and-criminals/enron",
    "agency_case_history",
    1,
    "Public U.S. government historical summary.",
    retrievedAt,
  );

  const insertEpisode = db.prepare(
    "insert or ignore into episodes (id,channel_id,case_id,title,language,status,risk_level,originality_note) values (?,?,?,?,?,?,?,?)",
  );
  insertEpisode.run(
    "episode-enron-ja",
    "channel-ledger-ja",
    "case-enron",
    "数字は完璧だった。現金以外は。",
    "ja",
    "storyboard",
    "medium",
    "一次資料の文言と会計操作の仕組みを、ドラマとEvidence Roomの往復で説明する。",
  );
  insertEpisode.run(
    "episode-enron-en",
    "channel-whistle-en",
    "case-enron",
    "The Numbers Looked Perfect. The Cash Did Not.",
    "en",
    "script",
    "medium",
    "Alternates noir reconstruction with a source-led evidence room; no fabricated quotations.",
  );

  const insertClaim = db.prepare(
    "insert or ignore into claims (id,episode_id,source_id,statement,status,locator,notes) values (?,?,?,?,?,?,?)",
  );
  insertClaim.run(
    "claim-ja-collapse",
    "episode-enron-ja",
    "src-fbi-enron",
    "エンロンは2001年12月に破産を申請した。",
    "confirmed",
    "FBI case history, opening and investigation sections",
    "Date is suitable for the on-screen timeline.",
  );
  insertClaim.run(
    "claim-ja-scheme",
    "episode-enron-ja",
    "src-sec-skilling",
    "SECは、経営陣らが公表財務結果を操作する広範な詐欺的計画に関与したと主張した。",
    "alleged",
    "SEC Litigation Release No. 18582",
    "Keep the attribution visible on screen.",
  );
  insertClaim.run(
    "claim-ja-conviction",
    "episode-enron-ja",
    "src-doj-skilling",
    "ジェフリー・スキリングは共謀、証券詐欺などで有罪となり、最終的に168か月の刑を受けた。",
    "confirmed",
    "DOJ case summary and resentencing notice",
    "Do not conflate the final sentence with the original sentence.",
  );
  insertClaim.run(
    "claim-ja-convictions",
    "episode-enron-ja",
    "src-fbi-enron",
    "FBIの事件史は、関連する不正行為で22人が有罪になったとしている。",
    "confirmed",
    "FBI case history, results section",
    "Attribute the count to the FBI page.",
  );

  insertClaim.run(
    "claim-en-collapse",
    "episode-enron-en",
    "src-fbi-enron",
    "Enron declared bankruptcy in December 2001.",
    "confirmed",
    "FBI case history, opening and investigation sections",
    "Use on the timeline.",
  );
  insertClaim.run(
    "claim-en-scheme",
    "episode-enron-en",
    "src-sec-skilling",
    "The SEC alleged a wide-ranging scheme to manipulate Enron's publicly reported financial results.",
    "alleged",
    "SEC Litigation Release No. 18582",
    "Keep alleged and SEC attribution visible.",
  );
  insertClaim.run(
    "claim-en-conviction",
    "episode-enron-en",
    "src-doj-skilling",
    "Jeffrey Skilling was convicted and ultimately resentenced to 168 months in prison.",
    "confirmed",
    "DOJ case summary and resentencing notice",
    "Distinguish final resentencing from the original sentence.",
  );

  const insertScene = db.prepare(
    "insert or ignore into scenes (id,episode_id,ordinal,scene_type,start_seconds,duration_seconds,narration,claim_ids_json,visual_brief) values (?,?,?,?,?,?,?,?,?)",
  );
  insertScene.run(
    "scene-ja-1",
    "episode-enron-ja",
    1,
    "drama",
    0,
    9,
    "数字は、完璧に見えた。だが帳簿の奥では、損失と借金の見え方が変えられていた。",
    "[]",
    "Dark ledger, redacted columns, no real-person likeness.",
  );
  insertScene.run(
    "scene-ja-2",
    "episode-enron-ja",
    2,
    "timeline",
    9,
    12,
    "二〇〇一年十二月、エンロンは破産を申請する。これは推測ではない。FBIの事件史に残る日付だ。",
    "[\"claim-ja-collapse\"]",
    "Timeline locks onto December 2001 with FBI attribution.",
  );
  insertScene.run(
    "scene-ja-3",
    "episode-enron-ja",
    3,
    "evidence_room",
    21,
    18,
    "SECの訴状は、準備金、事業セグメント、特別目的事業体などを通じて、公表数字が操作されたと主張した。ここは訴状上の主張だ。",
    "[\"claim-ja-scheme\"]",
    "Evidence Room: source card, status ALLEGED, mechanism diagram.",
  );
  insertScene.run(
    "scene-ja-4",
    "episode-enron-ja",
    4,
    "evidence_room",
    39,
    13,
    "一方、有罪判決は確定した記録だ。司法省によれば、スキリングは最終的に百六十八か月の刑を受けた。",
    "[\"claim-ja-conviction\",\"claim-ja-convictions\"]",
    "Evidence Room changes from alleged red to confirmed amber.",
  );
  insertScene.run(
    "scene-ja-5",
    "episode-enron-ja",
    5,
    "outro",
    52,
    8,
    "陰謀ではない。記録を追えば、数字がどう物語に変えられたかが見えてくる。",
    "[]",
    "Close on source manifest and human review stamp.",
  );

  db.prepare(
    "insert or ignore into production_jobs (id,episode_id,renderer,status,progress,review_gate) values (?,?,?,?,?,?)",
  ).run(
    "job-enron-ja-pilot",
    "episode-enron-ja",
    "hyperframes",
    "review_required",
    70,
    "factual_and_visual_review",
  );

  const insertAsset = db.prepare(`
    insert or ignore into distribution_assets (
      id,episode_id,parent_asset_id,platform,format,aspect_ratio,duration_seconds,
      editor,caption_mode,status,source_segments_json,edit_manifest_json
    ) values (?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  insertAsset.run(
    "asset-enron-ja-master",
    "episode-enron-ja",
    null,
    "youtube_watch",
    "longform",
    "16:9",
    900,
    "hyperframes",
    "sidecar",
    "planned",
    "[]",
    JSON.stringify({ role: "editorial_source_of_truth", targetMinutes: 15 }),
  );
  insertAsset.run(
    "asset-enron-ja-summary",
    "episode-enron-ja",
    "asset-enron-ja-master",
    "youtube_watch",
    "summary",
    "16:9",
    300,
    "opencut",
    "sidecar",
    "planned",
    JSON.stringify([
      { start: 0, end: 35, role: "hook" },
      { start: 210, end: 390, role: "mechanism" },
      { start: 690, end: 775, role: "outcome" },
    ]),
    JSON.stringify({ finalRenderer: "ffmpeg", preserveClaimAttribution: true }),
  );
  insertAsset.run(
    "asset-enron-ja-short",
    "episode-enron-ja",
    "asset-enron-ja-master",
    "youtube_shorts",
    "highlight",
    "9:16",
    60,
    "ffmpeg",
    "burned_in",
    "planned",
    JSON.stringify([{ start: 210, end: 270, role: "single_claim_explainer" }]),
    JSON.stringify({ recomposeGraphics: true, callToAction: "watch_master" }),
  );
  insertAsset.run(
    "asset-enron-ja-tiktok",
    "episode-enron-ja",
    "asset-enron-ja-master",
    "tiktok",
    "highlight",
    "9:16",
    75,
    "opencut",
    "burned_in",
    "planned",
    JSON.stringify([{ start: 205, end: 280, role: "mechanism_story" }]),
    JSON.stringify({ finalRenderer: "ffmpeg", platformSpecificHook: true }),
  );
  insertAsset.run(
    "asset-enron-ja-reel",
    "episode-enron-ja",
    "asset-enron-ja-master",
    "instagram_reels",
    "teaser",
    "9:16",
    45,
    "ffmpeg",
    "burned_in",
    "planned",
    JSON.stringify([{ start: 0, end: 45, role: "visual_teaser" }]),
    JSON.stringify({ recomposeGraphics: true, platformSpecificHook: true }),
  );
}

export function getDatabase(): DatabaseSync {
  if (globalDatabase.mediaOsDatabase) return globalDatabase.mediaOsDatabase;
  const path = databasePath();
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  const schemaPath = resolve(process.cwd(), "src", "lib", "media-os", "schema.sql");
  if (!existsSync(schemaPath)) throw new Error(`Media OS schema missing: ${schemaPath}`);
  db.exec(readFileSync(schemaPath, "utf8"));
  const creativePilotColumns = new Set(
    (db.prepare("pragma table_info(creative_pilots)").all() as Array<{ name: string }>).map((column) => column.name),
  );
  if (!creativePilotColumns.has("preview_ready")) {
    db.exec("alter table creative_pilots add column preview_ready integer not null default 0 check (preview_ready in (0,1))");
  }
  if (!creativePilotColumns.has("preview_path")) {
    db.exec("alter table creative_pilots add column preview_path text");
  }
  seedDatabase(db);
  globalDatabase.mediaOsDatabase = db;
  return db;
}
