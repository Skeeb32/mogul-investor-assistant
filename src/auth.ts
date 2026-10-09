import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { createHmac } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { accountMembers, users } from "@/lib/db/schema";
import { enforceRateLimit, RateLimitError } from "@/lib/security/rate-limit";

const credentialsSchema = z.object({
  email: z.email().max(320).transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1).max(256),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: process.env.AUTH_TRUST_HOST === "true",
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/sign-in" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials, request) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
        const secret = process.env.AUTH_SECRET;
        if (!secret) throw new Error("AUTH_SECRET must be configured.");
        const rateKey = createHmac("sha256", secret).update(`${parsed.data.email}:${forwardedFor}`).digest("hex");
        try {
          await enforceRateLimit(rateKey, 8);
        } catch (error) {
          if (error instanceof RateLimitError) return null;
          throw error;
        }

        const user = await db.query.users.findFirst({ where: eq(users.email, parsed.data.email) });
        if (!user?.active || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return null;

        const [membership] = await db.transaction(async (tx) => {
          await tx.execute(sql`select set_config('app.current_user_id', ${user.id}, true)`);
          return tx.select({ accountId: accountMembers.accountId, role: accountMembers.role })
            .from(accountMembers)
            .where(eq(accountMembers.userId, user.id))
            .limit(1);
        });
        if (!membership) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: membership.role,
          accountId: membership.accountId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accountId = user.accountId;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.accountId = String(token.accountId ?? "");
        session.user.role = token.role === "admin" || token.role === "analyst" ? token.role : "investor";
      }
      return session;
    },
  },
});
