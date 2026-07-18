import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * مخطط SQLite — بيئة التطوير.
 * نسخة PostgreSQL للإنتاج في db/schema.pg.ts (نفس البنية تماماً).
 * نستخدم مفاتيح نصية (UUID) لتفادي اختلافات الهويات بين المحركين.
 */

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  idea: text("idea").notNull(),
  config: text("config", { mode: "json" }).notNull(),
  status: text("status").notNull().default("draft"),
  docLanguage: text("doc_language").notNull().default("ar"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const packageVersions = sqliteTable("package_versions", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  label: text("label").notNull(),
  status: text("status").notNull().default("queued"),
  changeType: text("change_type").notNull().default("initial_generation"),
  changeSummary: text("change_summary"),
  createdFromVersionNumber: integer("created_from_version_number"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  packageVersionId: text("package_version_id").references(() => packageVersions.id, { onDelete: "cascade" }),
  packageVersionNumber: integer("package_version_number").notNull().default(1),
  key: text("key").notNull(),
  title: text("title").notNull(),
  fileName: text("file_name").notNull(),
  content: text("content").notNull(),
  source: text("source").notNull().default("template"),
  model: text("model"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const runs = sqliteTable("runs", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  docKey: text("doc_key"),
  kind: text("kind").notNull().default("doc"),
  model: text("model"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  durationMs: integer("duration_ms"),
  status: text("status").notNull().default("ok"),
  detail: text("detail"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const settings = sqliteTable("settings", {
  id: text("id").primaryKey(),
  aiProvider: text("ai_provider").notNull().default("custom"),
  aiBaseUrl: text("ai_base_url").notNull().default(""),
  aiApiKey: text("ai_api_key").notNull().default(""),
  aiModel: text("ai_model").notNull().default(""),
  aiSmallModel: text("ai_small_model").notNull().default(""),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * مزوّدات الذكاء الاصطناعي المسمّاة والمحفوظة.
 * يختار المستخدم واحداً منها ليكون المزوّد النشط/الافتراضي (isActive=1).
 * يُسمح بمزوّد نشط واحد فقط في كل لحظة (يُطبّق في طبقة التطبيق).
 */
export const providerSettings = sqliteTable("provider_settings", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  baseUrl: text("base_url").notNull().default(""),
  apiKey: text("api_key").notNull().default(""),
  model: text("model").notNull().default(""),
  smallModel: text("small_model").notNull().default(""),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type ProjectRow = typeof projects.$inferSelect;
export type PackageVersionRow = typeof packageVersions.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type RunRow = typeof runs.$inferSelect;
export type SettingsRow = typeof settings.$inferSelect;
export type ProviderSettingsRow = typeof providerSettings.$inferSelect;
