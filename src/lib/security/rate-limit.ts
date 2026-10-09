import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export async function enforceRateLimit(key: string, limit: number, windowMs = 60_000) {
  const result = await db.execute<{ count: number }>(sql`
    INSERT INTO rate_limits (key, count, window_started_at)
    VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limits.window_started_at < now() - (${windowMs} * interval '1 millisecond') THEN 1
        ELSE rate_limits.count + 1
      END,
      window_started_at = CASE
        WHEN rate_limits.window_started_at < now() - (${windowMs} * interval '1 millisecond') THEN now()
        ELSE rate_limits.window_started_at
      END
    RETURNING count
  `);
  const count = Number(result[0]?.count ?? 0);
  if (count > limit) {
    throw new RateLimitError("Too many requests. Please wait a moment and try again.");
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}
