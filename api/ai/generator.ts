import { randomUUID } from "node:crypto";
import { generateText } from "ai";
import { asc, eq, max } from "drizzle-orm";
import { DOC_DEFINITIONS, type DocKey, type ProjectConfig } from "@contracts/types";
import { getDb } from "../queries/connection";
import { documents, packageVersions, projects, runs } from "@db/schema";
import { buildDocPrompt, SYSTEM_PROMPT } from "./prompts";
import { generateFromTemplate } from "./templates";
import { getModel, resolveAiConfig } from "./provider";

/**
 * منسّق التوليد — «نموذج المصنع» عملياً:
 * مواصفات → توليد عبر AI SDK → قياس (رموز/زمن/نموذج).
 * يستخدم القوالب فقط عند عدم ضبط مفتاح AI؛ أما فشل المزود فيفشل بوضوح.
 * يعمل كمهمة خلفية غير متزامنة، والواجهة تستطلع الحالة (Orchestrator pattern).
 */

const activeJobs = new Set<string>();

export function isGenerating(projectId: string): boolean {
  return activeJobs.has(projectId);
}

function recordRun(entry: {
  projectId: string;
  docKey?: string;
  kind: string;
  model?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  durationMs?: number | null;
  status: string;
  detail?: string | null;
}) {
  getDb()
    .insert(runs)
    .values({
      id: randomUUID(),
      projectId: entry.projectId,
      docKey: entry.docKey ?? null,
      kind: entry.kind,
      model: entry.model ?? null,
      inputTokens: entry.inputTokens ?? null,
      outputTokens: entry.outputTokens ?? null,
      durationMs: entry.durationMs ?? null,
      status: entry.status,
      detail: entry.detail ?? null,
    })
    .run();
}

function formatAiError(err: unknown): string {
  if (err instanceof Error) return err.message.slice(0, 500);
  return String(err).slice(0, 500);
}

type PackageChangeType = "initial_generation" | "full_regeneration" | "config_update" | "single_doc_regeneration";

function latestPackageVersion(projectId: string) {
  return getDb()
    .select()
    .from(packageVersions)
    .where(eq(packageVersions.projectId, projectId))
    .all()
    .sort((a, b) => b.versionNumber - a.versionNumber)[0] ?? null;
}

function createPackageVersion(
  projectId: string,
  metadata: {
    changeType: PackageChangeType;
    changeSummary: string;
    createdFromVersionNumber?: number | null;
    status?: "queued" | "generating" | "updating" | "ready" | "failed";
  },
) {
  const db = getDb();
  const latest = db
    .select({ value: max(packageVersions.versionNumber) })
    .from(packageVersions)
    .where(eq(packageVersions.projectId, projectId))
    .all()[0]?.value ?? 0;
  const versionNumber = latest + 1;
  const now = new Date();
  const version = {
    id: randomUUID(),
    projectId,
    versionNumber,
    label: `v${versionNumber}`,
    status: metadata.status ?? "queued",
    changeType: metadata.changeType,
    changeSummary: metadata.changeSummary,
    createdFromVersionNumber: metadata.createdFromVersionNumber ?? null,
    updatedAt: now,
    completedAt: null,
  };
  db.insert(packageVersions).values(version).run();
  return version;
}

function updatePackageVersionStatus(versionId: string, status: "generating" | "updating" | "ready" | "failed") {
  getDb()
    .update(packageVersions)
    .set({ status, updatedAt: new Date(), completedAt: status === "ready" || status === "failed" ? new Date() : null })
    .where(eq(packageVersions.id, versionId))
    .run();
}

function insertDoc(entry: {
  projectId: string;
  packageVersionId: string;
  packageVersionNumber: number;
  key: DocKey;
  title: string;
  fileName: string;
  content: string;
  source: "ai" | "template" | "ai-fallback";
  model: string | null;
}) {
  getDb()
    .insert(documents)
    .values({
      id: randomUUID(),
      projectId: entry.projectId,
      packageVersionId: entry.packageVersionId,
      packageVersionNumber: entry.packageVersionNumber,
      key: entry.key,
      title: entry.title,
      fileName: entry.fileName,
      content: entry.content,
      source: entry.source,
      model: entry.model,
    })
    .run();
}

