import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/rbac";
import { reviewDuplicateCandidate } from "@/lib/cases/duplicates";
import type { DuplicateCandidateStatus } from "@/lib/cases/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { candidateId: string } }
) {
  const user = await getSessionUser();
  if (!user || !user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await requirePermission(user.id, user.organizationId, "case_duplicate:review");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { decision?: DuplicateCandidateStatus };

  if (body.decision !== "confirmed_duplicate" && body.decision !== "not_duplicate") {
    return NextResponse.json(
      { error: "decision must be confirmed_duplicate or not_duplicate" },
      { status: 400 }
    );
  }

  try {
    await reviewDuplicateCandidate(user.organizationId, user.id, params.candidateId, body.decision);
    return NextResponse.json({ data: { status: body.decision } });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to review candidate" },
      { status: 400 }
    );
  }
}
