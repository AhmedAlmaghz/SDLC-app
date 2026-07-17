import "dotenv/config";

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  isProduction: process.env.NODE_ENV === "production",

  /**
   * قاعدة البيانات:
   * - التطوير: SQLite عبر SQLITE_PATH (افتراضياً ./data/mirwr.db)
   * - الإنتاج: PostgreSQL عبر DATABASE_URL=postgres://user:pass@host:5432/db
   */
  databaseUrl: optional("DATABASE_URL"),
  sqlitePath: optional("SQLITE_PATH", "./data/mirwr.db"),

  /**
   * مزوّد الذكاء الاصطناعي (Vercel AI SDK — متوافق مع OpenAI).
   * يمكن أيضاً ضبطها من صفحة الإعدادات وتُخزَّن في قاعدة البيانات،
   * ومتغيرات البيئة تُستخدم كقيم افتراضية.
   */
  aiBaseUrl: optional("AI_BASE_URL", "https://api.moonshot.ai/v1"),
  aiApiKey: optional("AI_API_KEY"),
  aiModel: optional("AI_MODEL", "kimi-k2-0905-preview"),
  aiSmallModel: optional("AI_SMALL_MODEL", "kimi-k2-0905-preview"),

  usePostgres(): boolean {
    return /^postgres(ql)?:\/\//i.test(this.databaseUrl);
  },
};
