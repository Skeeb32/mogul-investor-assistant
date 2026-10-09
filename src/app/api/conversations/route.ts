import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getIdentity } from "@/lib/auth/identity";
import { withUserContext } from "@/lib/db";
import { conversations } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET() {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const items = await withUserContext(identity, (tx) => tx.select({
    id: conversations.id,
    title: conversations.title,
    updatedAt: conversations.updatedAt,
  }).from(conversations).where(eq(conversations.userId, identity.userId))
    .orderBy(desc(conversations.updatedAt)).limit(20));
  return NextResponse.json(items, { headers: { "Cache-Control": "private, no-store" } });
}
