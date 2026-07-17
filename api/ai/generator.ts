import { randomUUID } from "node:crypto";
import { generateText } from "ai";
import { asc, eq } from "drizzle-orm";
import { DOC_DEFINITIONS, type DocKey, type ProjectConfig } from "@contracts/types";
import { getDb } from "../queries/connection";
import { documents, projects, runs } from "@db/schema";
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

function upsertDoc(entry: {
  projectId: string;
  key: DocKey;
  title: string;
  fileName: string;
  content: string;
  source: "ai" | "template" | "ai-fallback";
  model: string | null;
}) {
  const db = getDb();
  const existing = db
    .select()
    .from(documents)
    .where(eq(documents.projectId, entry.projectId))
    .all()
    .find((d) => d.key === entry.key);

  if (existing) {
    db.update(documents)
      .set({
        title: entry.title,
        fileName: entry.fileName,
        content: entry.content,
        source: entry.source,
        model: entry.model,
      })
      .where(eq(documents.id, existing.id))
      .run();
  } else {
    db.insert(documents)
      .values({
        id: randomUUID(),
        projectId: entry.projectId,
        key: entry.key,
        title: entry.title,
        fileName: entry.fileName,
        content: entry.content,
        source: entry.source,
        model: entry.model,
      })
      .run();
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

export async function runGeneration(projectId: string): Promise<void> {
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

    for (const def of DOC_DEFINITIONS) {
      const doc = await generateOneDoc(def, project.name, project.idea, config, projectId);
      upsertDoc(doc);
      db.update(projects)
        .set({ updatedAt: new Date() })
        .where(eq(projects.id, projectId))
        .run();
    }

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

  const doc = await generateOneDoc(def, project.name, project.idea, project.config as ProjectConfig, projectId);
  upsertDoc(doc);
  db.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, projectId)).run();
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
