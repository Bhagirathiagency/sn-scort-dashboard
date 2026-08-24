import type { CaseStatus } from "@/lib/cases/types";

export const STATUS_LABEL: Record<CaseStatus, string> = {
  new: "New",
  validation: "Validation",
  triage: "Triage",
  processing: "Processing",
  medical_review: "Medical Review",
  qc: "QC",
  submission_ready: "Submission Ready",
  submitted: "Submitted",
  follow_up: "Follow-up",
  closed: "Closed",
  reopened: "Reopened",
};
