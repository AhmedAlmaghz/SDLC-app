import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/**
 * إعداد التطوير — SQLite.
 * للإنتاج (PostgreSQL) استخدم: drizzle-kit --config=drizzle.config.pg.ts
 */
export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.SQLITE_PATH ?? "./data/mirwr.db",
  },
});
