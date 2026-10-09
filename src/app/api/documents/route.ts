import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageDocuments, getIdentity } from "@/lib/auth/identity";
import { withUserContext } from "@/lib/db";
import { auditLogs, documents, properties } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { extractDocumentText, supportedDocumentType } from "@/lib/rag/extract";
import { ingestText } from "@/lib/rag/ingest";
import { requestExceedsBytes, requireSameOrigin } from "@/lib/security/origin";

export const runtime = "nodejs";
export const maxDuration = 60;

const sourceTypes = ["listing", "market_report", "lease", "contract", "investment_memo", "property_note", "other"] as const;
const uploadMetadata = z.object({
  title: z.string().trim().min(1).max(240).optional(),
  sourceType: z.enum(sourceTypes).default("other"),
  propertyId: z.uuid().optional(),
  sourceDate: z.iso.date().optional(),
  url: z.url().refine((value) => new URL(value).protocol === "https:", "Source links must use HTTPS.").optional(),
});

export async function GET() {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const result = await withUserContext(identity, (tx) =>
    tx.select({
      id: documents.id,
      title: documents.title,
      sourceType: documents.sourceType,
      sourceDate: documents.sourceDate,
      url: documents.url,
    }).from(documents).orderBy(desc(documents.createdAt)).limit(50));
  return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!canManageDocuments(identity.role)) {
    return NextResponse.json({ error: "Document upload requires an analyst or admin account." }, { status: 403 });
  }
  const configuredMaxMb = Number(process.env.MAX_UPLOAD_MB ?? 4);
  const maxMb = Number.isFinite(configuredMaxMb) && configuredMaxMb >= 1
    ? Math.min(4, configuredMaxMb)
    : 4;
  if (requestExceedsBytes(request, maxMb * 1024 * 1024 + 128 * 1024)) {
    return NextResponse.json({ error: "Document exceeds the upload size limit." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Upload form could not be read." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a document to upload." }, { status: 400 });

  if (file.size === 0 || file.size > maxMb * 1024 * 1024) {
    return NextResponse.json({ error: "Document is empty or exceeds the upload size limit." }, { status: 413 });
  }
  const type = supportedDocumentType(file.type, file.name);
  if (!type) return NextResponse.json({ error: "Supported formats: PDF, DOCX, HTML, CSV, and plain text." }, { status: 415 });

  const metadata = uploadMetadata.safeParse({
    title: form.get("title") || file.name,
    sourceType: form.get("sourceType") || "other",
    propertyId: form.get("propertyId") || undefined,
    sourceDate: form.get("sourceDate") || undefined,
    url: form.get("url") || undefined,
  });
  if (!metadata.success) return NextResponse.json({ error: metadata.error.issues[0]?.message ?? "Document details are invalid." }, { status: 400 });

  const propertyId = metadata.data.propertyId;
  if (propertyId) {
    const [property] = await withUserContext(identity, (tx) =>
      tx.select({ id: properties.id }).from(properties).where(eq(properties.id, propertyId)).limit(1));
    if (!property) return NextResponse.json({ error: "Choose a property in your account." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractDocumentText(buffer, type);
    const result = await ingestText(identity, {
      title: metadata.data.title || file.name,
      text,
      sourceType: metadata.data.sourceType,
      propertyId: propertyId ?? null,
      sourceDate: metadata.data.sourceDate ? new Date(metadata.data.sourceDate + "T12:00:00.000Z") : null,
      url: metadata.data.url ?? null,
    });
    if (result.duplicate) return NextResponse.json({ ...result, message: "This document is already indexed." }, { status: 409 });
    await withUserContext(identity, (tx) => tx.insert(auditLogs).values({
      accountId: identity.accountId,
      userId: identity.userId,
      event: "document.indexed",
      resourceType: "document",
      resourceId: result.documentId,
      metadata: { title: metadata.data.title || file.name, chunks: result.chunks, sourceType: metadata.data.sourceType },
    }));
    return NextResponse.json({ ...result, message: "Document indexed successfully." }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Document ingestion failed.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
