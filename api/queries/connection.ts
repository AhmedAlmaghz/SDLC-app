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
    CREATE TABLE IF NOT EXISTS package_versions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      version_number INTEGER NOT NULL,
      label TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      change_type TEXT NOT NULL DEFAULT 'initial_generation',
      change_summary TEXT,
      created_from_version_number INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      completed_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS package_versions_project_idx ON package_versions(project_id);
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      package_version_id TEXT REFERENCES package_versions(id) ON DELETE CASCADE,
      package_version_number INTEGER NOT NULL DEFAULT 1,
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
    CREATE TABLE IF NOT EXISTS provider_settings (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,
      base_url TEXT NOT NULL DEFAULT '',
      api_key TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT '',
      small_model TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS provider_settings_active_idx ON provider_settings(is_active);
  `);

  const packageVersionColumns = sqlite.prepare("PRAGMA table_info(package_versions)").all() as Array<{ name: string }>;
  const ensurePackageVersionColumn = (name: string, definition: string) => {
    if (!packageVersionColumns.some((column) => column.name === name)) sqlite.exec(`ALTER TABLE package_versions ADD COLUMN ${definition};`);
  };
  ensurePackageVersionColumn("status", "status TEXT NOT NULL DEFAULT 'ready'");
  ensurePackageVersionColumn("change_type", "change_type TEXT NOT NULL DEFAULT 'initial_generation'");
  ensurePackageVersionColumn("change_summary", "change_summary TEXT");
  ensurePackageVersionColumn("created_from_version_number", "created_from_version_number INTEGER");
  ensurePackageVersionColumn("updated_at", "updated_at INTEGER");
  ensurePackageVersionColumn("completed_at", "completed_at INTEGER");

  const documentColumns = sqlite.prepare("PRAGMA table_info(documents)").all() as Array<{ name: string }>;
  if (!documentColumns.some((column) => column.name === "package_version_id")) {
    sqlite.exec("ALTER TABLE documents ADD COLUMN package_version_id TEXT REFERENCES package_versions(id) ON DELETE CASCADE;");
  }
  if (!documentColumns.some((column) => column.name === "package_version_number")) {
    sqlite.exec("ALTER TABLE documents ADD COLUMN package_version_number INTEGER NOT NULL DEFAULT 1;");
  }
  sqlite.exec("CREATE INDEX IF NOT EXISTS documents_project_version_idx ON documents(project_id, package_version_number);");

  const legacyProjects = sqlite
    .prepare(
      `SELECT p.id, COALESCE(MIN(d.created_at), p.created_at) AS created_at
       FROM projects p
       LEFT JOIN documents d ON d.project_id = p.id
       WHERE NOT EXISTS (SELECT 1 FROM package_versions pv WHERE pv.project_id = p.id)
       GROUP BY p.id`,
    )
    .all() as Array<{ id: string; created_at: number }>;
  const insertVersion = sqlite.prepare(
    "INSERT INTO package_versions (id, project_id, version_number, label, status, change_type, change_summary, created_at, updated_at, completed_at) VALUES (?, ?, 1, 'v1', 'ready', 'initial_generation', 'Initial package version backfilled from existing documents', ?, ?, ?)",
  );
  const updateDocs = sqlite.prepare(
    "UPDATE documents SET package_version_id = ?, package_version_number = 1 WHERE project_id = ? AND package_version_id IS NULL",
  );
  for (const project of legacyProjects) {
    const versionId = `${project.id}:v1`;
    insertVersion.run(versionId, project.id, project.created_at, project.created_at, project.created_at);
    updateDocs.run(versionId, project.id);
  }

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
