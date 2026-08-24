import { createClient } from "@/lib/supabase/server";
import { writeAuditEvent } from "@/lib/audit/audit";

/**
 * Permission strings are "resource:action", e.g. "case:approve",
 * "submission:submit", "regulatory_rules:configure". They are stored as
 * data (permissions/role_permissions/user_roles tables) rather than a
 * hard-coded enum so new roles can be introduced without a deploy.
 */
export type Permission = `${string}:${string}`;

/**
 * Checks whether the current session user holds `permission` within their
 * own organization (tenant). Every check is written to the audit trail so
 * denied attempts are traceable, not just successful ones.
 */
export async function can(
  userId: string,
  organizationId: string,
  permission: Permission
): Promise<boolean> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("user_has_permission", {
    p_user_id: userId,
    p_organization_id: organizationId,
    p_permission: permission,
  });

  const granted = !error && data === true;

  await writeAuditEvent({
    organizationId,
    actorUserId: userId,
    entityType: "permission_check",
    entityId: permission,
    action: granted ? "permission_granted" : "permission_denied",
  });

  return granted;
}

/**
 * Throws if the permission is not held. Use in Route Handlers/Server
 * Actions to fail closed.
 */
export async function requirePermission(
  userId: string,
  organizationId: string,
  permission: Permission
): Promise<void> {
  const allowed = await can(userId, organizationId, permission);
  if (!allowed) {
    throw new Error(`Forbidden: missing permission "${permission}"`);
  }
}
