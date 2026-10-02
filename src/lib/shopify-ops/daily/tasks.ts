import { reconcileProducts } from "../operations/reconcile";
import { reconcileOrders } from "../operations/reconcile-orders";
import { reconcileInventory } from "../operations/reconcile-inventory";
import { refreshAllSupplierSources } from "../supplier-service";
import { runDailySocialPipeline } from "../social-pipeline";
import type { JobKind } from "./model";
export async function performDailyTask(
  kind: JobKind,
  cursor: string | null,
  actor: string,
) {
  if (kind === "suppliers") {
    const observations = await refreshAllSupplierSources(actor);
    const uncertain = observations.filter(
      (r) => r.state === "unknown" || r.state === "blocked",
    ).length;
    return {
      state: uncertain ? "blocked" : "succeeded",
      cursor: null,
      summary: { checked: observations.length, uncertain },
      message: uncertain ? `${uncertain}件の仕入先情報は未確認です` : null,
    } as const;
  }
  if (kind === "social") {
    const run = await runDailySocialPipeline();
    return {
      state:
        run.status === "succeeded"
          ? "succeeded"
          : run.status === "failed"
            ? "failed"
            : "blocked",
      cursor: null,
      summary: {
        generated: run.generatedPostCount,
        published: run.publishedPostCount,
        failed: run.failedPostCount,
      },
      message: run.blockedReason,
    } as const;
  }
  const reconcile =
    kind === "products"
      ? reconcileProducts
      : kind === "orders"
        ? reconcileOrders
        : reconcileInventory;
  let next = cursor,
    count = 0;
  for (let page = 0; page < 5; page++) {
    const result = await reconcile(next, actor);
    count += result.count;
    next = result.cursor;
    if (!next) break;
  }
  return {
    state: "succeeded",
    cursor: next,
    summary: { processed: count, cycleComplete: !next },
    message: null,
  } as const;
}
