import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok", service: "pv-plus", version: "v1" });
}
