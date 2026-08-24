import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/rbac";
import { transitionCaseStatus } from "@/lib/cases/service";
import { TRANSITION_PERMISSION } from "@/lib/cases/workflow";
import type { CaseStatus } from "@/lib/cases/types";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user || !user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { status?: CaseStatus; reason?: string };
  const toStatus = body.status;

  if (!toStatus || !(toStatus in TRANSITION_PERMISSION)) {
    return NextResponse.json({ error: "A valid target status is required" }, { status: 400 });
  }

  try {
    await requirePermission(user.id, user.organizationId, TRANSITION_PERMISSION[toStatus]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await transitionCaseStatus(
      user.organizationId,
      user.id,
      params.id,
      toStatus,
      body.reason
    );
    return NextResponse.json({ data: result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update case status" },
      { status: 400 }
    );
  }
}
