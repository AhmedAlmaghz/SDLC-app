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

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
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
  aiBaseUrl: text("ai_base_url").notNull().default(""),
  aiApiKey: text("ai_api_key").notNull().default(""),
  aiModel: text("ai_model").notNull().default(""),
  aiSmallModel: text("ai_small_model").notNull().default(""),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type ProjectRow = typeof projects.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type RunRow = typeof runs.$inferSelect;
export type SettingsRow = typeof settings.$inferSelect;
