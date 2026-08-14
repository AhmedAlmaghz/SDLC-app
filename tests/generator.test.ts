import { describe, it, expect, beforeEach, vi, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

/**
 * Generator bundle-path test.
 *
 * Strategy: mock `generateText` from the `ai` SDK so the AI path runs without
 * any network. We point SQLite at a fresh temp file (via SQLITE_PATH) and set
 * AI_API_KEY so resolveAiConfig().configured === true. We then drive
 * runGeneration for a single project and assert the persisted documents rows:
 *   - one parent `bundle` row per document definition
 *   - N `bundle-section` rows per parent, linked via parentDocumentId
 *   - sectionOrder is sequential and artifactType is correct
 *
 * The mock returns deterministic section content keyed by call index so we can
 * verify the number of AI calls equals the total section count.
 */

// --- Env setup MUST happen before importing app modules that read env. ---
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sdlc-gen-"));
const dbPath = path.join(tmpDir, "test.db");
process.env.SQLITE_PATH = dbPath;
process.env.AI_API_KEY = "test-key";
process.env.AI_PROVIDER = "openai-compatible";
process.env.AI_BASE_URL = "https://api.test.example/v1";
process.env.AI_MODEL = "test-model";
process.env.AI_SMALL_MODEL = "test-small-model";
// Ensure we don't accidentally talk to a real Postgres.
delete process.env.DATABASE_URL;

// --- Mock the `ai` SDK's generateText before importing the generator. ---
// vi.mock factories are hoisted to the top of the file, so we use vi.hoisted
// to create the shared mock state that the factory can safely reference.
const { generateTextMock, getCallCount, resetCallCount, aiConfigState, setAiConfigured } = vi.hoisted(() => {
    let count = 0;
    const fn = vi.fn(async () => {
        count += 1;
        return {
            text: `# Section ${count}\n\nGenerated body for section ${count}.`,
            usage: { inputTokens: 10, outputTokens: 20 },
            finishReason: "stop",
        };
    });
    // Mutable AI configuration state shared with the provider mock so tests can
    // flip between the AI path and the template-fallback path without relying
    // on env vars (which are captured at module import time).
    const aiConfigState = { configured: true };
    return {
        generateTextMock: fn,
        getCallCount: () => count,
        resetCallCount: () => (count = 0),
        aiConfigState,
        setAiConfigured: (value: boolean) => {
            aiConfigState.configured = value;
        },
    };
});
vi.mock("ai", () => ({ generateText: generateTextMock }));
// Mock the provider so resolveAiConfig() reflects our controllable `configured`
// flag, and getModel() returns a placeholder model object (only used on the AI
// path, which is covered by generateTextMock above).
vi.mock("../api/ai/provider", () => ({
    resolveAiConfig: () => ({
        configured: aiConfigState.configured,
        provider: "openai-compatible",
        providerLabel: "Test",
        baseUrl: "https://api.test.example/v1",
        apiKey: aiConfigState.configured ? "test-key" : "",
        model: "test-model",
        smallModel: "test-small-model",
        activeProviderId: null,
        source: "env",
    }),
    getModel: () => ({ model: { modelId: "test-model" }, modelId: "test-model", provider: "openai-compatible", providerLabel: "Test" }),
}));

// --- Now import app modules (env + mock are in place). ---
import { runGeneration, recoverStuckProjects, resumeGeneration } from "../api/ai/generator";
import { getDb } from "../api/queries/connection";
import { documents, packageVersions, projects } from "@db/schema";
import { DOC_DEFINITIONS, type ProjectConfig } from "@contracts/types";
import { eq } from "drizzle-orm";

const baseConfig: ProjectConfig = {
    appType: "web",
    audience: "developers",
    scale: "mvp",
    platforms: ["web"],
    features: ["auth"],
    constraints: "",
    docLanguage: "en",
    preferredStack: "",
};

function insertProject(): string {
    const id = randomUUID();
    getDb()
        .insert(projects)
        .values({
            id,
            name: "Test Project",
            idea: "A test idea that is long enough to pass validation rules.",
            config: baseConfig,
            status: "generating",
            docLanguage: "en",
        })
        .run();
    return id;
}

describe("generateOneDocBundle (via runGeneration) — AI bundle path", () => {
    let projectId: string;

    beforeEach(async () => {
        // Fresh project per test, and ensure the AI path is enabled for this suite.
        projectId = insertProject();
        setAiConfigured(true);
        resetCallCount();
        generateTextMock.mockClear();
    });

    afterAll(() => {
        // Clean up the temp DB directory.
        try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
            /* ignore */
        }
    });

    it("produces a bundle with the expected number of sections and persists parent + section rows", async () => {
        await runGeneration(projectId, { changeType: "initial_generation", changeSummary: "test" });

        const db = getDb();
        const allDocs = db.select().from(documents).where(eq(documents.projectId, projectId)).all();

        // Parent rows: one per doc definition, all of type "bundle".
        const parentRows = allDocs.filter((d) => d.artifactType === "bundle");
        expect(parentRows).toHaveLength(DOC_DEFINITIONS.length);

        // Section rows: all of type "bundle-section" and linked to a parent.
        const sectionRows = allDocs.filter((d) => d.artifactType === "bundle-section");
        const parentIds = new Set(parentRows.map((p) => p.id));
        expect(sectionRows.every((s) => s.parentDocumentId && parentIds.has(s.parentDocumentId))).toBe(true);

        // Each parent should have at least one section, with sequential sectionOrder.
        for (const parent of parentRows) {
            const sections = sectionRows
                .filter((s) => s.parentDocumentId === parent.id)
                .sort((a, b) => (a.sectionOrder ?? 0) - (b.sectionOrder ?? 0));
            expect(sections.length).toBeGreaterThan(0);
            const orders = sections.map((s) => s.sectionOrder);
            expect(orders).toEqual([...orders].sort((a, b) => (a ?? 0) - (b ?? 0)));
            // Orders are 1-based and unique within the parent.
            expect(new Set(orders).size).toBe(orders.length);
            expect(orders[0]).toBe(1);
        }

        // The number of generateText calls should equal the total section count
        // (one AI call per section, no calls for the template fallback path).
        expect(getCallCount()).toBe(sectionRows.length);

        // The project should end up "ready" after a successful generation.
        const project = db.select().from(projects).where(eq(projects.id, projectId)).all()[0];
        expect(project?.status).toBe("ready");
    });

    it("persists bundle folder name and relative paths on parent and section rows", async () => {
        await runGeneration(projectId, { changeType: "initial_generation", changeSummary: "test" });

        const db = getDb();
        const allDocs = db.select().from(documents).where(eq(documents.projectId, projectId)).all();
        const parentRows = allDocs.filter((d) => d.artifactType === "bundle");

        for (const parent of parentRows) {
            expect(parent.bundleFolderName).toBeTruthy();
            expect(parent.relativePath).toBe("INDEX.md");
            const sections = allDocs.filter((d) => d.parentDocumentId === parent.id);
            for (const section of sections) {
                expect(section.bundleFolderName).toBe(parent.bundleFolderName);
                expect(section.relativePath).toMatch(/\.md$/);
            }
        }
    });
});

