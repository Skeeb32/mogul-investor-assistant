import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { withServiceContext, closeDb } from "@/lib/db";
import { accountMembers, documents, investmentAccounts, investmentTransactions, investments, properties, users } from "@/lib/db/schema";
import { getOpenAI } from "@/lib/openai";
import { splitIntoChunks } from "@/lib/rag/chunking";

const accountId = "a1111111-1111-4111-8111-111111111111";
const propertyFixtures = [
  { id: "b1111111-1111-4111-8111-111111111111", name: "Clinton Hill Collection", address: "212 Lafayette Avenue", city: "Brooklyn", state: "NY", assetClass: "Multifamily", occupancy: 0.968, marketValue: 2_450_000, amountInvested: 29_300, currentValue: 32_650, distributionYtd: 968, ownershipPercent: 1.2, imageUrl: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=82" },
  { id: "b2222222-2222-4222-8222-222222222222", name: "Park Slope Townhomes", address: "47 7th Avenue", city: "Brooklyn", state: "NY", assetClass: "Townhome", occupancy: 0.983, marketValue: 1_880_000, amountInvested: 25_430, currentValue: 27_600, distributionYtd: 804, ownershipPercent: 1.35, imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=82" },
  { id: "b3333333-3333-4333-8333-333333333333", name: "Westside Garden Homes", address: "1040 Marietta Street NW", city: "Atlanta", state: "GA", assetClass: "Single family", occupancy: 0.953, marketValue: 1_420_000, amountInvested: 23_000, currentValue: 24_000, distributionYtd: 646, ownershipPercent: 1.62, imageUrl: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=82" },
];

const sampleDocuments = [
  {
    title: "Clinton Hill Collection · Q3 2026 operating update",
    sourceType: "property_note" as const,
    propertyId: propertyFixtures[0].id,
    sourceDate: new Date("2026-09-30T12:00:00.000Z"),
    text: "DEMO SAMPLE REPORT — NOT AN ACTUAL PROPERTY RECORD. Clinton Hill Collection is an illustrative 12-unit Brooklyn multifamily property. The sample Q3 2026 update reports occupancy of 96.8 percent across the portfolio, completion of common-area improvements, and a quarterly investor distribution of 612 dollars. The example notes that routine maintenance costs were higher than the prior quarter. These sample figures are invented for this software demonstration and do not describe a real investment.",
  },
  {
    title: "Brooklyn residential market snapshot · Q3 2026",
    sourceType: "market_report" as const,
    propertyId: propertyFixtures[0].id,
    sourceDate: new Date("2026-09-15T12:00:00.000Z"),
    text: "DEMO SAMPLE REPORT — NOT A REAL MARKET DATASET. This illustrative Q3 2026 summary describes the Brooklyn rental market for demonstration purposes only. It uses fictional sample figures: rental vacancy of 2.6 percent, average advertised rent growth of 3.1 percent year over year, and strongest sample inquiry volume in transit-connected neighborhoods. No actual research, property valuation, or market forecast is represented. Verify market information with current, reliable sources before making decisions.",
  },
  {
    title: "Park Slope Townhomes · investor memo",
    sourceType: "investment_memo" as const,
    propertyId: propertyFixtures[1].id,
    sourceDate: new Date("2026-08-20T12:00:00.000Z"),
    text: "DEMO SAMPLE MEMO — NOT AN OFFERING DOCUMENT. Park Slope Townhomes is an invented four-home residential investment concept. This example describes 98.3 percent occupancy, a sample 804 dollar year-to-date distribution, and a sample current value of 27,600 dollars for one demo holding. The model assumes ongoing maintenance and reserves. Returns are not guaranteed, and these values should not be relied upon for an investment or tax decision.",
  },
  {
    title: "Westside Garden Homes · leasing notes",
    sourceType: "property_note" as const,
    propertyId: propertyFixtures[2].id,
    sourceDate: new Date("2026-09-22T12:00:00.000Z"),
    text: "DEMO SAMPLE NOTES — NOT A REAL LEASE OR RENT ROLL. Westside Garden Homes is an invented eight-home Atlanta property used in the Mogul assistant demo. The example occupancy is 95.3 percent. The sample September note mentions scheduled landscaping and a renewal discussion. No tenant names, contact information, lease terms, or actual market data are included.",
  },
];

async function main() {
  if (process.env.DEMO_MODE !== "true") throw new Error("Set DEMO_MODE=true before inserting synthetic demo data.");
  const email = (process.env.DEMO_USER_EMAIL || "investor@mogul.local").trim().toLowerCase();
  const password = process.env.DEMO_USER_PASSWORD || "";
  if (password.length < 14 || (password === "ChangeThisDemoPassword!2026" && process.env.NODE_ENV === "production")) {
    throw new Error("Set DEMO_USER_PASSWORD to a unique value with at least 14 characters.");
  }
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await withServiceContext(async (tx) => {
    await tx.insert(investmentAccounts).values({
      id: accountId,
      name: "Mogul Demo Account",
      accountType: "individual",
      currency: "USD",
    }).onConflictDoUpdate({
      target: investmentAccounts.id,
      set: { name: "Mogul Demo Account", accountType: "individual", currency: "USD" },
    });
    const [createdUser] = await tx.insert(users).values({
      name: "Sarah Chen",
      email,
      passwordHash,
      role: "admin",
      active: true,
    }).onConflictDoUpdate({
      target: users.email,
      set: { name: "Sarah Chen", passwordHash, role: "admin", active: true, updatedAt: new Date() },
    }).returning({ id: users.id });
    await tx.insert(accountMembers).values({
      accountId,
      userId: createdUser.id,
      role: "admin",
    }).onConflictDoUpdate({
      target: [accountMembers.accountId, accountMembers.userId],
      set: { role: "admin" },
    });

    for (const property of propertyFixtures) {
      const { amountInvested, currentValue, distributionYtd, ownershipPercent, ...details } = property;
      await tx.insert(properties).values({ ...details, accountId }).onConflictDoUpdate({
        target: properties.id,
        set: details,
      });
      await tx.insert(investments).values({
        id: "c" + property.id.slice(1),
        accountId,
        userId: createdUser.id,
        propertyId: property.id,
        amountInvested,
        currentValue,
        distributionYtd,
        ownershipPercent,
      }).onConflictDoUpdate({
        target: investments.id,
        set: { userId: createdUser.id, amountInvested, currentValue, distributionYtd, ownershipPercent },
      });
    }

    const transactions = [
      { id: "d1111111-1111-4111-8111-111111111111", propertyId: propertyFixtures[0].id, kind: "distribution" as const, amount: 612, description: "Q3 investor distribution", occurredAt: new Date("2026-09-30T12:00:00.000Z") },
      { id: "d2222222-2222-4222-8222-222222222222", propertyId: propertyFixtures[1].id, kind: "distribution" as const, amount: 804, description: "Q3 investor distribution", occurredAt: new Date("2026-09-15T12:00:00.000Z") },
      { id: "d3333333-3333-4333-8333-333333333333", propertyId: propertyFixtures[2].id, kind: "distribution" as const, amount: 646, description: "Q3 investor distribution", occurredAt: new Date("2026-09-10T12:00:00.000Z") },
      { id: "d4444444-4444-4444-8444-444444444444", propertyId: propertyFixtures[0].id, kind: "investment" as const, amount: 29_300, description: "Initial investment", occurredAt: new Date("2025-10-05T12:00:00.000Z") },
      { id: "d5555555-5555-4555-8555-555555555555", propertyId: propertyFixtures[1].id, kind: "investment" as const, amount: 25_430, description: "Initial investment", occurredAt: new Date("2025-12-18T12:00:00.000Z") },
      { id: "d6666666-6666-4666-8666-666666666666", propertyId: propertyFixtures[2].id, kind: "investment" as const, amount: 23_000, description: "Initial investment", occurredAt: new Date("2026-01-20T12:00:00.000Z") },
    ];
    for (const transaction of transactions) {
      await tx.insert(investmentTransactions).values({ ...transaction, accountId, userId: createdUser.id })
        .onConflictDoUpdate({ target: investmentTransactions.id, set: transaction });
    }
    return createdUser;
  });

  const chunks = sampleDocuments.flatMap((document) =>
    splitIntoChunks(document.text).map((chunk) => ({ ...document, ...chunk })));
  let embeddings: number[][] = [];
  if (process.env.OPENAI_API_KEY) {
    const response = await getOpenAI().embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
      input: chunks.map((chunk) => chunk.content),
    });
    embeddings = response.data.sort((a, b) => a.index - b.index).map((item) => item.embedding);
  }

  await withServiceContext(async (tx) => {
    let embeddingIndex = 0;
    for (const document of sampleDocuments) {
      const documentChunks = splitIntoChunks(document.text);
      const checksum = createHash("sha256").update(document.text).digest("hex");
      for (const chunk of documentChunks) {
        const embedding = embeddings[embeddingIndex++] ?? null;
        const metadata = { userId: user.id, accountId, propertyId: document.propertyId, sourceType: document.sourceType, checksum };
        await tx.insert(documents).values({
          accountId,
          userId: null,
          propertyId: document.propertyId,
          sourceType: document.sourceType,
          title: document.title,
          sourceDate: document.sourceDate,
          checksum,
          chunkIndex: chunk.index,
          chunkCount: chunk.count,
          content: chunk.content,
          embedding,
          metadata,
        }).onConflictDoUpdate({
          target: [documents.accountId, documents.checksum, documents.chunkIndex],
          set: { content: chunk.content, embedding, metadata },
        });
      }
    }
  });

  console.log("Synthetic Mogul demo account and sample property documents are ready.");
  console.log("Sign in with DEMO_USER_EMAIL and DEMO_USER_PASSWORD from your local environment.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(closeDb);
