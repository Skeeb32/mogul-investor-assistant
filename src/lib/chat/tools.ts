import { and, desc, eq, gte, lte } from "drizzle-orm";
import { tool } from "ai";
import { z } from "zod";
import { withUserContext } from "@/lib/db";
import { auditLogs, investmentAccounts, investmentTransactions, investments, properties, userNotes } from "@/lib/db/schema";
import type { Identity } from "@/lib/auth/identity";
import { getOverview } from "@/lib/overview";
import { searchDocuments } from "@/lib/rag/search";

const dateRangeSchema = z.object({
  startDate: z.iso.date().optional().describe("Inclusive start date in YYYY-MM-DD format."),
  endDate: z.iso.date().optional().describe("Inclusive end date in YYYY-MM-DD format."),
});

async function audit(identity: Identity, event: string, resourceType: string, resourceId?: string | null, metadata: Record<string, string | number | boolean | null> = {}) {
  await withUserContext(identity, async (tx) => {
    await tx.insert(auditLogs).values({
      accountId: identity.accountId,
      userId: identity.userId,
      event,
      resourceType,
      resourceId: resourceId ?? null,
      metadata,
    });
  });
}

export function createAssistantTools(identity: Identity) {
  return {
    getAccountSummary: tool({
      description: "Read the authenticated investor's account type, base currency, and membership details. Never accept a user ID as input.",
      inputSchema: z.object({}),
      execute: async () => {
        const [account] = await withUserContext(identity, (tx) => tx.select({
          id: investmentAccounts.id,
          name: investmentAccounts.name,
          accountType: investmentAccounts.accountType,
          currency: investmentAccounts.currency,
        }).from(investmentAccounts).where(eq(investmentAccounts.id, identity.accountId)).limit(1));
        await audit(identity, "account.summary.read", "investment_account", identity.accountId);
        return account ?? { error: "Account details are not available." };
      },
    }),

    getPortfolioSummary: tool({
      description: "Read current holdings for the authenticated investor. Supports filters by property and asset class. Never infer a missing value.",
      inputSchema: z.object({
        property: z.string().max(120).optional(),
        assetClass: z.string().max(80).optional(),
        minimumValue: z.number().int().min(0).optional(),
        maximumValue: z.number().int().min(0).optional(),
      }),
      execute: async ({ property, assetClass, minimumValue, maximumValue }) => {
        const filters = [eq(investments.userId, identity.userId)];
        if (property) filters.push(eq(properties.name, property));
        if (assetClass) filters.push(eq(properties.assetClass, assetClass));
        if (minimumValue !== undefined) filters.push(gte(investments.currentValue, minimumValue));
        if (maximumValue !== undefined) filters.push(lte(investments.currentValue, maximumValue));
        const holdings = await withUserContext(identity, (tx) => tx.select({
          propertyId: properties.id,
          propertyName: properties.name,
          city: properties.city,
          state: properties.state,
          assetClass: properties.assetClass,
          amountInvested: investments.amountInvested,
          currentValue: investments.currentValue,
          distributionYtd: investments.distributionYtd,
          ownershipPercent: investments.ownershipPercent,
          occupancy: properties.occupancy,
        }).from(investments)
          .innerJoin(properties, eq(investments.propertyId, properties.id))
          .where(and(...filters)).orderBy(desc(investments.currentValue)));
        await audit(identity, "portfolio.summary.read", "portfolio");
        return {
          holdings,
          totals: holdings.reduce((total, row) => ({
            invested: total.invested + row.amountInvested,
            currentValue: total.currentValue + row.currentValue,
            distributionsYtd: total.distributionsYtd + row.distributionYtd,
          }), { invested: 0, currentValue: 0, distributionsYtd: 0 }),
          filters: { property: property ?? null, assetClass: assetClass ?? null },
        };
      },
    }),

    getPropertyDetails: tool({
      description: "Read details about a property the authenticated investor's account can access.",
      inputSchema: z.object({ propertyId: z.uuid() }),
      execute: async ({ propertyId }) => {
        const [property] = await withUserContext(identity, (tx) => tx.select({
          id: properties.id,
          name: properties.name,
          address: properties.address,
          city: properties.city,
          state: properties.state,
          assetClass: properties.assetClass,
          occupancy: properties.occupancy,
          marketValue: properties.marketValue,
        }).from(properties).where(eq(properties.id, propertyId)).limit(1));
        if (property) await audit(identity, "property.details.read", "property", property.id);
        return property ?? { error: "That property is not available in this account." };
      },
    }),

    getTransactions: tool({
      description: "Read the authenticated investor's investment and distribution transactions for a date range.",
      inputSchema: dateRangeSchema,
      execute: async ({ startDate, endDate }) => {
        if (startDate && endDate && startDate > endDate) return { error: "Start date must be before end date." };
        const filters = [eq(investmentTransactions.userId, identity.userId)];
        if (startDate) filters.push(gte(investmentTransactions.occurredAt, new Date(startDate + "T00:00:00.000Z")));
        if (endDate) filters.push(lte(investmentTransactions.occurredAt, new Date(endDate + "T23:59:59.999Z")));
        const transactions = await withUserContext(identity, (tx) => tx.select({
          id: investmentTransactions.id,
          kind: investmentTransactions.kind,
          amount: investmentTransactions.amount,
          description: investmentTransactions.description,
          occurredAt: investmentTransactions.occurredAt,
          propertyName: properties.name,
        }).from(investmentTransactions)
          .leftJoin(properties, eq(investmentTransactions.propertyId, properties.id))
          .where(and(...filters))
          .orderBy(desc(investmentTransactions.occurredAt)).limit(100));
        await audit(identity, "transactions.read", "transaction");
        return { transactions, count: transactions.length };
      },
    }),

    getOverview: tool({
      description: "Read a dashboard summary including portfolio value, cash distributions, occupancy, recent activity, and recent documents.",
      inputSchema: z.object({}),
      execute: async () => {
        const overview = await getOverview(identity);
        await audit(identity, "overview.read", "portfolio");
        return overview;
      },
    }),

    searchDocuments: tool({
      description: "Search account-scoped property and market documents using semantic and keyword retrieval. Use this for questions about property notes, leases, market reports, contracts, and investment memos. Return citations with claims.",
      inputSchema: z.object({
        query: z.string().min(2).max(500),
        propertyId: z.uuid().optional(),
        sourceType: z.enum(["listing", "market_report", "lease", "contract", "investment_memo", "property_note", "other"]).optional(),
        startDate: z.iso.date().optional(),
        endDate: z.iso.date().optional(),
      }),
      execute: async ({ query, propertyId, sourceType, startDate, endDate }) => {
        const results = await searchDocuments(identity, { query, propertyId, sourceType, startDate, endDate });
        for (const result of results) {
          await audit(identity, "document.search.read", "document", result.citation.documentId, { sourceType: result.citation.sourceType });
        }
        return {
          evidence: results.map((result) => ({
            citation: result.citation,
            relevance: result.relevance,
            excerpt: result.content,
          })),
          answerableEvidenceFound: results.some((result) => result.relevance >= 0.06),
        };
      },
    }),

    createNote: tool({
      description: "Create a private note in the authenticated investor's account. Only create one when the user explicitly asks to save or remember information.",
      inputSchema: z.object({
        propertyId: z.uuid().optional(),
        text: z.string().trim().min(1).max(5000),
      }),
      execute: async ({ propertyId, text }) => {
        return withUserContext(identity, async (tx) => {
          if (propertyId) {
            const [property] = await tx.select({ id: properties.id }).from(properties).where(eq(properties.id, propertyId)).limit(1);
            if (!property) return { error: "That property is not available in this account." };
          }
          const [note] = await tx.insert(userNotes).values({
            accountId: identity.accountId,
            userId: identity.userId,
            propertyId: propertyId ?? null,
            body: text,
          }).returning({ id: userNotes.id, createdAt: userNotes.createdAt });
          await tx.insert(auditLogs).values({
            accountId: identity.accountId,
            userId: identity.userId,
            event: "note.created",
            resourceType: "note",
            resourceId: note.id,
          });
          return { saved: true, noteId: note.id, createdAt: note.createdAt };
        });
      },
    }),
  };
}
