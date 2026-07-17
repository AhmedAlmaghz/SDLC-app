import { createOpenAI } from "@ai-sdk/openai";
import { eq } from "drizzle-orm";
import { env } from "../lib/env";
import { getDb } from "../queries/connection";
import { settings } from "@db/schema";

const SETTINGS_ID = "singleton";

export interface ResolvedAiConfig {
  configured: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
  smallModel: string;
}

/** قراءة إعدادات AI: قاعدة البيانات أولاً، ثم متغيرات البيئة كافتراضي. */
export function resolveAiConfig(): ResolvedAiConfig {
  const db = getDb();
  const row = db
    .select()
    .from(settings)
    .where(eq(settings.id, SETTINGS_ID))
    .limit(1)
    .all()[0];

  const baseUrl = (row?.aiBaseUrl || env.aiBaseUrl).replace(/\/+$/, "");
  const apiKey = row?.aiApiKey || env.aiApiKey;
  const model = row?.aiModel || env.aiModel;
  const smallModel = row?.aiSmallModel || env.aiSmallModel || model;

  return {
    configured: Boolean(apiKey),
    baseUrl,
    apiKey,
    model,
    smallModel,
  };
}

export function saveAiConfig(input: {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  smallModel?: string;
}) {
  const db = getDb();
  const current = db
    .select()
    .from(settings)
    .where(eq(settings.id, SETTINGS_ID))
    .limit(1)
    .all()[0];

  const next = {
    id: SETTINGS_ID,
    aiBaseUrl: input.baseUrl ?? current?.aiBaseUrl ?? "",
    aiApiKey: input.apiKey ?? current?.aiApiKey ?? "",
    aiModel: input.model ?? current?.aiModel ?? "",
    aiSmallModel: input.smallModel ?? current?.aiSmallModel ?? "",
    updatedAt: new Date(),
  };

  if (current) {
    db.update(settings).set(next).where(eq(settings.id, SETTINGS_ID)).run();
  } else {
    db.insert(settings).values(next).run();
  }
}

export function maskKey(key: string): string | null {
  if (!key) return null;
  if (key.length <= 8) return "••••";
  return `••••${key.slice(-4)}`;
}

/**
 * توجيه النماذج الذكي (Intelligent Model Routing) وفق الورقة:
 * المهام المعقدة (PRD، المعمارية، السياق، الخطة) → النموذج الرئيسي.
 * المهام القياسية (الاختبارات، الحواجز، النشر، خارطة الطريق) → النموذج الصغير الأرخص.
 */
export function getModel(complexity: "high" | "standard") {
  const cfg = resolveAiConfig();
  if (!cfg.configured) {
    throw new Error("AI provider is not configured");
  }
  const provider = createOpenAI({
    name: "openai-compatible",
    baseURL: cfg.baseUrl,
    apiKey: cfg.apiKey,
  });
  const modelId = complexity === "high" ? cfg.model : cfg.smallModel || cfg.model;
  return { model: provider.chat(modelId), modelId };
}
