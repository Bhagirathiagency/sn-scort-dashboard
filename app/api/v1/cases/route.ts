import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/rbac";
import { createCase, listCases } from "@/lib/cases/service";
import type { CreateCaseInput } from "@/lib/cases/types";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await requirePermission(user.id, user.organizationId, "case:view");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cases = await listCases(user.organizationId);
  return NextResponse.json({ data: cases });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await requirePermission(user.id, user.organizationId, "case:create");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as CreateCaseInput;

  if (!body.source || !body.event?.verbatimTerm || !body.product?.productName) {
    return NextResponse.json(
      { error: "source, product name, and event verbatim term are required" },
      { status: 400 }
    );
  }

  try {
    const result = await createCase(user.organizationId, user.id, body);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create case" },
      { status: 500 }
    );
  }
}
