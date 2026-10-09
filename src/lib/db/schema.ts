import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["investor", "analyst", "admin"]);
export const transactionKind = pgEnum("transaction_kind", ["investment", "distribution", "fee"]);
export const documentSourceType = pgEnum("document_source_type", ["listing", "market_report", "lease", "contract", "investment_memo", "property_note", "other"]);
export const vector1536 = customType<{ data: number[]; driverData: string }>({
  dataType() { return "vector(1536)"; },
  toDriver(value) { return `[${value.join(",")}]`; },
  fromDriver(value) { return value.slice(1, -1).split(",").map(Number); },
});
export const tsvectorType = customType<{ data: string; driverData: string }>({
  dataType() { return "tsvector"; },
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").notNull().default("investor"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("users_email_unique").on(table.email)]);

export const investmentAccounts = pgTable("investment_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  accountType: varchar("account_type", { length: 40 }).notNull().default("individual"),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accountMembers = pgTable("account_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id").notNull().references(() => investmentAccounts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: userRole("role").notNull().default("investor"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("account_members_account_user_unique").on(table.accountId, table.userId)]);

export const properties = pgTable("properties", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id").notNull().references(() => investmentAccounts.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 180 }).notNull(),
  address: varchar("address", { length: 240 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 80 }).notNull(),
  assetClass: varchar("asset_class", { length: 80 }).notNull(),
  occupancy: real("occupancy").notNull().default(0),
  marketValue: integer("market_value").notNull().default(0),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("properties_account_idx").on(table.accountId)]);

export const investments = pgTable("investments", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id").notNull().references(() => investmentAccounts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  amountInvested: integer("amount_invested").notNull(),
  currentValue: integer("current_value").notNull(),
  distributionYtd: integer("distribution_ytd").notNull().default(0),
  ownershipPercent: real("ownership_percent").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("investments_owner_idx").on(table.accountId, table.userId)]);

export const investmentTransactions = pgTable("investment_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id").notNull().references(() => investmentAccounts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
  kind: transactionKind("kind").notNull(),
  amount: integer("amount").notNull(),
  description: varchar("description", { length: 240 }).notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
}, (table) => [index("transactions_owner_date_idx").on(table.accountId, table.userId, table.occurredAt)]);

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id").notNull().references(() => investmentAccounts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
  sourceType: documentSourceType("source_type").notNull().default("other"),
  title: varchar("title", { length: 240 }).notNull(),
  url: text("url"),
  sourceDate: timestamp("source_date", { withTimezone: true }),
  checksum: varchar("checksum", { length: 64 }).notNull(),
  chunkIndex: integer("chunk_index").notNull().default(0),
  chunkCount: integer("chunk_count").notNull().default(1),
  content: text("content").notNull(),
  searchVector: tsvectorType("search_vector"),
  embedding: vector1536("embedding"),
  metadata: jsonb("metadata").$type<Record<string, string | number | boolean | null>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("documents_account_source_idx").on(table.accountId, table.sourceType),
  index("documents_checksum_chunk_idx").on(table.accountId, table.checksum, table.chunkIndex),
  uniqueIndex("documents_account_checksum_chunk_unique").on(table.accountId, table.checksum, table.chunkIndex),
]);

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id").notNull().references(() => investmentAccounts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 180 }).notNull().default("New conversation"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("conversations_owner_updated_idx").on(table.accountId, table.userId, table.updatedAt)]);

export const conversationMessages = pgTable("conversation_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id").notNull().references(() => investmentAccounts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  citations: jsonb("citations").$type<Array<{ documentId: string; title: string; url: string | null; sourceType: string }>>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("messages_conversation_idx").on(table.conversationId, table.createdAt)]);

export const userNotes = pgTable("user_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id").notNull().references(() => investmentAccounts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("notes_owner_idx").on(table.accountId, table.userId)]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id").notNull().references(() => investmentAccounts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  event: varchar("event", { length: 100 }).notNull(),
  resourceType: varchar("resource_type", { length: 80 }).notNull(),
  resourceId: uuid("resource_id"),
  metadata: jsonb("metadata").$type<Record<string, string | number | boolean | null>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("audit_owner_time_idx").on(table.accountId, table.userId, table.createdAt)]);

export const rateLimits = pgTable("rate_limits", {
  key: varchar("key", { length: 240 }).primaryKey(),
  count: integer("count").notNull().default(0),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
}, (table) => [uniqueIndex("verification_token_unique").on(table.identifier, table.token)]);
