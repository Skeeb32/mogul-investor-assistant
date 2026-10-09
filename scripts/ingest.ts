import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { withServiceContext, closeDb } from "@/lib/db";
import { users, accountMembers } from "@/lib/db/schema";
import { extractDocumentText, supportedDocumentType } from "@/lib/rag/extract";
import { ingestText } from "@/lib/rag/ingest";

async function main() {
  const [fileName, sourceType = "other", propertyId] = process.argv.slice(2);
  if (!fileName) throw new Error("Usage: npm run ingest -- <file> [source-type] [property-uuid]");
  const resolved = path.resolve(fileName);
  const buffer = await readFile(resolved);
  const type = supportedDocumentType("", resolved);
  if (!type) throw new Error("Supported formats: PDF, DOCX, HTML, CSV, and plain text.");

  const email = (process.env.INGEST_USER_EMAIL || process.env.DEMO_USER_EMAIL || "investor@mogul.local").trim().toLowerCase();
  const context = await withServiceContext(async (tx) => {
    const [user] = await tx.select({ id: users.id, role: accountMembers.role, accountId: accountMembers.accountId })
      .from(users).innerJoin(accountMembers, eq(accountMembers.userId, users.id))
      .where(eq(users.email, email)).limit(1);
    return user;
  });
  if (!context) throw new Error("No account user was found. Run npm run db:seed first.");
  if (context.role !== "analyst" && context.role !== "admin") throw new Error("Document ingestion requires an analyst or admin user.");
  if (!["listing", "market_report", "lease", "contract", "investment_memo", "property_note", "other"].includes(sourceType)) {
    throw new Error("Unknown source type.");
  }

  const text = await extractDocumentText(buffer, type);
  const result = await ingestText({
    userId: context.id,
    accountId: context.accountId,
    role: context.role,
    email,
    name: email,
  }, {
    title: path.basename(resolved),
    text,
    sourceType: sourceType as "listing" | "market_report" | "lease" | "contract" | "investment_memo" | "property_note" | "other",
    propertyId: propertyId ?? null,
    url: null,
    sourceDate: null,
  });
  console.log(result.duplicate ? "Document already indexed." : "Indexed " + result.chunks + " document chunk(s).");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(closeDb);
