import { RealtimeClient } from "@supabase/supabase-js";
import { authorizePayloadAdminRequest } from "@/lib/admin-auth";
import { getSalesSupabaseConfig } from "@/lib/supabase";
import { readChanges } from "@/lib/medusa-ops/events";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const auth = await authorizePayloadAdminRequest({ headers: request.headers });
  if (!auth.ok || !auth.userId || !["admin", "editor"].includes(auth.userRole ?? "")) return new Response("Unauthorized", { status: 401 });
  const config = getSalesSupabaseConfig();
  if (!config) return new Response("Not configured", { status: 503 });
  const explicit = process.env.SALES_SUPABASE_REALTIME_URL ?? process.env.NEXT_PUBLIC_SUPABASE_REALTIME_URL;
  const url = new URL(explicit ?? config.url);
  if (!explicit && url.hostname === "supabase-rest-1") { url.hostname = "supabase-realtime"; url.port = "4000"; }
  url.pathname = "/realtime/v1"; url.search = ""; url.hash = "";
  const realtime = new RealtimeClient(url.toString(), { params: { apikey: config.serviceKey }, headers: { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}` } });
  let close = () => {};
  const stream = new ReadableStream({
    start(controller) {
      let closed = false, refreshing = false, pending = false;
      const encoder = new TextEncoder();
      const send = (data: unknown) => { if (!closed) controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); };
      const refresh = async () => {
        if (closed) return;
        if (refreshing) { pending = true; return; }
        refreshing = true;
        try { send({ type: "changes", rows: await readChanges() }); }
        catch { console.error("[medusa-stream] history unavailable"); send({ type: "error", message: "更新履歴を取得できません" }); }
        finally { refreshing = false; if (pending) { pending = false; void refresh(); } }
      };
      const channel = realtime.channel(`medusa-ops-${crypto.randomUUID()}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "sericia_medusa_events" }, () => { void refresh(); });
      const heartbeat = setInterval(() => { if (!closed) controller.enqueue(encoder.encode(": keepalive\n\n")); }, 20_000);
      // End each stream so reconnects re-check the current user's permissions.
      const expiry = setTimeout(() => { send({ type: "reconnect" }); close(); }, 240_000);
      close = () => {
        if (closed) return;
        closed = true; clearInterval(heartbeat); clearTimeout(expiry);
        request.signal.removeEventListener("abort", close);
        void realtime.removeChannel(channel).then(() => realtime.disconnect()).catch(() => console.error("[medusa-stream] cleanup failed"));
        try { controller.close(); } catch { console.warn("[medusa-stream] already closed"); }
      };
      request.signal.addEventListener("abort", close, { once: true });
      if (request.signal.aborted) { close(); return; }
      channel.subscribe(status => {
        if (status === "SUBSCRIBED") { send({ type: "connected" }); void refresh(); }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          console.error("[medusa-stream] realtime disconnected"); send({ type: "error", message: "自動更新が切断されました。再接続してください" }); close();
        }
      });
    },
    cancel() { close(); },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "private, no-store", "X-Accel-Buffering": "no" } });
}
