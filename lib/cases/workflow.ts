import type { CaseStatus } from "@/lib/cases/types";
import type { Permission } from "@/lib/auth/rbac";

/**
 * Case lifecycle per the product spec §7:
 *   New -> Validation -> Triage -> Processing -> Medical Review -> QC
 *   -> Submission Ready -> Submitted -> Follow-up -> Closed -> Reopened
 * Medical Review, QC, and Submission Ready can each send a case back to
 * Processing for rework rather than only advancing forward.
 */
export const ALLOWED_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  new: ["validation"],
  validation: ["triage"],
  triage: ["processing"],
  processing: ["medical_review"],
  medical_review: ["qc", "processing"],
  qc: ["submission_ready", "processing"],
  submission_ready: ["submitted", "processing"],
  submitted: ["follow_up", "closed"],
  follow_up: ["processing", "closed"],
  closed: ["reopened"],
  reopened: ["processing"],
};

/** The permission a caller must hold to move a case INTO this status. */
export const TRANSITION_PERMISSION: Record<CaseStatus, Permission> = {
  new: "case:edit",
  validation: "case:edit",
  triage: "case:edit",
  processing: "case:edit",
  medical_review: "case:edit",
  qc: "case:approve",
  submission_ready: "case:approve",
  submitted: "submission:submit",
  follow_up: "case:edit",
  closed: "case:close",
  reopened: "case:reopen",
};

export function isTransitionAllowed(from: CaseStatus, to: CaseStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
