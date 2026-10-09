import { desc, eq } from "drizzle-orm";
import { withUserContext, type UserDb } from "@/lib/db";
import { documents, investmentTransactions, investments, properties } from "@/lib/db/schema";

export async function getOverview(identity: { userId: string; accountId: string }, executor?: UserDb) {
  const run = async (tx: UserDb) => {
    const holdings = await tx.select({
      investmentId: investments.id,
      amountInvested: investments.amountInvested,
      currentValue: investments.currentValue,
      distributionYtd: investments.distributionYtd,
      propertyId: properties.id,
      propertyName: properties.name,
      city: properties.city,
      state: properties.state,
      assetClass: properties.assetClass,
      occupancy: properties.occupancy,
      imageUrl: properties.imageUrl,
    }).from(investments)
      .innerJoin(properties, eq(investments.propertyId, properties.id))
      .orderBy(desc(investments.currentValue));

    const activity = await tx.select({
      id: investmentTransactions.id,
      kind: investmentTransactions.kind,
      amount: investmentTransactions.amount,
      description: investmentTransactions.description,
      occurredAt: investmentTransactions.occurredAt,
      propertyName: properties.name,
    }).from(investmentTransactions)
      .leftJoin(properties, eq(investmentTransactions.propertyId, properties.id))
      .orderBy(desc(investmentTransactions.occurredAt))
      .limit(5);

    const recentDocuments = await tx.select({
      id: documents.id,
      title: documents.title,
      sourceType: documents.sourceType,
      sourceDate: documents.sourceDate,
      url: documents.url,
    }).from(documents)
      .orderBy(desc(documents.createdAt))
      .limit(4);

    const invested = holdings.reduce((total, holding) => total + holding.amountInvested, 0);
    const currentValue = holdings.reduce((total, holding) => total + holding.currentValue, 0);
    const distributionYtd = holdings.reduce((total, holding) => total + holding.distributionYtd, 0);
    const occupancy = holdings.length
      ? holdings.reduce((total, holding) => total + holding.occupancy, 0) / holdings.length
      : 0;

    return {
      totals: { invested, currentValue, unrealizedGrowth: currentValue - invested, distributionYtd, occupancy },
      holdings,
      activity,
      recentDocuments,
      markets: [...new Set(holdings.map((holding) => holding.city + ", " + holding.state))],
    };
  };

  return executor ? run(executor) : withUserContext(identity, run);
}
