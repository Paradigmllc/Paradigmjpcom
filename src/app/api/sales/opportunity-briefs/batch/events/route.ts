import { RealtimeClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { isSalesApiAuthorized } from "@/lib/sales/api-auth";
import { DB_TABLES } from "@/lib/sales/db-tables";
import {
  getSalesSupabaseConfig,
  getServiceSalesSupabase,
} from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface JobEventRow {
  id?: string;
  job_type?: string | null;
  updated_at?: string | null;
}

interface JobChangePayload {
  new?: JobEventRow | null;
  old?: JobEventRow | null;
}

function optionalEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : null;
}

function realtimeUrl(restUrl: string): string {
  const explicit =
    optionalEnv("SALES_SUPABASE_REALTIME_URL") ??
    optionalEnv("NEXT_PUBLIC_SUPABASE_REALTIME_URL");
  if (explicit) {
    const base = explicit.replace(/\/+$/, "");
    return base.endsWith("/realtime/v1") ? base : `${base}/realtime/v1`;
  }
  const parsed = new URL(restUrl);
  if (/^supabase-rest-1$/i.test(parsed.hostname))
    return "http://supabase-realtime:4000/realtime/v1";
  parsed.pathname = "/realtime/v1";
  parsed.search = "";
  parsed.hash = "";
  parsed.protocol = parsed.protocol.replace(/^ws/i, "http");
  return parsed.toString();
}

const selectFields =
  "id, company_id, job_type, status, attempts, max_attempts, next_run_at, error_message, result_payload, updated_at, created_at, sales_companies(company_name, domain)";

export async function GET(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }
  const sb = getServiceSalesSupabase();
  const config = getSalesSupabaseConfig();
  if (!sb || !config)
    return NextResponse.json(
      { ok: false, error: "Sales Supabase not configured" },
      { status: 503 },
    );

  const encoder = new TextEncoder();
  let closed = false;
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        if (!closed)
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );
      };
      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch (error) {
          console.warn("[opportunity-report-events] close failed:", error);
        }
      };

      const snapshot = await sb
        .from(DB_TABLES.SALES_ENRICHMENT_JOBS)
        .select(selectFields)
        .eq("job_type", "japan_entry_report")
        .order("updated_at", { ascending: false })
        .limit(100);
      if (snapshot.error) {
        console.error(
          "[opportunity-report-events] snapshot failed:",
          snapshot.error.message,
        );
        send({
          type: "error",
          message: snapshot.error.message,
          jobs: [],
          at: new Date().toISOString(),
        });
      } else {
        send({
          type: "snapshot",
          jobs: snapshot.data ?? [],
          at: new Date().toISOString(),
        });
      }

      const realtime = new RealtimeClient(realtimeUrl(config.url), {
        params: { apikey: config.serviceKey },
        headers: {
          apikey: config.serviceKey,
          Authorization: `Bearer ${config.serviceKey}`,
        },
      });
      const channel = realtime
        .channel("japan-entry-report-job-events")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: DB_TABLES.SALES_ENRICHMENT_JOBS,
          },
          async (payload: JobChangePayload) => {
            const changed = payload.new ?? payload.old;
            if (
              closed ||
              changed?.job_type !== "japan_entry_report" ||
              !changed.id
            )
              return;
            const fresh = await sb
              .from(DB_TABLES.SALES_ENRICHMENT_JOBS)
              .select(selectFields)
              .eq("id", changed.id)
              .maybeSingle();
            if (fresh.error) {
              console.warn(
                "[opportunity-report-events] refresh failed:",
                fresh.error.message,
              );
              send({
                type: "warning",
                message: fresh.error.message,
                at: new Date().toISOString(),
              });
              return;
            }
            send({
              type: "update",
              jobs: fresh.data ? [fresh.data] : [],
              at: new Date().toISOString(),
            });
          },
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.warn(
              "[opportunity-report-events] realtime status:",
              status,
            );
            send({
              type: "warning",
              message: `Realtime channel status: ${status}`,
              at: new Date().toISOString(),
            });
          }
        });

      req.signal.addEventListener("abort", async () => {
        close();
        try {
          await realtime.removeChannel(channel);
          await realtime.disconnect();
        } catch (error) {
          console.warn("[opportunity-report-events] cleanup failed:", error);
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