function copyLatestDocsToVersion(projectId: string, version: { id: string; versionNumber: number }, exceptKey?: DocKey) {
  const latest = latestPackageVersion(projectId);
  if (!latest) return;
  const existingDocs = getDb()
    .select()
    .from(documents)
    .where(eq(documents.projectId, projectId))
    .all()
    .filter((doc) => doc.packageVersionNumber === latest.versionNumber && doc.key !== exceptKey);

  for (const doc of existingDocs) {
    insertDoc({
      projectId,
      packageVersionId: version.id,
      packageVersionNumber: version.versionNumber,
      key: doc.key as DocKey,
      title: doc.title,
      fileName: doc.fileName,
      content: doc.content,
      source: doc.source as "ai" | "template" | "ai-fallback",
      model: doc.model,
    });
  }
}

async function generateOneDoc(
  def: (typeof DOC_DEFINITIONS)[number],
  name: string,
  idea: string,
  config: ProjectConfig,
  projectId: string,
) {
  const started = Date.now();
  const cfg = resolveAiConfig();

  if (cfg.configured) {
    const selectedModelId = def.complexity === "high" ? cfg.model : cfg.smallModel || cfg.model;
    try {
      const { model, modelId } = getModel(def.complexity);
      const result = await generateText({
        model,
        system: SYSTEM_PROMPT,
        prompt: buildDocPrompt(def, name, idea, config),
        maxOutputTokens: 8000,
      });
      const durationMs = Date.now() - started;
      recordRun({
        projectId,
        docKey: def.key,
        kind: "doc",
        model: `${cfg.provider}:${modelId}`,
        inputTokens: result.usage?.inputTokens ?? null,
        outputTokens: result.usage?.outputTokens ?? null,
        durationMs,
        status: "ok",
        detail: "ai",
      });
      return {
        projectId,
        key: def.key,
        title: config.docLanguage === "ar" ? def.titleAr : def.titleEn,
        fileName: def.fileName,
        content: result.text.trim(),
        source: "ai" as const,
        model: `${cfg.provider}:${modelId}`,
      };
    } catch (err) {
      const durationMs = Date.now() - started;
      const message = formatAiError(err);
      recordRun({
        projectId,
        docKey: def.key,
        kind: "doc",
        model: `${cfg.provider}:${selectedModelId}`,
        durationMs,
        status: "error",
        detail: `AI provider failed; generation stopped: ${message}`,
      });
      throw new Error(`AI provider ${cfg.providerLabel} failed for ${def.key} using model ${selectedModelId}: ${message}`);
    }
  }

  const tpl = generateFromTemplate(def.key, name, idea, config);
  recordRun({
    projectId,
    docKey: def.key,
    kind: "doc",
    durationMs: Date.now() - started,
    status: "ok",
    detail: "template (no AI key configured)",
  });
  return {
    projectId,
    key: def.key,
    title: tpl.title,
    fileName: tpl.fileName,
    content: tpl.content,
    source: "template" as const,
    model: null,
  };
}

