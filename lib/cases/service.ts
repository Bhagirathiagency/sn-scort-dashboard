import { createClient } from "@/lib/supabase/server";
import { writeAuditEvent } from "@/lib/audit/audit";
import { isTransitionAllowed } from "@/lib/cases/workflow";
import type { CaseDetail, CaseListItem, CaseStatus, CreateCaseInput } from "@/lib/cases/types";

/**
 * All functions here assume the caller has already passed the relevant
 * RBAC check (lib/auth/rbac.ts) — this module only handles data access.
 * RLS is still the tenant-isolation backstop underneath every query.
 */

export async function listCases(organizationId: string): Promise<CaseListItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("cases")
    .select("id, case_number, status, priority, source, country, receipt_date, is_serious, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list cases: ${error.message}`);
  return data ?? [];
}

export async function getCaseDetail(
  organizationId: string,
  caseId: string
): Promise<CaseDetail | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("cases")
    .select(
      `id, case_number, status, priority, source, country, receipt_date, is_serious,
       initial_awareness_date, reporting_category, narrative, version, created_at,
       patient:patients(initials, age, age_group, sex),
       reporter:reporters(reporter_type, is_healthcare_professional, country),
       case_products(role, dose, route, indication, product:products(product_name, active_substance)),
       case_events(verbatim_term, meddra_term, onset_date, outcome, severity)`
    )
    .eq("organization_id", organizationId)
    .eq("id", caseId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load case: ${error.message}`);
  return (data as unknown as CaseDetail) ?? null;
}

export async function createCase(
  organizationId: string,
  actorUserId: string,
  input: CreateCaseInput
): Promise<{ id: string; caseNumber: string }> {
  const supabase = createClient();

  const { data: caseId, error } = await supabase.rpc("create_case", {
    p_organization_id: organizationId,
    p_created_by: actorUserId,
    p_source: input.source,
    p_country: input.country,
    p_receipt_date: input.receiptDate,
    p_priority: input.priority,
    p_is_serious: input.isSerious,
    p_narrative: input.narrative,
    p_patient: {
      initials: input.patient.initials,
      age: input.patient.age,
      age_group: input.patient.ageGroup,
      sex: input.patient.sex,
    },
    p_reporter: {
      reporter_type: input.reporter.reporterType,
      is_healthcare_professional: input.reporter.isHealthcareProfessional,
      country: input.reporter.country,
    },
    p_product: {
      product_name: input.product.productName,
      active_substance: input.product.activeSubstance,
      dose: input.product.dose,
      route: input.product.route,
      indication: input.product.indication,
    },
    p_event: {
      verbatim_term: input.event.verbatimTerm,
      onset_date: input.event.onsetDate,
      outcome: input.event.outcome,
      severity: input.event.severity,
    },
  });

  if (error || !caseId) {
    throw new Error(`Failed to create case: ${error?.message ?? "unknown error"}`);
  }

  const { data: created } = await supabase
    .from("cases")
    .select("case_number")
    .eq("id", caseId)
    .single();

  await writeAuditEvent({
    organizationId,
    actorUserId,
    entityType: "case",
    entityId: caseId as string,
    action: "case_created",
    after: { case_number: created?.case_number, status: "new" },
  });

  return { id: caseId as string, caseNumber: created?.case_number ?? "" };
}

export async function transitionCaseStatus(
  organizationId: string,
  actorUserId: string,
  caseId: string,
  toStatus: CaseStatus,
  reason?: string
): Promise<{ status: CaseStatus; version: number }> {
  const supabase = createClient();

  const { data: current, error: fetchError } = await supabase
    .from("cases")
    .select("status")
    .eq("organization_id", organizationId)
    .eq("id", caseId)
    .single();

  if (fetchError || !current) {
    throw new Error("Case not found");
  }

  const fromStatus = current.status as CaseStatus;

  if (!isTransitionAllowed(fromStatus, toStatus)) {
    throw new Error(`Cannot move a case from "${fromStatus}" to "${toStatus}"`);
  }

  // Guard against a lost update if another transition happened concurrently.
  const { data: updated, error: updateError } = await supabase
    .from("cases")
    .update({ status: toStatus, updated_by: actorUserId })
    .eq("organization_id", organizationId)
    .eq("id", caseId)
    .eq("status", fromStatus)
    .select("status, version")
    .single();

  if (updateError || !updated) {
    throw new Error("Case status changed concurrently — reload and try again");
  }

  await writeAuditEvent({
    organizationId,
    actorUserId,
    entityType: "case",
    entityId: caseId,
    action: "case_status_changed",
    before: { status: fromStatus },
    after: { status: toStatus },
    reason,
  });

  return { status: updated.status as CaseStatus, version: updated.version };
}
