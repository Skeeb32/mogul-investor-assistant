import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
const client = postgres(databaseUrl, { max: 1, prepare: false, connect_timeout: 10 });
const migration = await readFile(path.resolve(process.cwd(), "drizzle/0001_initial.sql"), "utf8");

try {
  await client.begin(async (tx) => {
    await tx.unsafe("SELECT pg_advisory_xact_lock(44112026)");
    await tx.unsafe("CREATE TABLE IF NOT EXISTS mogul_schema_migrations (version varchar(120) PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
    const applied = await tx.unsafe("SELECT version FROM mogul_schema_migrations WHERE version = '0001_initial'");
    if (applied.length) {
      console.log("Database is already up to date.");
      return;
    }
    await tx.unsafe(migration);
    await tx.unsafe("INSERT INTO mogul_schema_migrations (version) VALUES ('0001_initial')");
    console.log("Applied migration 0001_initial.");
  });
} finally {
  await client.end({ timeout: 5 });
}
