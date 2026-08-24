import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/rbac";
import { listCaseReviews, submitCaseReview } from "@/lib/cases/reviews";
import type { ReviewDecision, ReviewStage } from "@/lib/cases/types";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user || !user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await requirePermission(user.id, user.organizationId, "case:view");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const reviews = await listCaseReviews(user.organizationId, params.id);
  return NextResponse.json({ data: reviews });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user || !user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    stage?: ReviewStage;
    decision?: ReviewDecision;
    comment?: string;
  };

  if (
    (body.stage !== "medical_review" && body.stage !== "qc") ||
    !["approved", "returned", "comment"].includes(body.decision ?? "")
  ) {
    return NextResponse.json({ error: "A valid stage and decision are required" }, { status: 400 });
  }

  // Approving a stage is a stronger action than leaving a comment or
  // returning a case for rework.
  const requiredPermission = body.decision === "approved" ? "case:approve" : "case:edit";

  try {
    await requirePermission(user.id, user.organizationId, requiredPermission);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await submitCaseReview(
      user.organizationId,
      user.id,
      params.id,
      body.stage!,
      body.decision!,
      body.comment ?? ""
    );
    return NextResponse.json({ data: { ok: true } }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to submit review" },
      { status: 400 }
    );
  }
}
