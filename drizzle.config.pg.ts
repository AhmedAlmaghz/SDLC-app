import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/**
 * إعداد الإنتاج — PostgreSQL.
 * DATABASE_URL=postgres://user:pass@host:5432/dbname
 * توليد الهجرات:  npm run db:generate:pg
 * تطبيق الهجرات:  npm run db:migrate:pg
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL (postgres://...) مطلوب لأوامر drizzle الخاصة بالإنتاج");
}

export default defineConfig({
  schema: "./db/schema.pg.ts",
  out: "./db/migrations-pg",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