describe("generateOneDocBundle — template fallback path (no AI key)", () => {
    it("builds a single-section bundle without calling the AI provider", async () => {
        // Force resolveAiConfig().configured === false via the provider mock so
        // generateOneDocBundle takes the template-fallback branch.
        setAiConfigured(false);
        resetCallCount();
        generateTextMock.mockClear();
        const pid = insertProject();
        try {
            await runGeneration(pid, { changeType: "initial_generation", changeSummary: "fallback" });

            const db = getDb();
            const allDocs = db.select().from(documents).where(eq(documents.projectId, pid)).all();
            const parentRows = allDocs.filter((d) => d.artifactType === "bundle");
            const sectionRows = allDocs.filter((d) => d.artifactType === "bundle-section");

            // Template fallback produces exactly one section per document.
            expect(parentRows).toHaveLength(DOC_DEFINITIONS.length);
            expect(sectionRows).toHaveLength(DOC_DEFINITIONS.length);
            // No AI calls should have been made on the fallback path.
            expect(getCallCount()).toBe(0);
            // Each parent has exactly one section.
            for (const parent of parentRows) {
                const sections = sectionRows.filter((s) => s.parentDocumentId === parent.id);
                expect(sections).toHaveLength(1);
                expect(sections[0].source).toBe("template");
            }
            const project = db.select().from(projects).where(eq(projects.id, pid)).all()[0];
            expect(project?.status).toBe("ready");
        } finally {
            // Restore the AI path for any subsequent tests.
            setAiConfigured(true);
        }
    });
});

