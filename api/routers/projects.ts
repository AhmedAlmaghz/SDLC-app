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
  type PackageVersion,
  type AiSettingsFullView,
} from "@contracts/types";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { documents, packageVersions, projects, runs } from "@db/schema";
import { isGenerating, regenerateSingleDoc, runGeneration, updateProjectInputs } from "../ai/generator";
import {
  AI_PROVIDER_DEFINITIONS,
  AI_PROVIDER_IDS,
  clearActiveSavedProvider,
  createSavedProvider,
  deleteSavedProvider,
  listSavedProviders,
  maskKey,
  resolveAiConfig,
  saveAiConfig,
  setActiveSavedProvider,
  updateSavedProvider,
} from "../ai/provider";

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
  preferredCodeAgent: z.enum(["codex", "claudeCode", "cursor", "roo", "cline", "githubCopilot", "windsurf", "generic", "other", "none"]).optional(),
  applicationMode: z.enum(["mvp", "existingApp", "enterpriseApp", "newBuild", "featureExpansion", "migration"]).optional(),
  professionalContext: z
    .object({
      existingAppContext: z.string().max(3000).optional(),
      deliveryConstraints: z.string().max(2000).optional(),
      nonFunctionalPriorities: z.string().max(2000).optional(),
      integrations: z.string().max(2000).optional(),
      deploymentTarget: z.string().max(1000).optional(),
      qualityProfile: z.string().max(1000).optional(),
      successMetrics: z.string().max(2000).optional(),
      securityCompliance: z.string().max(2000).optional(),
    })
    .optional(),
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

function toPackageVersion(row: typeof packageVersions.$inferSelect): PackageVersion {
  return {
    id: row.id,
    projectId: row.projectId,
    versionNumber: row.versionNumber,
    label: row.label,
    status: row.status as PackageVersion["status"],
    changeType: row.changeType as PackageVersion["changeType"],
    changeSummary: row.changeSummary,
    createdFromVersionNumber: row.createdFromVersionNumber,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
  };
}

function latestVersionNumber(rows: Array<typeof packageVersions.$inferSelect>, projectId: string): number {
  return rows.filter((v) => v.projectId === projectId).sort((a, b) => b.versionNumber - a.versionNumber)[0]?.versionNumber ?? 1;
}

export const projectsRouter = createRouter({
  list: publicQuery.query((): ProjectSummary[] => {
    const db = getDb();
    const rows = db.select().from(projects).orderBy(desc(projects.createdAt)).all();
    const allDocs = db.select().from(documents).all();
    const allVersions = db.select().from(packageVersions).all();
    return rows.map((r) => {
      const currentVersion = latestVersionNumber(allVersions, r.id);
      return toSummary(r, allDocs.filter((d) => d.projectId === r.id && d.packageVersionNumber === currentVersion).length);
    });
  }),

  get: publicQuery
    .input(z.object({ id: z.string().min(1) }))
    .query(({ input }): ProjectDetail => {
      const db = getDb();
      const row = db.select().from(projects).where(eq(projects.id, input.id)).limit(1).all()[0];
      if (!row) throw new Error("المشروع غير موجود");

      const versionRows = db
        .select()
        .from(packageVersions)
        .where(eq(packageVersions.projectId, input.id))
        .orderBy(desc(packageVersions.versionNumber))
        .all();
      const currentVersionNumber = versionRows[0]?.versionNumber ?? 1;
      const docRows = db
        .select()
        .from(documents)
        .where(eq(documents.projectId, input.id))
        .all()
        .filter((d) => d.packageVersionNumber === currentVersionNumber);
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
          packageVersionId: d.packageVersionId,
          packageVersionNumber: d.packageVersionNumber,
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
        currentVersion: versionRows[0] ? toPackageVersion(versionRows[0]) : null,
        versions: versionRows.map(toPackageVersion),
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
      void runGeneration(id, { changeType: "initial_generation", changeSummary: "Initial package generation" });
      return { id };
    }),

  regenerate: publicQuery
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1).max(120).optional(),
        idea: z.string().min(20).max(20000).optional(),
        config: configSchema.optional(),
        changeSummary: z.string().max(500).optional(),
      }),
    )
    .mutation(({ input }) => {
      if (input.name && input.idea && input.config) {
        updateProjectInputs(input.id, { name: input.name, idea: input.idea, config: input.config });
        void runGeneration(input.id, { changeType: "config_update", changeSummary: input.changeSummary ?? "Project inputs/config updated" });
      } else {
        void runGeneration(input.id, { changeType: "full_regeneration", changeSummary: input.changeSummary ?? "Full project regeneration" });
      }
      return { ok: true };
    }),

  regenerateDoc: publicQuery
    .input(z.object({ id: z.string().min(1), key: z.enum(DOC_KEYS as [string, ...string[]]), changeSummary: z.string().max(500).optional() }))
    .mutation(async ({ input }) => {
      await regenerateSingleDoc(input.id, input.key as (typeof DOC_KEYS)[number], input.changeSummary);
      return { ok: true };
    }),

  remove: publicQuery
    .input(z.object({ id: z.string().min(1) }))
    .mutation(({ input }) => {
      const db = getDb();
      db.delete(documents).where(eq(documents.projectId, input.id)).run();
      db.delete(packageVersions).where(eq(packageVersions.projectId, input.id)).run();
      db.delete(runs).where(eq(runs.projectId, input.id)).run();
      db.delete(projects).where(eq(projects.id, input.id)).run();
      return { ok: true };
    }),

  status: publicQuery.input(z.object({ id: z.string().min(1) })).query(({ input }) => {
    const db = getDb();
    const row = db.select().from(projects).where(eq(projects.id, input.id)).limit(1).all()[0];
    if (!row) throw new Error("المشروع غير موجود");
    const latestVersion = db
      .select()
      .from(packageVersions)
      .where(eq(packageVersions.projectId, input.id))
      .orderBy(desc(packageVersions.versionNumber))
      .limit(1)
      .all()[0]?.versionNumber ?? 1;
    const docsCount = db
      .select()
      .from(documents)
      .where(eq(documents.projectId, input.id))
      .all()
      .filter((d) => d.packageVersionNumber === latestVersion).length;
    return {
      status: row.status as ProjectStatus,
      docsCount,
      totalDocs: DOC_DEFINITIONS.length,
      generating: isGenerating(input.id),
    };
  }),
});

