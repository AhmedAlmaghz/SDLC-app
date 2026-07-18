import { randomUUID } from "node:crypto";
import { createGoogle } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { desc, eq } from "drizzle-orm";
import type { LanguageModel } from "ai";
import { env } from "../lib/env";
import { getDb } from "../queries/connection";
import { providerSettings, settings } from "@db/schema";
import type { SavedProvider, SavedProviderInput } from "@contracts/types";

const SETTINGS_ID = "singleton";

export const AI_PROVIDER_IDS = ["openai-compatible", "anthropic", "gemini", "openrouter", "groq", "mistral"] as const;
export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];

export interface AiProviderDefinition {
  id: AiProviderId;
  label: string;
  baseUrl: string;
  requiresBaseUrl: boolean;
  model: string;
  smallModel: string;
  helpText: string;
}

export const AI_PROVIDER_DEFINITIONS: Record<AiProviderId, AiProviderDefinition> = {
  "openai-compatible": {
    id: "openai-compatible",
    label: "OpenCode / OpenAI-compatible",
    baseUrl: "https://api.moonshot.ai/v1",
    requiresBaseUrl: true,
    model: "kimi-k2-0905-preview",
    smallModel: "kimi-k2-0905-preview",
    helpText: "Use for OpenCode, Moonshot, OpenAI, or any OpenAI-compatible endpoint.",
  },
  "anthropic": {
    id: "anthropic",
    label: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    requiresBaseUrl: true,
    model: "claude-sonnet-5",
    smallModel: "claude-sonnet-4-5",
    helpText: "Anthropic API provider. Enter the Base URL, API key, and model from your Anthropic setup.",
  },
  gemini: {
    id: "gemini",
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    requiresBaseUrl: false,
    model: "gemini-2.5-pro",
    smallModel: "gemini-2.5-flash",
    helpText: "Uses the official Google Generative Language API provider.",
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    requiresBaseUrl: false,
    model: "openai/gpt-4o-mini",
    smallModel: "openai/gpt-4o-mini",
    helpText: "OpenRouter is OpenAI-compatible; include provider-prefixed model IDs.",
  },
  groq: {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    requiresBaseUrl: false,
    model: "llama-3.3-70b-versatile",
    smallModel: "llama-3.1-8b-instant",
    helpText: "Uses the official Groq AI SDK provider.",
  },
  mistral: {
    id: "mistral",
    label: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    requiresBaseUrl: false,
    model: "mistral-large-latest",
    smallModel: "mistral-small-latest",
    helpText: "Uses the official Mistral AI SDK provider.",
  },
};

export interface ResolvedAiConfig {
  configured: boolean;
  provider: AiProviderId;
  providerLabel: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  smallModel: string;
  /** معرّف المزوّد المحفوظ النشط إن وُجد، أو null عند الاعتماد على الإعدادات الافتراضية/البيئة */
  activeProviderId: string | null;
  /** مصدر التهيئة الحالي */
  source: "saved" | "env" | "default";
}

