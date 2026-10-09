import { NextResponse } from "next/server";
import { getIdentity } from "@/lib/auth/identity";
import { getOverview } from "@/lib/overview";

export const runtime = "nodejs";

export async function GET() {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  return NextResponse.json(await getOverview(identity), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
