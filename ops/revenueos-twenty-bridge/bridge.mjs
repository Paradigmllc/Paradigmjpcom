/**
 * revenueos-twenty-bridge — RevenueOS ⇄ Twenty 双方向同期の「イベント駆動」化。
 *
 * 旧: 60秒ごとの systemd timer が pull(100件) + writeback(3件) を叩いていた (定期実行=負荷/メンテ増)。
 * 新: 実イベントが起きた時だけ動く。ポーリングなし。
 *
 *   ① writeback (RevenueOS→Twenty): Supabase の sales_companies が pipeline_status='report_ready' に
 *      遷移した瞬間、Postgres trigger が pg_notify('twenty_writeback', <id>) を撃つ。本ブリッジは
 *      その通知で起床し、per-company writeback endpoint を叩く。LISTEN はカーネル起床=待機中CPU 0。
 *   ② pull (Twenty→RevenueOS): Twenty の native webhook が本ブリッジ HTTP に飛んでくる。ブリッジは
 *      正しい x-webhook-secret を付けて RevenueOS の pull 受信口へ転送 (Twenty の HMAC 方式と
 *      受信口の平文シークレット方式の差を吸収する変換層)。連続編集は debounce で 1 回の pull に束ねる。
 *   ③ 起動時に一度だけ reconcile: 取りこぼし救済 (未同期の report_ready を writeback + 1 回 pull)。
 *      これは「起動イベント」時の 1 回のみで、定期実行ではない。
 *
 * 握りつぶし禁止 (catch は必ず log + 失敗継続時 Slack 通知)。値のハードコードなし (全部 env)。
 */
import http from "node:http";
import pg from "pg";

const ENV = (k, d) => {
  const v = process.env[k];
  if (v === undefined || v === "") {
    if (d === undefined) { console.error(JSON.stringify({ level: "fatal", msg: `missing env ${k}` })); process.exit(1); }
    return d;
  }
  return v;
};

// DB 接続は pg が PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE を自動で読む (URL エンコード不要)。
const REVENUEOS_URL = ENV("REVENUEOS_URL").replace(/\/$/, ""); // https://paradigmjp.com (Coolify のコンテナ名 suffix は再デプロイで変わるので公開URLで固定)
const WEBHOOK_SECRET = ENV("WEBHOOK_SECRET");             // == RevenueOS TRIGGER_WEBHOOK_SECRET
const PULL_TOKEN = ENV("PULL_TOKEN");                     // Twenty webhook URL のパス token (内部網の共有秘密)
const PORT = Number(ENV("PORT", "8791"));
const DEBOUNCE_MS = Number(ENV("PULL_DEBOUNCE_MS", "8000"));
const PULL_LIMIT = Number(ENV("PULL_LIMIT", "200"));
const SLACK_WEBHOOK = ENV("SLACK_WEBHOOK_URL", "");       // 任意
const HTTP_TIMEOUT_MS = 90_000;

const log = (level, msg, extra = {}) => console.log(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...extra }));

let consecutiveFailures = 0;
async function alertSlack(text) {
  if (!SLACK_WEBHOOK) return;
  try {
    await fetch(SLACK_WEBHOOK, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: `:twisted_rightwards_arrows: *twenty-bridge* ${text}` }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) { log("error", "slack alert failed", { error: String(error?.message ?? error) }); }
}

async function callRevenueOS(path, body) {
  const url = `${REVENUEOS_URL}${path}`;
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-webhook-secret": WEBHOOK_SECRET },
      body: JSON.stringify(body ?? {}),
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    });
  } catch (error) {
    consecutiveFailures++;
    log("error", "revenueos call threw", { path, error: String(error?.message ?? error), consecutiveFailures });
    if (consecutiveFailures === 3) await alertSlack(`RevenueOS への呼び出しが3回連続失敗 (${path}): ${String(error?.message ?? error)}`);
    return { ok: false, error: String(error?.message ?? error) };
  }
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch { /* 非JSONはそのまま */ }
  if (!res.ok) {
    consecutiveFailures++;
    log("error", "revenueos call non-2xx", { path, status: res.status, body: text.slice(0, 300), consecutiveFailures });
    if (consecutiveFailures === 3) await alertSlack(`RevenueOS 呼び出しが3回連続失敗 (${path}) HTTP ${res.status}`);
    return { ok: false, status: res.status, json };
  }
  consecutiveFailures = 0;
  return { ok: true, status: res.status, json };
}

// --- ① writeback: Supabase LISTEN → per-company sync ---
async function doWriteback(companyId) {
  if (!companyId) return;
  log("info", "writeback fired", { companyId });
  const r = await callRevenueOS(`/api/sales/companies/${encodeURIComponent(companyId)}/twenty-sync`, {});
  log(r.ok ? "info" : "warn", "writeback done", { companyId, ok: r.ok, status: r.status, result: r.json ?? undefined });
}

// --- ② pull: Twenty native webhook (debounced) → RevenueOS pull ---
let pullTimer = null, pullPending = false;
function schedulePull(reason) {
  pullPending = true;
  if (pullTimer) return;                       // 既に待機窓が開いている → 束ねる
  pullTimer = setTimeout(async () => {
    pullTimer = null; pullPending = false;
    log("info", "pull fired", { reason });
    const r = await callRevenueOS(`/api/sales/twenty/webhook`, { limit: PULL_LIMIT, dispatch_pipeline: true });
    log(r.ok ? "info" : "warn", "pull done", { ok: r.ok, status: r.status,
      result: r.json ? { created: r.json?.result?.created, updated: r.json?.result?.updated } : undefined });
    if (pullPending) schedulePull("coalesced-followup"); // 窓中に来た分を1回だけ追い焚き
  }, DEBOUNCE_MS);
}