describe("recoverStuckProjects — parent-only doc count", () => {
    // Helper: insert a parent `bundle` row plus N `bundle-section` child rows
    // for a single doc key, mimicking what insertDocumentBundle persists.
    function insertParentWithSections(args: {
        projectId: string;
        packageVersionId: string;
        packageVersionNumber: number;
        key: string;
        sectionCount: number;
    }) {
        const db = getDb();
        const parentId = randomUUID();
        db.insert(documents)
            .values({
                id: parentId,
                projectId: args.projectId,
                packageVersionId: args.packageVersionId,
                packageVersionNumber: args.packageVersionNumber,
                key: args.key,
                title: args.key,
                fileName: `INDEX-${args.key}.md`,
                content: `# ${args.key}`,
                artifactType: "bundle",
                bundleFolderName: args.key,
                relativePath: "INDEX.md",
                sectionOrder: 0,
                source: "template",
                model: null,
            })
            .run();
        for (let i = 1; i <= args.sectionCount; i++) {
            db.insert(documents)
                .values({
                    id: randomUUID(),
                    projectId: args.projectId,
                    packageVersionId: args.packageVersionId,
                    packageVersionNumber: args.packageVersionNumber,
                    key: args.key,
                    title: `${args.key} section ${i}`,
                    fileName: `${args.key}-section-${i}.md`,
                    content: `# Section ${i}`,
                    artifactType: "bundle-section",
                    bundleFolderName: args.key,
                    relativePath: `${args.key}-section-${i}.md`,
                    sectionOrder: i,
                    parentDocumentId: parentId,
                    source: "template",
                    model: null,
                })
                .run();
        }
    }

    it("classifies a partially-generated project as 'failed' even when section rows inflate the raw doc count", () => {
        const db = getDb();
        const projectId = insertProject(); // status: "generating"

        // Create a package version row so the documents have a valid FK target.
        const versionId = randomUUID();
        db.insert(packageVersions)
            .values({
                id: versionId,
                projectId,
                versionNumber: 1,
                label: "v1",
                status: "updating",
                changeType: "initial_generation",
            })
            .run();

        // Generate only a SUBSET of the parent docs (e.g. half), but give each
        // generated parent multiple bundle-section rows. The total raw row count
        // (parents + sections) must NOT be used to mark the project ready.
        const subsetCount = Math.max(1, Math.floor(DOC_DEFINITIONS.length / 2));
        const generatedKeys = DOC_DEFINITIONS.slice(0, subsetCount);
        for (const def of generatedKeys) {
            insertParentWithSections({
                projectId,
                packageVersionId: versionId,
                packageVersionNumber: 1,
                key: def.key,
                sectionCount: 3,
            });
        }

        // Sanity: raw row count (parents + sections) exceeds DOC_DEFINITIONS.length,
        // which is exactly the misclassification risk this test guards against.
        const rawRowCount = db.select().from(documents).where(eq(documents.projectId, projectId)).all().length;
        expect(rawRowCount).toBeGreaterThan(DOC_DEFINITIONS.length);

        // Run recovery as the server would on restart.
        recoverStuckProjects();

        const project = db.select().from(projects).where(eq(projects.id, projectId)).all()[0];
        // Only `subsetCount` parent docs were generated, which is less than the
        // full DOC_DEFINITIONS.length, so the project must be "failed" — not "ready".
        expect(project?.status).toBe("failed");
    });

    it("classifies a fully-generated project as 'ready' when every parent doc exists", () => {
        const db = getDb();
        const projectId = insertProject(); // status: "generating"

        const versionId = randomUUID();
        db.insert(packageVersions)
            .values({
                id: versionId,
                projectId,
                versionNumber: 1,
                label: "v1",
                status: "updating",
                changeType: "initial_generation",
            })
            .run();

        // Generate ALL parent docs (each with a couple of section rows).
        for (const def of DOC_DEFINITIONS) {
            insertParentWithSections({
                projectId,
                packageVersionId: versionId,
                packageVersionNumber: 1,
                key: def.key,
                sectionCount: 2,
            });
        }

        recoverStuckProjects();

        const project = db.select().from(projects).where(eq(projects.id, projectId)).all()[0];
        expect(project?.status).toBe("ready");
    });
});