export async function runGeneration(
  projectId: string,
  options: { changeType?: PackageChangeType; changeSummary?: string } = {},
): Promise<void> {
  if (activeJobs.has(projectId)) return;
  activeJobs.add(projectId);

  const db = getDb();
  try {
    const project = db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)
      .all()[0];
    if (!project) return;

    db.update(projects)
      .set({ status: "generating", updatedAt: new Date() })
      .where(eq(projects.id, projectId))
      .run();

    const config = project.config as ProjectConfig;
    const previousVersion = latestPackageVersion(projectId);
    const version = createPackageVersion(projectId, {
      changeType: options.changeType ?? (previousVersion ? "full_regeneration" : "initial_generation"),
      changeSummary: options.changeSummary ?? (previousVersion ? "Full project regeneration" : "Initial package generation"),
      createdFromVersionNumber: previousVersion?.versionNumber ?? null,
      status: "generating",
    });

    for (const def of DOC_DEFINITIONS) {
      const doc = await generateOneDoc(def, project.name, project.idea, config, projectId);
      insertDoc({
        ...doc,
        packageVersionId: version.id,
        packageVersionNumber: version.versionNumber,
      });
      db.update(projects)
        .set({ updatedAt: new Date() })
        .where(eq(projects.id, projectId))
        .run();
    }

    updatePackageVersionStatus(version.id, "ready");
    db.update(projects)
      .set({ status: "ready", updatedAt: new Date() })
      .where(eq(projects.id, projectId))
      .run();
  } catch (err) {
    recordRun({
      projectId,
      kind: "job",
      status: "error",
      detail: err instanceof Error ? err.message.slice(0, 500) : String(err),
    });
    const failedVersion = latestPackageVersion(projectId);
    if (failedVersion?.status !== "ready") updatePackageVersionStatus(failedVersion.id, "failed");
    db.update(projects)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(projects.id, projectId))
      .run();
  } finally {
    activeJobs.delete(projectId);
  }
}

export async function regenerateSingleDoc(
  projectId: string,
  key: DocKey,
  changeSummary = `Regenerated ${key}`,
): Promise<void> {
  const db = getDb();
  const project = db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
    .all()[0];
  if (!project) throw new Error("Project not found");

  const def = DOC_DEFINITIONS.find((d) => d.key === key);
  if (!def) throw new Error("Unknown doc key");

  const previousVersion = latestPackageVersion(projectId);
  const version = createPackageVersion(projectId, {
    changeType: "single_doc_regeneration",
    changeSummary,
    createdFromVersionNumber: previousVersion?.versionNumber ?? null,
    status: "updating",
  });

  db.update(projects).set({ status: "generating", updatedAt: new Date() }).where(eq(projects.id, projectId)).run();
  try {
    copyLatestDocsToVersion(projectId, version, key);
    const doc = await generateOneDoc(def, project.name, project.idea, project.config as ProjectConfig, projectId);
    insertDoc({ ...doc, packageVersionId: version.id, packageVersionNumber: version.versionNumber });
    updatePackageVersionStatus(version.id, "ready");
    db.update(projects).set({ status: "ready", updatedAt: new Date() }).where(eq(projects.id, projectId)).run();
  } catch (err) {
    updatePackageVersionStatus(version.id, "failed");
    db.update(projects).set({ status: "failed", updatedAt: new Date() }).where(eq(projects.id, projectId)).run();
    throw err;
  }
}

export function updateProjectInputs(projectId: string, input: { name: string; idea: string; config: ProjectConfig }) {
  getDb()
    .update(projects)
    .set({
      name: input.name.trim(),
      idea: input.idea.trim(),
      config: input.config,
      docLanguage: input.config.docLanguage,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))
    .run();
}

/** إنقاذ المشاريع العالقة في حالة "generating" بعد إعادة تشغيل الخادم. */
export function recoverStuckProjects() {
  const db = getDb();
  const stuck = db.select().from(projects).where(eq(projects.status, "generating")).all();
  for (const p of stuck) {
    const docs = db
      .select()
      .from(documents)
      .where(eq(documents.projectId, p.id))
      .orderBy(asc(documents.createdAt))
      .all();
    db.update(projects)
      .set({
        status: docs.length >= DOC_DEFINITIONS.length ? "ready" : "failed",
        updatedAt: new Date(),
      })
      .where(eq(projects.id, p.id))
      .run();
    if (docs.length < DOC_DEFINITIONS.length) {
      recordRun({
        projectId: p.id,
        kind: "job",
        status: "error",
        detail: "recovered as failed after server restart",
      });
    }
  }
}