function normalizeProvider(provider?: string | null): AiProviderId {
  return AI_PROVIDER_IDS.includes(provider as AiProviderId) ? (provider as AiProviderId) : "openai-compatible";
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

/** يُرجع المزوّد المحفوظ النشط حالياً (واحد فقط) أو null. */
export function getActiveSavedProvider() {
  const db = getDb();
  return (
    db
      .select()
      .from(providerSettings)
      .where(eq(providerSettings.isActive, true))
      .limit(1)
      .all()[0] ?? null
  );
}

/**
 * قراءة إعدادات AI:
 * 1) المزوّد المحفوظ النشط (إن وُجد) — أولوية قصوى.
 * 2) صف الإعدادات الافتراضي (singleton) — توافق مع الإصدارات السابقة.
 * 3) متغيرات البيئة كقيم افتراضية.
 */
export function resolveAiConfig(): ResolvedAiConfig {
  const db = getDb();

  const active = getActiveSavedProvider();
  if (active) {
    const provider = normalizeProvider(active.provider);
    const definition = AI_PROVIDER_DEFINITIONS[provider];
    return {
      configured: Boolean(active.apiKey),
      provider,
      providerLabel: definition.label,
      baseUrl: trimTrailingSlash(active.baseUrl || definition.baseUrl),
      apiKey: active.apiKey,
      model: active.model || definition.model,
      smallModel: active.smallModel || definition.smallModel || active.model || definition.model,
      activeProviderId: active.id,
      source: "saved",
    };
  }

  const row = db
    .select()
    .from(settings)
    .where(eq(settings.id, SETTINGS_ID))
    .limit(1)
    .all()[0];

  const provider = normalizeProvider(row?.aiProvider || env.aiProvider);
  const definition = AI_PROVIDER_DEFINITIONS[provider];
  const baseUrl = trimTrailingSlash(row?.aiBaseUrl || env.aiBaseUrl || definition.baseUrl);
  const apiKey = row?.aiApiKey || env.aiApiKey;
  const model = row?.aiModel || env.aiModel || definition.model;
  const smallModel = row?.aiSmallModel || env.aiSmallModel || definition.smallModel || model;

  // مصدر البيئة إن لم يكن هناك صف إعدادات، وإلا الإعدادات الافتراضية المحفوظة.
  const source: ResolvedAiConfig["source"] = row ? "default" : "env";

  return {
    configured: Boolean(apiKey),
    provider,
    providerLabel: definition.label,
    baseUrl,
    apiKey,
    model,
    smallModel,
    activeProviderId: null,
    source,
  };
}

export function saveAiConfig(input: {
  provider?: AiProviderId;
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

  const provider = input.provider ?? normalizeProvider(current?.aiProvider || env.aiProvider);
  const definition = AI_PROVIDER_DEFINITIONS[provider];
  const next = {
    id: SETTINGS_ID,
    aiProvider: provider,
    aiBaseUrl: input.baseUrl ?? current?.aiBaseUrl ?? definition.baseUrl,
    aiApiKey: input.apiKey ?? current?.aiApiKey ?? "",
    aiModel: input.model ?? current?.aiModel ?? definition.model,
    aiSmallModel: input.smallModel ?? current?.aiSmallModel ?? definition.smallModel,
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
  if (key.length <= 8) return "****";
  return `****${key.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// مزوّدات محفوظة مسمّاة (CRUD)
// ---------------------------------------------------------------------------

function toSavedProvider(row: typeof providerSettings.$inferSelect): SavedProvider {
  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    baseUrl: row.baseUrl,
    model: row.model,
    smallModel: row.smallModel,
    apiKeyMasked: maskKey(row.apiKey),
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** قائمة كل المزوّدات المحفوظة (الأحدث أولاً). */
export function listSavedProviders(): SavedProvider[] {
  const db = getDb();
  const rows = db.select().from(providerSettings).orderBy(desc(providerSettings.createdAt)).all();
  return rows.map(toSavedProvider);
}

/** إنشاء مزوّد محفوظ جديد. إن طُلب أن يكون نشطاً، يُلغى تفعيل الباقي. */
export function createSavedProvider(input: SavedProviderInput, makeActive = false): SavedProvider {
  const db = getDb();
  const id = randomUUID();
  const provider = normalizeProvider(input.provider);
  const definition = AI_PROVIDER_DEFINITIONS[provider];
  const now = new Date();

  if (makeActive) {
    db.update(providerSettings).set({ isActive: false, updatedAt: now }).where(eq(providerSettings.isActive, true)).run();
  }

  db.insert(providerSettings)
    .values({
      id,
      name: input.name.trim(),
      provider,
      baseUrl: input.baseUrl.trim() || definition.baseUrl,
      apiKey: input.apiKey?.trim() ?? "",
      model: input.model.trim() || definition.model,
      smallModel: input.smallModel?.trim() ?? definition.smallModel,
      isActive: makeActive,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const row = db.select().from(providerSettings).where(eq(providerSettings.id, id)).limit(1).all()[0];
  return toSavedProvider(row);
}

/** تحديث مزوّد محفوظ. المفتاح اختياري — إن لم يُمرّر يُحتفظ بالقيمة الحالية. */
export function updateSavedProvider(id: string, input: Partial<SavedProviderInput>): SavedProvider {
  const db = getDb();
  const current = db.select().from(providerSettings).where(eq(providerSettings.id, id)).limit(1).all()[0];
  if (!current) throw new Error("المزوّد غير موجود");

  const provider = input.provider ? normalizeProvider(input.provider) : (current.provider as AiProviderId);
  const definition = AI_PROVIDER_DEFINITIONS[provider];
  const next: Partial<typeof providerSettings.$inferSelect> & { updatedAt: Date } = {
    provider,
    updatedAt: new Date(),
  };
  if (input.name !== undefined) next.name = input.name.trim();
  if (input.baseUrl !== undefined) next.baseUrl = input.baseUrl.trim() || definition.baseUrl;
  if (input.model !== undefined) next.model = input.model.trim() || definition.model;
  if (input.smallModel !== undefined) next.smallModel = input.smallModel.trim() || definition.smallModel;
  if (input.apiKey !== undefined) next.apiKey = input.apiKey.trim();

  db.update(providerSettings).set(next).where(eq(providerSettings.id, id)).run();
  const row = db.select().from(providerSettings).where(eq(providerSettings.id, id)).limit(1).all()[0];
  return toSavedProvider(row);
}

/** حذف مزوّد محفوظ. إن كان النشط، يبقى النظام بلا مزوّد نشط (يعود للإعدادات الافتراضية/البيئة). */
export function deleteSavedProvider(id: string): { ok: true } {
  const db = getDb();
  db.delete(providerSettings).where(eq(providerSettings.id, id)).run();
  return { ok: true };
}

/** تعيين مزوّد محفوظ كنشط/افتراضي — يُلغي تفعيل أي مزوّد آخر. */
export function setActiveSavedProvider(id: string): SavedProvider {
  const db = getDb();
  const target = db.select().from(providerSettings).where(eq(providerSettings.id, id)).limit(1).all()[0];
  if (!target) throw new Error("المزوّد غير موجود");
  const now = new Date();
  // إلغاء تفعيل الجميع ثم تفعيل المطلوب ضمن معاملة منطقية
  db.update(providerSettings).set({ isActive: false, updatedAt: now }).where(eq(providerSettings.isActive, true)).run();
  db.update(providerSettings).set({ isActive: true, updatedAt: now }).where(eq(providerSettings.id, id)).run();
  const row = db.select().from(providerSettings).where(eq(providerSettings.id, id)).limit(1).all()[0];
  return toSavedProvider(row);
}

/** إلغاء تفعيل كل المزوّدات المحفوظة (العودة للإعدادات الافتراضية/البيئة). */
export function clearActiveSavedProvider(): { ok: true } {
  const db = getDb();
  db.update(providerSettings)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(providerSettings.isActive, true))
    .run();
  return { ok: true };
}

function createLanguageModel(cfg: ResolvedAiConfig, modelId: string): LanguageModel {
  switch (cfg.provider) {
    case "gemini":
      return createGoogle({ apiKey: cfg.apiKey, baseURL: cfg.baseUrl })(modelId);
    case "groq":
      return createGroq({ apiKey: cfg.apiKey, baseURL: cfg.baseUrl })(modelId);
    case "mistral":
      return createMistral({ apiKey: cfg.apiKey, baseURL: cfg.baseUrl })(modelId);
    case "openrouter":
      return createOpenAI({ name: "openrouter", baseURL: cfg.baseUrl, apiKey: cfg.apiKey }).chat(modelId);
    case "anthropic":
      return createAnthropic({ name: "anthropic", baseURL: cfg.baseUrl, apiKey: cfg.apiKey }).chat(modelId);
    case "openai-compatible":
    default:
      return createOpenAI({ name: "openai-compatible", baseURL: cfg.baseUrl, apiKey: cfg.apiKey }).chat(modelId);
  }
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
  const modelId = complexity === "high" ? cfg.model : cfg.smallModel || cfg.model;
  return { model: createLanguageModel(cfg, modelId), modelId, provider: cfg.provider, providerLabel: cfg.providerLabel };
}
