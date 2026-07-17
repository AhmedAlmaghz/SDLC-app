import fs from "node:fs";
import path from "node:path";
import { createRequire as createNodeRequire } from "node:module";
import type BetterSqlite3 from "better-sqlite3";
import pg from "pg";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { env } from "../lib/env";
import * as sqliteSchema from "@db/schema";
import * as pgSchema from "@db/schema.pg";

/**
 * طبقة اتصال مزدوجة المحرك:
 * - التطوير: SQLite (better-sqlite3) — ملف محلي، صفر إعداد.
 * - الإنتاج: PostgreSQL (node-postgres) — عندما تكون DATABASE_URL بصيغة postgres://
 *
 * المخططان (db/schema.ts و db/schema.pg.ts) متطابقان بنيوياً، لذا نُوحّد
 * نوع الإرجاع على مخطط SQLite بينما يحدّد المُشغّل الفعلي لهجة SQL في وقت التشغيل.
 */
export type Db = BetterSQLite3Database<typeof sqliteSchema>;

/**
 * نحمّل better-sqlite3 (وحدة أصلية) عبر require حتى لا تُجمَّع داخل حزمة
 * الإنتاج — تُحلّ من node_modules في وقت التشغيل حيث يعمل محمّل bindings.
 */
const nodeRequire = createNodeRequire(import.meta.url);
const Database = nodeRequire("better-sqlite3") as typeof BetterSqlite3;

let instance: Db | undefined;

/** إنشاء جداول SQLite عند أول تشغيل — تجربة تطوير بلا خطوات يدوية. */
function ensureSqliteSchema(sqlite: BetterSqlite3.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      idea TEXT NOT NULL,
      config TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      doc_language TEXT NOT NULL DEFAULT 'ar',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      title TEXT NOT NULL,
      file_name TEXT NOT NULL,
      content TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'template',
      model TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS documents_project_idx ON documents(project_id);
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      doc_key TEXT,
      kind TEXT NOT NULL DEFAULT 'doc',
      model TEXT,
      input_tokens INTEGER,
      output_tokens INTEGER,
      duration_ms INTEGER,
      status TEXT NOT NULL DEFAULT 'ok',
      detail TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS runs_project_idx ON runs(project_id);
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      ai_provider TEXT NOT NULL DEFAULT 'custom',
      ai_base_url TEXT NOT NULL DEFAULT '',
      ai_api_key TEXT NOT NULL DEFAULT '',
      ai_model TEXT NOT NULL DEFAULT '',
      ai_small_model TEXT NOT NULL DEFAULT '',
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  const settingColumns = sqlite.prepare("PRAGMA table_info(settings)").all() as Array<{ name: string }>;
  if (!settingColumns.some((column) => column.name === "ai_provider")) {
    sqlite.exec("ALTER TABLE settings ADD COLUMN ai_provider TEXT NOT NULL DEFAULT 'custom';");
  }
}

export function getDb(): Db {
  if (instance) return instance;

  if (env.usePostgres()) {
    const pool = new pg.Pool({ connectionString: env.databaseUrl });
    instance = drizzlePg(pool, { schema: pgSchema }) as unknown as Db;
  } else {
    const file = env.sqlitePath;
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
    const sqlite = new Database(file);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    ensureSqliteSchema(sqlite);
    instance = drizzleSqlite(sqlite, { schema: sqliteSchema });
  }
  return instance;
}
