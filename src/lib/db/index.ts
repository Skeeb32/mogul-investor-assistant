import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

const globalForDb = globalThis as typeof globalThis & {
  mogulSql?: ReturnType<typeof postgres>;
  mogulDb?: ReturnType<typeof drizzle<typeof schema>>;
};

const client = globalForDb.mogulSql ?? postgres(databaseUrl ?? "postgres://mogul:mogul@localhost:5432/mogul", {
  max: process.env.NODE_ENV === "production" ? 5 : 10,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
  transform: { undefined: null },
});

export const db = globalForDb.mogulDb ?? drizzle(client, { schema });
if (process.env.NODE_ENV !== "production") {
  globalForDb.mogulSql = client;
  globalForDb.mogulDb = db;
}

export type UserDb = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function withUserContext<T>(
  identity: { userId: string; accountId: string },
  work: (tx: UserDb) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_user_id', ${identity.userId}, true)`);
    await tx.execute(sql`select set_config('app.current_account_id', ${identity.accountId}, true)`);
    return work(tx);
  });
}

export async function withServiceContext<T>(work: (tx: UserDb) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.is_service', 'true', true)`);
    return work(tx);
  });
}

export async function closeDb() {
  await client.end({ timeout: 5 });
}