describe("resumeGeneration — continue from where generation stopped", () => {
    // Helper: seed a full parent bundle row (+ sections) for a single doc key in
    // a given version, exactly like insertDocumentBundle persists (source template).
    function seedParentWithSections(args: {
        projectId: string;
        packageVersionId: string;
        packageVersionNumber: number;
        key: string;
        sectionCount: number;
    }) {
        const db = getDb();
        const parentId = randomUUID();
        db.insert(documents)
            .values({
                id: parentId,
                projectId: args.projectId,
                packageVersionId: args.packageVersionId,
                packageVersionNumber: args.packageVersionNumber,
                key: args.key,
                title: args.key,
                fileName: `INDEX-${args.key}.md`,
                content: `# ${args.key}`,
                artifactType: "bundle",
                bundleFolderName: args.key,
                relativePath: "INDEX.md",
                sectionOrder: 0,
                source: "template",
                model: null,
            })
            .run();
        for (let i = 1; i <= args.sectionCount; i++) {
            db.insert(documents)
                .values({
                    id: randomUUID(),
                    projectId: args.projectId,
                    packageVersionId: args.packageVersionId,
                    packageVersionNumber: args.packageVersionNumber,
                    key: args.key,
                    title: `${args.key} section ${i}`,
                    fileName: `${args.key}-section-${i}.md`,
                    content: `# Section ${i}`,
                    artifactType: "bundle-section",
                    bundleFolderName: args.key,
                    relativePath: `${args.key}-section-${i}.md`,
                    sectionOrder: i,
                    parentDocumentId: parentId,
                    source: "template",
                    model: null,
                })
                .run();
        }
    }

    it("completes only the missing docs inside the same (failed) version and marks the project ready", async () => {
        setAiConfigured(true);
        resetCallCount();
        const db = getDb();
        const pid = insertProject();

        // A failed v1 that already contains exactly half the parent docs.
        const versionId = randomUUID();
        db.insert(packageVersions)
            .values({
                id: versionId,
                projectId: pid,
                versionNumber: 1,
                label: "v1",
                status: "failed",
                changeType: "initial_generation",
            })
            .run();

        const subsetCount = Math.max(1, Math.floor(DOC_DEFINITIONS.length / 2));
        const preGenerated = DOC_DEFINITIONS.slice(0, subsetCount);
        for (const def of preGenerated) {
            seedParentWithSections({
                projectId: pid,
                packageVersionId: versionId,
                packageVersionNumber: 1,
                key: def.key,
                sectionCount: 2,
            });
        }
        db.update(projects).set({ status: "failed", updatedAt: new Date() }).where(eq(projects.id, pid)).run();

        await resumeGeneration(pid);

        const allDocs = db.select().from(documents).where(eq(documents.projectId, pid)).all();
        const parentRows = allDocs.filter((d) => d.artifactType === "bundle");

        // Every doc definition now has a parent row.
        expect(parentRows).toHaveLength(DOC_DEFINITIONS.length);

        // Resume continues inside the SAME version — no new version created.
        for (const parent of parentRows) {
            expect(parent.packageVersionId).toBe(versionId);
        }

        // Only the missing definitions were handed to the AI provider.
        const aiGeneratedKeys = new Set(DOC_DEFINITIONS.slice(subsetCount).map((d) => d.key));
        for (const parent of parentRows) {
            if (aiGeneratedKeys.has(parent.key as (typeof DOC_DEFINITIONS)[number]["key"])) {
                expect(parent.source).toBe("ai");
            }
        }
        expect(getCallCount()).toBeGreaterThan(0);

        // The project is ready and the version is completed.
        const project = db.select().from(projects).where(eq(projects.id, pid)).all()[0];
        expect(project?.status).toBe("ready");
        const version = db.select().from(packageVersions).where(eq(packageVersions.id, versionId)).all()[0];
        expect(version?.status).toBe("ready");
    });

    it("generates a fresh continuation version when nothing exists yet", async () => {
        setAiConfigured(true);
        resetCallCount();
        const pid = insertProject();

        // No version rows at all — resume must bootstrap a new version and fill every doc.
        await resumeGeneration(pid);

        const db = getDb();
        const parentRows = db
            .select()
            .from(documents)
            .where(eq(documents.projectId, pid))
            .all()
            .filter((d) => d.artifactType === "bundle");
        expect(parentRows).toHaveLength(DOC_DEFINITIONS.length);

        const version = db.select().from(packageVersions).where(eq(packageVersions.projectId, pid)).all()[0];
        expect(version?.status).toBe("ready");
        const project = db.select().from(projects).where(eq(projects.id, pid)).all()[0];
        expect(project?.status).toBe("ready");
    });
});