// --- ③ 起動時 reconcile (1回のみ・定期ではない) ---
async function reconcile(sql) {
  log("info", "reconcile start (startup only)");
  await callRevenueOS(`/api/sales/twenty/webhook`, { limit: PULL_LIMIT, dispatch_pipeline: true });
  const { rows } = await sql.query(
    `SELECT id FROM sales_companies WHERE pipeline_status = 'report_ready' ORDER BY updated_at DESC NULLS LAST LIMIT 50`,
  );
  log("info", "reconcile writeback backlog", { count: rows.length });
  for (const row of rows) { await doWriteback(row.id); }      // 直列 = Twenty のレート制限に優しい
  log("info", "reconcile done");
}

// --- 汎用 LISTEN (再接続付き・イベント駆動・複数DB対応) ---
// Supabase(writeback) と Twenty(pull) の2つのDBを、同じ仕組みで待受ける。
// どちらもポーリングではなくカーネル起床 (pg NOTIFY)。
function makeListener({ label, config, channel, onNotify, onConnect }) {
  let backoff = 1000, reconnecting = false;
  async function connect() {
    const client = new pg.Client({ ...config, application_name: "twenty-bridge" });
    client.on("error", (error) => log("error", "pg client error", { label, error: String(error?.message ?? error) }));
    client.on("notification", (n) => {
      if (n.channel === channel) {
        Promise.resolve(onNotify((n.payload ?? "").trim())).catch((e) => log("error", "notify handler threw", { label, error: String(e?.message ?? e) }));
      }
    });
    client.on("end", () => { log("warn", "pg connection ended → reconnect", { label, backoff }); scheduleReconnect(); });
    await client.connect();
    await client.query(`LISTEN ${channel}`);
    backoff = 1000;
    log("info", `listening on ${channel}`, { label });
    if (onConnect) onConnect(client).catch((e) => log("error", "onConnect threw", { label, error: String(e?.message ?? e) }));
    return client;
  }
  function scheduleReconnect() {
    if (reconnecting) return; reconnecting = true;
    setTimeout(async () => {
      reconnecting = false;
      try { await connect(); }
      catch (error) {
        backoff = Math.min(backoff * 2, 60_000);
        log("error", "reconnect failed", { label, error: String(error?.message ?? error), nextBackoff: backoff });
        if (backoff >= 60_000) await alertSlack(`${label} の LISTEN 再接続に失敗し続けています: ${String(error?.message ?? error)}`);
        scheduleReconnect();
      }
    }, backoff);
  }
  return { start: () => connect().catch((error) => { log("error", "initial connect failed", { label, error: String(error?.message ?? error) }); scheduleReconnect(); }) };
}

// --- HTTP: Twenty native webhook 受け口 + health ---
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, consecutiveFailures, pullPending, listening: true }));
    return;
  }
  if (req.method === "POST" && url.pathname === `/pull/${PULL_TOKEN}`) {
    let body = ""; req.on("data", (c) => { body += c; if (body.length > 1_000_000) req.destroy(); });
    req.on("end", () => {
      let op = "unknown"; try { const j = JSON.parse(body || "{}"); op = j?.eventName ?? j?.operation ?? j?.record?.__typename ?? "twenty-event"; } catch { /* Twenty のペイロード形式は問わない */ }
      schedulePull(`twenty-webhook:${op}`);
      res.writeHead(202, { "content-type": "application/json" }); res.end(JSON.stringify({ ok: true, scheduled: true }));
    });
    return;
  }
  res.writeHead(404, { "content-type": "application/json" }); res.end(JSON.stringify({ ok: false, error: "not found" }));
});
server.listen(PORT, () => log("info", "http up", { port: PORT }));

process.on("SIGTERM", () => { log("info", "SIGTERM → shutdown"); server.close(); process.exit(0); });
process.on("unhandledRejection", (error) => log("error", "unhandledRejection", { error: String(error?.message ?? error) }));

// ① writeback: Supabase (PG* env) の twenty_writeback を待受 + 起動時 reconcile
makeListener({
  label: "supabase",
  config: {}, // pg が PG* env を自動使用
  channel: "twenty_writeback",
  onNotify: (payload) => doWriteback(payload),
  onConnect: (client) => reconcile(client),
}).start();

// ② pull: Twenty DB (TWENTY_PG* env) の twenty_pull を待受 (会社の追加/編集で発火)
if (process.env.TWENTY_PGHOST) {
  makeListener({
    label: "twenty",
    config: {
      host: process.env.TWENTY_PGHOST, port: Number(process.env.TWENTY_PGPORT ?? 5432),
      user: process.env.TWENTY_PGUSER, password: process.env.TWENTY_PGPASSWORD, database: process.env.TWENTY_PGDATABASE,
    },
    channel: "twenty_pull",
    onNotify: (payload) => { schedulePull(`twenty-db:${payload || "company-change"}`); },
  }).start();
} else {
  log("warn", "TWENTY_PGHOST 未設定 → pull は HTTP /pull 受信のみ");
}