const providerInputSchema = z.object({
  name: z.string().min(1, "اسم الإعداد مطلوب").max(80),
  provider: z.enum(AI_PROVIDER_IDS),
  baseUrl: z.string().url().max(300),
  apiKey: z.string().max(500).optional(),
  model: z.string().min(1).max(160),
  smallModel: z.string().max(160).default(""),
});

function providerOptions() {
  return Object.values(AI_PROVIDER_DEFINITIONS).map(({ id, label, baseUrl, requiresBaseUrl, model, smallModel, helpText }) => ({
    id,
    label,
    baseUrl,
    requiresBaseUrl,
    model,
    smallModel,
    helpText,
  }));
}

export const settingsRouter = createRouter({
  getAi: publicQuery.query((): AiSettingsFullView => {
    const cfg = resolveAiConfig();
    return {
      configured: cfg.configured,
      provider: cfg.provider,
      providerLabel: cfg.providerLabel,
      baseUrl: cfg.baseUrl,
      model: cfg.model,
      smallModel: cfg.smallModel,
      apiKeyMasked: maskKey(cfg.apiKey),
      activeProviderId: cfg.activeProviderId,
      source: cfg.source,
      providers: providerOptions(),
      savedProviders: listSavedProviders(),
    };
  }),

  saveAi: publicQuery
    .input(
      z.object({
        provider: z.enum(AI_PROVIDER_IDS),
        baseUrl: z.string().url().max(300),
        apiKey: z.string().max(500).optional(),
        model: z.string().min(1).max(160),
        smallModel: z.string().max(160).default(""),
      }),
    )
    .mutation(({ input }) => {
      saveAiConfig({
        provider: input.provider,
        baseUrl: input.baseUrl,
        apiKey: input.apiKey?.trim() ? input.apiKey.trim() : undefined,
        model: input.model.trim(),
        smallModel: input.smallModel.trim(),
      });
      clearActiveSavedProvider();
      const cfg = resolveAiConfig();
      return { configured: cfg.configured, apiKeyMasked: maskKey(cfg.apiKey) };
    }),

  clearAiKey: publicQuery.mutation(() => {
    saveAiConfig({ apiKey: "" });
    return { ok: true };
  }),

  listProviders: publicQuery.query(() => listSavedProviders()),

  createProvider: publicQuery
    .input(providerInputSchema.extend({ makeActive: z.boolean().default(false) }))
    .mutation(({ input }) => createSavedProvider(input, input.makeActive)),

  updateProvider: publicQuery
    .input(
      providerInputSchema.partial().extend({
        id: z.string().min(1),
      }),
    )
    .mutation(({ input }) => updateSavedProvider(input.id, input)),

  deleteProvider: publicQuery.input(z.object({ id: z.string().min(1) })).mutation(({ input }) => deleteSavedProvider(input.id)),

  setActiveProvider: publicQuery.input(z.object({ id: z.string().min(1) })).mutation(({ input }) => setActiveSavedProvider(input.id)),

  clearActiveProvider: publicQuery.mutation(() => clearActiveSavedProvider()),
});
