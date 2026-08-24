import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/rbac";
import { listDuplicateCandidates, runDuplicateDetection } from "@/lib/cases/duplicates";

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

  const candidates = await listDuplicateCandidates(user.organizationId, params.id);
  return NextResponse.json({ data: candidates });
}

/** Triggers a (re)computation of duplicate candidates for this case. */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user || !user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await requirePermission(user.id, user.organizationId, "case:edit");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await runDuplicateDetection(user.organizationId, params.id);
    const candidates = await listDuplicateCandidates(user.organizationId, params.id);
    return NextResponse.json({ data: candidates });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to run duplicate detection" },
      { status: 500 }
    );
  }
}
