import { createHmac } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { accountMembers, investmentAccounts, users } from "@/lib/db/schema";
import { withServiceContext } from "@/lib/db";
import { enforceRateLimit, RateLimitError } from "@/lib/security/rate-limit";
import { requestExceedsBytes, requireSameOrigin } from "@/lib/security/origin";

export const runtime = "nodejs";

const signUpSchema = z.object({
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  password: z.string().min(14).max(128),
});

function hasUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  }
  if (requestExceedsBytes(request, 2_048)) {
    return NextResponse.json({ error: "Your sign-up details are too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter your name, email, and password." }, { status: 400 });
  }

  const parsed = signUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid name and email, and a password with at least 14 characters." }, { status: 400 });
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Account creation is temporarily unavailable." }, { status: 503 });
  }

  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rateLimitKey = createHmac("sha256", secret).update(`signup:${ipAddress}`).digest("hex");
  try {
    await enforceRateLimit(`signup:${rateLimitKey}`, 5, 15 * 60_000);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: "Too many sign-up attempts. Please wait and try again." }, { status: 429 });
    }
    return NextResponse.json({ error: "Account creation is temporarily unavailable." }, { status: 503 });
  }

  try {
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    await withServiceContext(async (tx) => {
      const [user] = await tx.insert(users).values({
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: "investor",
        active: true,
      }).returning({ id: users.id });

      const [account] = await tx.insert(investmentAccounts).values({
        name: `${parsed.data.name.slice(0, 140)}'s Mogul Account`,
        accountType: "individual",
        currency: "USD",
      }).returning({ id: investmentAccounts.id });

      await tx.insert(accountMembers).values({
        accountId: account.id,
        userId: user.id,
        role: "investor",
      });
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (hasUniqueConstraintError(error)) {
      return NextResponse.json({ error: "An account could not be created with those details. If you already have an account, sign in instead." }, { status: 409 });
    }
    return NextResponse.json({ error: "Account creation is temporarily unavailable." }, { status: 503 });
  }
}
