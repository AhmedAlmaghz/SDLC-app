import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * مخطط PostgreSQL — بيئة الإنتاج.
 * يطابق db/schema.ts (SQLite للتطوير) بنفس البنية والأسماء.
 */

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  idea: text("idea").notNull(),
  config: jsonb("config").notNull(),
  status: text("status").notNull().default("draft"),
  docLanguage: text("doc_language").notNull().default("ar"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const packageVersions = pgTable("package_versions", {
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
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { mode: "date" }),
});

export const documents = pgTable("documents", {
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
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const runs = pgTable("runs", {
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
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  id: text("id").primaryKey(),
  aiProvider: text("ai_provider").notNull().default("custom"),
  aiBaseUrl: text("ai_base_url").notNull().default(""),
  aiApiKey: text("ai_api_key").notNull().default(""),
  aiModel: text("ai_model").notNull().default(""),
  aiSmallModel: text("ai_small_model").notNull().default(""),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

/**
 * مزوّدات الذكاء الاصطناعي المسمّاة والمحفوظة.
 * يختار المستخدم واحداً منها ليكون المزوّد النشط/الافتراضي (isActive=true).
 * يُسمح بمزوّد نشط واحد فقط في كل لحظة (يُطبّق في طبقة التطبيق).
 */
export const providerSettings = pgTable("provider_settings", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  baseUrl: text("base_url").notNull().default(""),
  apiKey: text("api_key").notNull().default(""),
  model: text("model").notNull().default(""),
  smallModel: text("small_model").notNull().default(""),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export type ProjectRow = typeof projects.$inferSelect;
export type PackageVersionRow = typeof packageVersions.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type RunRow = typeof runs.$inferSelect;
export type SettingsRow = typeof settings.$inferSelect;
export type ProviderSettingsRow = typeof providerSettings.$inferSelect;
