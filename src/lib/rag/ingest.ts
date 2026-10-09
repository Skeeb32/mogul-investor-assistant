import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { documents } from "@/lib/db/schema";
import { getOpenAI, embeddingModel } from "@/lib/openai";
import { withUserContext, type UserDb } from "@/lib/db";
import type { Identity } from "@/lib/auth/identity";
import { splitIntoChunks } from "./chunking";

export type IngestInput = {
  title: string;
  text: string;
  sourceType: "listing" | "market_report" | "lease" | "contract" | "investment_memo" | "property_note" | "other";
  url?: string | null;
  propertyId?: string | null;
  sourceDate?: Date | null;
};

export async function ingestText(identity: Identity, input: IngestInput, executor?: UserDb) {
  const text = input.text.slice(0, 150_000).trim();
  if (text.length < 20) throw new Error("The document must contain at least 20 readable characters.");
  const checksum = createHash("sha256").update(text).digest("hex");
  const chunks = splitIntoChunks(text);
  if (chunks.length > 180) throw new Error("This document is too long to index in one request. Split it into smaller files.");

  const run = async (tx: UserDb) => {
    const existing = await tx.select({ id: documents.id }).from(documents)
      .where(eq(documents.checksum, checksum)).limit(1);
    if (existing.length) return { documentId: existing[0].id, chunks: 0, duplicate: true };

    let vectors: (number[] | null)[] = chunks.map(() => null);
    if (process.env.OPENAI_API_KEY) {
      try {
        const response = await getOpenAI().embeddings.create({
          model: embeddingModel(),
          input: chunks.map((chunk) => chunk.content),
        });
        vectors = response.data.sort((a, b) => a.index - b.index).map((item) => item.embedding);
      } catch (error) {
        throw new Error("Embedding generation failed. The document was not indexed.", { cause: error });
      }
    }

    const rows = chunks.map((chunk, index) => ({
      accountId: identity.accountId,
      userId: null,
      propertyId: input.propertyId ?? null,
      sourceType: input.sourceType,
      title: input.title.slice(0, 240),
      url: input.url ?? null,
      sourceDate: input.sourceDate ?? null,
      checksum,
      chunkIndex: chunk.index,
      chunkCount: chunk.count,
      content: chunk.content,
      embedding: vectors[index] ?? null,
      metadata: {
        userId: identity.userId,
        accountId: identity.accountId,
        propertyId: input.propertyId ?? null,
        sourceType: input.sourceType,
        url: input.url ?? null,
        sourceDate: input.sourceDate?.toISOString() ?? null,
        checksum,
      },
    }));
    const inserted = await tx.insert(documents).values(rows).returning({ id: documents.id });
    return { documentId: inserted[0]?.id ?? "", chunks: inserted.length, duplicate: false };
  };

  return executor ? run(executor) : withUserContext(identity, run);
}
