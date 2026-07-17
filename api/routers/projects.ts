import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  DOC_DEFINITIONS,
  DOC_KEYS,
  type GeneratedDoc,
  type ProjectConfig,
  type ProjectDetail,
  type ProjectStatus,
  type ProjectSummary,
  type RunMetric,
} from "@contracts/types";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { documents, projects, runs } from "@db/schema";
import { isGenerating, regenerateSingleDoc, runGeneration } from "../ai/generator";
import { maskKey, resolveAiConfig, saveAiConfig } from "../ai/provider";

const configSchema = z.object({
  appType: z.enum(["web", "mobile", "api", "desktop", "cli", "aiAgent", "other"]),
  audience: z.string().max(500).default(""),
  scale: z.enum(["mvp", "growth", "enterprise"]),
  platforms: z.array(z.string().max(50)).max(8).default([]),
  features: z
    .array(
      z.enum([
        "auth",
        "payments",
        "realtime",
        "aiIntegration",
        "i18n",
        "offline",
        "adminPanel",
        "analytics",
        "notifications",
        "fileStorage",
        "search",
        "multiTenant",
      ]),
    )
    .max(12)
    .default([]),
  constraints: z.string().max(2000).default(""),
  docLanguage: z.enum(["ar", "en"]),
  preferredStack: z.string().max(500).default(""),
});

function toSummary(row: typeof projects.$inferSelect, docsCount: number): ProjectSummary {
  return {
    id: row.id,
    name: row.name,
    idea: row.idea,
    status: row.status as ProjectStatus,
    docLanguage: row.docLanguage as "ar" | "en",
    docsCount,
    totalDocs: DOC_DEFINITIONS.length,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const projectsRouter = createRouter({
  list: publicQuery.query((): ProjectSummary[] => {
    const db = getDb();
    const rows = db.select().from(projects).orderBy(desc(projects.createdAt)).all();
    const allDocs = db.select().from(documents).all();
    return rows.map((r) => toSummary(r, allDocs.filter((d) => d.projectId === r.id).length));
  }),

  get: publicQuery
    .input(z.object({ id: z.string().min(1) }))
    .query(({ input }): ProjectDetail => {
      const db = getDb();
      const row = db.select().from(projects).where(eq(projects.id, input.id)).limit(1).all()[0];
      if (!row) throw new Error("المشروع غير موجود");

      const docRows = db
        .select()
        .from(documents)
        .where(eq(documents.projectId, input.id))
        .all();
      const runRows = db
        .select()
        .from(runs)
        .where(eq(runs.projectId, input.id))
        .orderBy(desc(runs.createdAt))
        .limit(100)
        .all();

      const order = new Map(DOC_KEYS.map((k, i) => [k, i]));
      const docs: GeneratedDoc[] = docRows
        .sort((a, b) => (order.get(a.key as (typeof DOC_KEYS)[number]) ?? 99) - (order.get(b.key as (typeof DOC_KEYS)[number]) ?? 99))
        .map((d) => ({
          id: d.id,
          projectId: d.projectId,
          key: d.key as GeneratedDoc["key"],
          title: d.title,
          fileName: d.fileName,
          content: d.content,
          source: d.source as GeneratedDoc["source"],
          model: d.model,
          createdAt: d.createdAt,
        }));

      const metrics: RunMetric[] = runRows.map((r) => ({
        id: r.id,
        projectId: r.projectId,
        docKey: r.docKey,
        kind: r.kind,
        model: r.model,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        durationMs: r.durationMs,
        status: r.status,
        detail: r.detail,
        createdAt: r.createdAt,
      }));

      return {
        ...toSummary(row, docs.length),
        config: row.config as ProjectConfig,
        docs,
        metrics,
      };
    }),

  create: publicQuery
    .input(
      z.object({
        name: z.string().min(1, "اسم المشروع مطلوب").max(120),
        idea: z.string().min(20, "صف فكرتك في 20 حرفاً على الأقل").max(20000),
        config: configSchema,
      }),
    )
    .mutation(({ input }) => {
      const db = getDb();
      const id = randomUUID();
      db.insert(projects)
        .values({
          id,
          name: input.name.trim(),
          idea: input.idea.trim(),
          config: input.config,
          status: "generating",
          docLanguage: input.config.docLanguage,
        })
        .run();
      // إطلاق التوليد كمهمة خلفية — لا ننتظره
      void runGeneration(id);
      return { id };
    }),

  regenerate: publicQuery
    .input(z.object({ id: z.string().min(1) }))
    .mutation(({ input }) => {
      void runGeneration(input.id);
      return { ok: true };
    }),

  regenerateDoc: publicQuery
    .input(z.object({ id: z.string().min(1), key: z.enum(DOC_KEYS as [string, ...string[]]) }))
    .mutation(async ({ input }) => {
      await regenerateSingleDoc(input.id, input.key as (typeof DOC_KEYS)[number]);
      return { ok: true };
    }),

  remove: publicQuery
    .input(z.object({ id: z.string().min(1) }))
    .mutation(({ input }) => {
      const db = getDb();
      db.delete(documents).where(eq(documents.projectId, input.id)).run();
      db.delete(runs).where(eq(runs.projectId, input.id)).run();
      db.delete(projects).where(eq(projects.id, input.id)).run();
      return { ok: true };
    }),

  status: publicQuery.input(z.object({ id: z.string().min(1) })).query(({ input }) => {
    const db = getDb();
    const row = db.select().from(projects).where(eq(projects.id, input.id)).limit(1).all()[0];
    if (!row) throw new Error("المشروع غير موجود");
    const docsCount = db
      .select()
      .from(documents)
      .where(eq(documents.projectId, input.id))
      .all().length;
    return {
      status: row.status as ProjectStatus,
      docsCount,
      totalDocs: DOC_DEFINITIONS.length,
      generating: isGenerating(input.id),
    };
  }),
});

export const settingsRouter = createRouter({
  getAi: publicQuery.query(() => {
    const cfg = resolveAiConfig();
    return {
      configured: cfg.configured,
      baseUrl: cfg.baseUrl,
      model: cfg.model,
      smallModel: cfg.smallModel,
      apiKeyMasked: maskKey(cfg.apiKey),
    };
  }),

  saveAi: publicQuery
    .input(
      z.object({
        baseUrl: z.string().url().max(300),
        apiKey: z.string().max(300).optional(),
        model: z.string().min(1).max(120),
        smallModel: z.string().max(120).default(""),
      }),
    )
    .mutation(({ input }) => {
      saveAiConfig({
        baseUrl: input.baseUrl,
        apiKey: input.apiKey?.trim() ? input.apiKey.trim() : undefined,
        model: input.model,
        smallModel: input.smallModel,
      });
      const cfg = resolveAiConfig();
      return { configured: cfg.configured, apiKeyMasked: maskKey(cfg.apiKey) };
    }),

  clearAiKey: publicQuery.mutation(() => {
    saveAiConfig({ apiKey: "" });
    return { ok: true };
  }),
});
