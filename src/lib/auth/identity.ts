import { auth } from "@/auth";
import { and, eq } from "drizzle-orm";
import { withUserContext } from "@/lib/db";
import { accountMembers, users } from "@/lib/db/schema";

export type Identity = {
  userId: string;
  accountId: string;
  role: "investor" | "analyst" | "admin";
  email: string;
  name: string;
};

export async function getIdentity(): Promise<Identity | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.accountId || !session.user.role || !session.user.email) return null;
  const current = await withUserContext(
    { userId: session.user.id, accountId: session.user.accountId },
    async (tx) => {
      const [user] = await tx.select({ active: users.active }).from(users).where(eq(users.id, session.user.id)).limit(1);
      const [membership] = await tx.select({ role: accountMembers.role })
        .from(accountMembers)
        .where(and(eq(accountMembers.userId, session.user.id), eq(accountMembers.accountId, session.user.accountId)))
        .limit(1);
      return { active: user?.active === true, role: membership?.role };
    },
  );
  if (!current.active || !current.role) return null;
  return {
    userId: session.user.id,
    accountId: session.user.accountId,
    role: current.role,
    email: session.user.email,
    name: session.user.name ?? "Investor",
  };
}

export function canManageDocuments(role: Identity["role"]) {
  return role === "analyst" || role === "admin";
}
