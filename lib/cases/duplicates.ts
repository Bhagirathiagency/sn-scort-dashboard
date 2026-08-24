import { createClient } from "@/lib/supabase/server";
import { writeAuditEvent } from "@/lib/audit/audit";
import type { DuplicateCandidate, DuplicateCandidateStatus } from "@/lib/cases/types";

/**
 * Rule-based duplicate detection (§9). Never merges cases automatically —
 * this only (re)computes scored candidates; a qualified user decides via
 * reviewDuplicateCandidate(). Re-running detection never overwrites an
 * existing human decision (enforced in the SQL function itself).
 */
export async function runDuplicateDetection(organizationId: string, caseId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("compute_duplicate_candidates", { p_case_id: caseId });
  if (error) throw new Error(`Failed to run duplicate detection: ${error.message}`);
}

export async function listDuplicateCandidates(
  organizationId: string,
  caseId: string
): Promise<DuplicateCandidate[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("case_duplicate_candidates")
    .select(
      `id, similarity_score, matching_fields, status, reviewed_at,
       candidate_case:cases!case_duplicate_candidates_candidate_case_id_fkey(id, case_number, status)`
    )
    .eq("organization_id", organizationId)
    .eq("case_id", caseId)
    .order("similarity_score", { ascending: false });

  if (error) throw new Error(`Failed to load duplicate candidates: ${error.message}`);
  return (data as unknown as DuplicateCandidate[]) ?? [];
}

export async function reviewDuplicateCandidate(
  organizationId: string,
  actorUserId: string,
  candidateId: string,
  decision: Extract<DuplicateCandidateStatus, "confirmed_duplicate" | "not_duplicate">
): Promise<void> {
  const supabase = createClient();

  const { data: updated, error } = await supabase
    .from("case_duplicate_candidates")
    .update({ status: decision, reviewed_by: actorUserId, reviewed_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("id", candidateId)
    .eq("status", "pending")
    .select("case_id, candidate_case_id")
    .single();

  if (error || !updated) {
    throw new Error("Candidate not found or already reviewed");
  }

  await writeAuditEvent({
    organizationId,
    actorUserId,
    entityType: "case_duplicate_candidate",
    entityId: candidateId,
    action: decision === "confirmed_duplicate" ? "duplicate_confirmed" : "duplicate_rejected",
    after: { case_id: updated.case_id, candidate_case_id: updated.candidate_case_id, status: decision },
  });
}
