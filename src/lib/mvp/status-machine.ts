/**
 * MVP outreach status machine — B36 #19.
 * 不正な transition は throw する.
 */

export type RunStatus =
  | "queued"
  | "report_generating" | "report_url_verifying" | "report_ready"
  | "form_message_generating" | "form_violation_check"
  | "form_pending_approval" | "form_submitting"
  | "sent" | "replied"
  | "failed_report" | "failed_form_url" | "failed_violation"
  | "failed_submit" | "dead_letter" | "skipped";

const ALLOWED: Record<RunStatus, RunStatus[]> = {
  queued: ["report_generating", "skipped"],
  report_generating: ["report_url_verifying", "failed_report"],
  report_url_verifying: ["report_ready", "failed_report"],
  report_ready: ["form_message_generating", "skipped"],
  form_message_generating: ["form_violation_check", "failed_violation"],
  form_violation_check: ["form_submitting", "form_pending_approval", "failed_violation"],
  form_pending_approval: ["form_submitting", "skipped"],
  form_submitting: ["sent", "failed_submit"],
  sent: ["replied"],
  replied: [],
  failed_report: ["queued", "dead_letter"],
  failed_form_url: ["queued", "dead_letter"],
  failed_violation: ["dead_letter", "skipped"],
  failed_submit: ["queued", "dead_letter"],
  dead_letter: [],
  skipped: [],
};

export function canTransition(from: RunStatus, to: RunStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export function assertTransition(from: RunStatus, to: RunStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`[status-machine] invalid transition: ${from} → ${to}`);
  }
}

export function isTerminal(s: RunStatus): boolean {
  return s === "replied" || s === "dead_letter" || s === "skipped";
}
