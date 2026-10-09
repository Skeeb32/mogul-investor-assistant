import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getIdentity } from "@/lib/auth/identity";
import { withUserContext } from "@/lib/db";
import { conversationMessages, conversations } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

  const result = await withUserContext(identity, async (tx) => {
    const [conversation] = await tx.select({
      id: conversations.id,
      title: conversations.title,
    }).from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, identity.userId))).limit(1);
    if (!conversation) return null;
    const messages = await tx.select({
      id: conversationMessages.id,
      role: conversationMessages.role,
      content: conversationMessages.content,
      citations: conversationMessages.citations,
    }).from(conversationMessages)
      .where(eq(conversationMessages.conversationId, id))
      .orderBy(asc(conversationMessages.createdAt)).limit(100);
    return {
      ...conversation,
      messages: messages.map((message) => ({
        id: message.id,
        role: message.role as "user" | "assistant",
        parts: [{ type: "text" as const, text: message.content }],
        metadata: { citations: message.citations },
      })),
    };
  });

  if (!result) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
}
