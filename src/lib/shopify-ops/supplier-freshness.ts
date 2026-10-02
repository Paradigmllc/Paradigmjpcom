import type { SupplierObservation } from "./supplier-observation";

export function observedAvailability(
  observation: SupplierObservation | null,
  now = Date.now(),
): "available" | "sold_out" | "unknown" | "blocked" | "stale" {
  if (!observation) return "unknown";
  const age = now - Date.parse(observation.checkedAt);
  if (!Number.isFinite(age) || age < 0 || age > 30 * 60_000) return "stale";
  return observation.state;
}
