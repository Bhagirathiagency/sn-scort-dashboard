import { createClient } from "@/lib/supabase/server";
import { writeAuditEvent } from "@/lib/audit/audit";
import { transitionCaseStatus } from "@/lib/cases/service";
import type { CaseReview, ReviewDecision, ReviewStage } from "@/lib/cases/types";

/**
 * A review decision ties directly to the existing status-transition graph
 * (lib/cases/workflow.ts) rather than writing case status here — this
 * table is the review record, never the source of truth for where a case
 * stands. "approved" advances the case to the next stage; "returned"
 * sends it back to Processing for rework; "comment" leaves status alone.
 */
const NEXT_STATUS: Record<ReviewStage, { approved: string; returned: string }> = {
  medical_review: { approved: "qc", returned: "processing" },
  qc: { approved: "submission_ready", returned: "processing" },
};

export async function listCaseReviews(organizationId: string, caseId: string): Promise<CaseReview[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("case_reviews")
    .select("id, stage, decision, comment, created_at, reviewer:users(email, full_name)")
    .eq("organization_id", organizationId)
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load reviews: ${error.message}`);
  return (data as unknown as CaseReview[]) ?? [];
}

export async function submitCaseReview(
  organizationId: string,
  actorUserId: string,
  caseId: string,
  stage: ReviewStage,
  decision: ReviewDecision,
  comment: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("case_reviews").insert({
    organization_id: organizationId,
    case_id: caseId,
    stage,
    reviewer_id: actorUserId,
    decision,
    comment: comment || null,
  });

  if (error) throw new Error(`Failed to record review: ${error.message}`);

  await writeAuditEvent({
    organizationId,
    actorUserId,
    entityType: "case",
    entityId: caseId,
    action: "case_review_submitted",
    after: { stage, decision },
    reason: comment || undefined,
  });

  if (decision === "approved" || decision === "returned") {
    const toStatus = NEXT_STATUS[stage][decision] as Parameters<typeof transitionCaseStatus>[3];
    await transitionCaseStatus(organizationId, actorUserId, caseId, toStatus, comment || undefined);
  }
}
