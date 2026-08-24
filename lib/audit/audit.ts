import { createClient } from "@/lib/supabase/server";

export type AuditEventInput = {
  organizationId: string;
  actorUserId: string;
  entityType: string;
  entityId: string;
  action: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
};

/**
 * Appends an immutable audit record (WHO/WHEN/WHAT/BEFORE/AFTER/ACTION,
 * per the PV+ audit requirement). The `audit_events` table grants INSERT
 * only to the application role — no UPDATE/DELETE — so this function is
 * the sole, one-directional path into the audit trail.
 */
export async function writeAuditEvent(event: AuditEventInput): Promise<void> {
  const supabase = createClient();

  await supabase.from("audit_events").insert({
    organization_id: event.organizationId,
    actor_user_id: event.actorUserId,
    entity_type: event.entityType,
    entity_id: event.entityId,
    action: event.action,
    before: event.before ?? null,
    after: event.after ?? null,
    reason: event.reason ?? null,
  });
}
