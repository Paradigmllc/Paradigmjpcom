import { performMedusaDailyTask } from "@/lib/medusa-ops/daily";
import type { JobKind } from "./model";
export async function performDailyTask(kind: JobKind, cursor: string | null, actor: string) {
  if (!actor) throw new Error("操作主体が未確認です");
  return performMedusaDailyTask(kind, cursor);
}
