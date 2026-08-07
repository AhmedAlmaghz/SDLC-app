import type { DocDefinition, DocKey, DocLanguage, DocSource } from "./types.js";

export const DOCUMENT_BUNDLE_SCHEMA_VERSION = 1;
export const DOCUMENT_BUNDLE_INDEX_FILE = "INDEX.md";

export interface DocumentSectionPlan {
    id: string;
    order: number;
    title: string;
    purpose: string;
    fileName: string;
    parentKey: DocKey;
}

export interface DocumentBundleSection extends DocumentSectionPlan {
    content: string;
}

export interface DocumentBundleMetadata {
    schemaVersion: number;
    artifactType: "bundle";
    documentKey: DocKey;
    title: string;
    folderName: string;
    indexFileName: typeof DOCUMENT_BUNDLE_INDEX_FILE;
    purpose: string;
    sourceFileName: string;
    generatedAt: string;
}

export interface DocumentBundleArtifact {
    metadata: DocumentBundleMetadata;
    sections: DocumentBundleSection[];
    indexContent: string;
}

export interface DocumentBundleFile {
    path: string;
    fileName: string;
    content: string;
    kind: "index" | "section";
}

export const DEFAULT_SECTION_PURPOSE = "Focused documentation section generated as part of the parent document bundle.";
const MAX_SECTIONS = 10;
const SECTION_TEMPLATES: Record<DocKey, Array<{ title: string; purpose: string }>> = {
    prd: [
        { title: "Vision, Goals, and Success Metrics", purpose: "Define the product intent, measurable outcomes, and the problem being solved." },
        { title: "Personas, Scope, and User Stories", purpose: "Capture target users, boundaries, and capability-grouped stories with acceptance criteria." },
        { title: "Requirements, Edge Cases, and Open Questions", purpose: "Document verifiable requirements, non-functional expectations, missed edge cases, and decisions needing humans." },
    ],
    architecture: [
        { title: "System Overview and Technology Decisions", purpose: "Explain the target architecture, selected stack, and high-level design constraints." },
        { title: "Components, Data Model, and API Surface", purpose: "Break down modules, entities, relationships, and integration contracts." },
        { title: "Cross-Cutting Concerns, ADRs, and Risks", purpose: "Document reliability, security, scalability decisions, ADRs, and known trade-offs." },
    ],
    agentsMd: [
        { title: "Project Context and Commands", purpose: "Provide static agent context, stack, repository map, and operational commands." },
        { title: "Coding Rules and Testing Contract", purpose: "Define conventions, hard rules, quality gates, and verification obligations." },
        { title: "Workflow, Done Criteria, and Boundaries", purpose: "Describe PR flow, definition of done, tool boundaries, and stop conditions." },
    ],
    contextPack: [
        { title: "Context Architecture and Six Context Types", purpose: "Design static and dynamic context boundaries using the six context categories." },
        { title: "Agent Skills and Retrieval Strategy", purpose: "Specify progressive-disclosure skills and how knowledge is discovered on demand." },
        { title: "Token Economics and Maintenance", purpose: "Set context budgets, exclusions, ownership, review, and versioning practices." },
    ],
    specPlan: [
        { title: "Delivery Strategy and Milestones", purpose: "Lay out phases, dependencies, exit criteria, and delivery sequencing." },
        { title: "Agent-Sized Task Decomposition", purpose: "Define implementation spec cards with clear success criteria and recommended mode." },
        { title: "Risk Register and Feedback Loops", purpose: "Identify likely agent failure points and route failures through test/eval feedback loops." },
    ],
    testingEvals: [
        { title: "Testing Philosophy and Test Matrix", purpose: "Define testing layers, critical cases, and deterministic quality gates." },
        { title: "Eval Suite and CI Quality Gates", purpose: "Specify non-deterministic evals, scoring rubrics, judges, and CI thresholds." },
    ],
    guardrails: [
        { title: "Threat Model and Deterministic Hooks", purpose: "Identify major risks and lifecycle hooks that prevent unsafe agent behavior." },
        { title: "Sandbox, Secrets, Supply Chain, and Compliance", purpose: "Set permission boundaries, secret rules, dependency policy, and compliance controls." },
    ],
    devopsObservability: [
        { title: "Environments, CI/CD, and Deployment", purpose: "Define promotion flow, pipeline stages, deployment targets, and rollback strategy." },
        { title: "Observability, SLOs, and Cost Governance", purpose: "Specify logs, traces, metrics, agent telemetry, SLOs, alerts, and budgets." },
    ],
    roadmap: [
        { title: "Evolution Roadmap and Technical Debt Policy", purpose: "Plan post-launch horizons, modernization, and AI-generated code review practices." },
        { title: "Maintenance Workflows and Knowledge Management", purpose: "Define recurring maintenance, team operating model, and documentation scaling." },
    ],
};

function stripMarkdownExtension(fileName: string): string {
    return fileName.replace(/\.md$/i, "");
}

export function safePathSegment(value: string, fallback = "document"): string {
    const segment = value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9\u0600-\u06ff._-]+/gi, "-")
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 90);
    return segment || fallback;
}

function uniqueSlug(title: string, used: Set<string>): string {
    const base = safePathSegment(title, "section");
    let slug = base;
    let suffix = 2;
    while (used.has(slug)) {
        slug = `${base}-${suffix}`;
        suffix += 1;
    }
    used.add(slug);
    return slug;
}

function titleFor(def: DocDefinition, language: DocLanguage): string {
    return language === "ar" ? def.titleAr : def.titleEn;
}

export function folderNameForDocument(def: DocDefinition): string {
    return safePathSegment(stripMarkdownExtension(def.fileName), def.key);
}

export function deriveSectionPlan(def: DocDefinition, language: DocLanguage, overrides?: Array<Partial<Pick<DocumentSectionPlan, "title" | "purpose">>>): DocumentSectionPlan[] {
    const source = overrides?.length
        ? overrides.map((item, index) => ({
            title: item.title?.trim() || SECTION_TEMPLATES[def.key]?.[index]?.title || `Section ${index + 1}`,
            purpose: item.purpose?.trim() || SECTION_TEMPLATES[def.key]?.[index]?.purpose || DEFAULT_SECTION_PURPOSE,
        }))
        : SECTION_TEMPLATES[def.key] || [{ title: titleFor(def, language), purpose: def.descriptionAr || DEFAULT_SECTION_PURPOSE }];
    const used = new Set<string>();
    return source.slice(0, MAX_SECTIONS).map((section, index) => {
        const order = index + 1;
        const slug = uniqueSlug(section.title, used);
        return {
            id: `${def.key}-${String(order).padStart(2, "0")}-${slug}`,
            order,
            title: section.title,
            purpose: section.purpose,
            fileName: `${String(order).padStart(2, "0")}-${slug}.md`,
            parentKey: def.key,
        };
    });
}

function normalizeSectionContent(content: string, title: string): string {
    const trimmed = content.trim();
    if (!trimmed) return `# ${title}\n\nContent generation returned an empty section.`;
    return /^#\s+/m.test(trimmed) ? trimmed : `# ${title}\n\n${trimmed}`;
}

export function buildIndexContent(input: {
    title: string;
    purpose: string;
    projectName?: string;
    sourceFileName: string;
    versionLabel?: string;
    source?: DocSource;
    model?: string | null;
    sections: Array<Pick<DocumentBundleSection, "order" | "title" | "purpose" | "fileName">>;
}): string {
    const lines = [
        `# ${input.title}`,
        "",
        "## Purpose",
        "",
        input.purpose.trim() || DEFAULT_SECTION_PURPOSE,
        "",
        "## Document Hierarchy",
        "",
        input.projectName ? `- Project: ${input.projectName}` : null,
        input.versionLabel ? `- Package version: ${input.versionLabel}` : null,
        `- Source document: ${input.sourceFileName}`,
        input.source ? `- Source: ${input.source}${input.model ? ` (${input.model})` : ""}` : null,
        `- Sections: ${input.sections.length}`,
        "",
        "## Sections",
        "",
        "| # | Section | Description |",
        "|---|---|---|",
        ...input.sections.map((section) => `| ${section.order} | [${section.title.replace(/\|/g, "-")}](${section.fileName}) | ${section.purpose.replace(/\|/g, "-")} |`),
        "",
        "## Navigation Notes",
        "",
        "All links are relative to this folder, so the bundle works unchanged in persisted storage and exported ZIP packages.",
    ].filter((line): line is string => line != null);
    return `${lines.join("\n")}\n`;
}

export function createDocumentBundle(input: {
    def: DocDefinition;
    title: string;
    language: DocLanguage;
    sourceFileName?: string;
    purpose?: string;
    projectName?: string;
    versionLabel?: string;
    source?: DocSource;
    model?: string | null;
    generatedAt?: Date;
    sectionContents: Array<{ plan: DocumentSectionPlan; content: string }>;
}): DocumentBundleArtifact {
    const sections = input.sectionContents.map(({ plan, content }) => ({
        ...plan,
        content: normalizeSectionContent(content, plan.title),
    }));
    const purpose = input.purpose || input.def.descriptionAr || DEFAULT_SECTION_PURPOSE;
    const metadata: DocumentBundleMetadata = {
        schemaVersion: DOCUMENT_BUNDLE_SCHEMA_VERSION,
        artifactType: "bundle",
        documentKey: input.def.key,
        title: input.title,
        folderName: folderNameForDocument(input.def),
        indexFileName: DOCUMENT_BUNDLE_INDEX_FILE,
        purpose,
        sourceFileName: input.sourceFileName || input.def.fileName,
        generatedAt: (input.generatedAt || new Date()).toISOString(),
    };
    const indexContent = buildIndexContent({
        title: input.title,
        purpose,
        projectName: input.projectName,
        sourceFileName: metadata.sourceFileName,
        versionLabel: input.versionLabel,
        source: input.source,
        model: input.model,
        sections,
    });
    return { metadata, sections, indexContent };
}

export function serializeDocumentBundle(bundle: DocumentBundleArtifact): string {
    return JSON.stringify(bundle);
}

export function parseDocumentBundle(content: string): DocumentBundleArtifact | null {
    try {
        const parsed = JSON.parse(content) as DocumentBundleArtifact;
        if (parsed?.metadata?.artifactType !== "bundle" || !Array.isArray(parsed.sections) || typeof parsed.indexContent !== "string") return null;
        return parsed;
    } catch {
        return null;
    }
}

export function documentBundleFiles(bundle: DocumentBundleArtifact): DocumentBundleFile[] {
    return [
        {
            path: bundle.metadata.indexFileName,
            fileName: bundle.metadata.indexFileName,
            content: bundle.indexContent,
            kind: "index",
        },
        ...bundle.sections.map((section) => ({
            path: section.fileName,
            fileName: section.fileName,
            content: section.content,
            kind: "section" as const,
        })),
    ];
}

export function markdownToSingleSectionBundle(input: {
    def: DocDefinition;
    title: string;
    language: DocLanguage;
    content: string;
    projectName?: string;
    versionLabel?: string;
    source?: DocSource;
    model?: string | null;
    generatedAt?: Date;
}): DocumentBundleArtifact {
    const [plan] = deriveSectionPlan(input.def, input.language, [{ title: input.title, purpose: "Legacy markdown content preserved as a single section." }]);
    return createDocumentBundle({
        def: input.def,
        title: input.title,
        language: input.language,
        projectName: input.projectName,
        versionLabel: input.versionLabel,
        source: input.source,
        model: input.model,
        generatedAt: input.generatedAt,
        sectionContents: [{ plan, content: input.content }],
    });
}

export function bundleAsMarkdown(bundle: DocumentBundleArtifact): string {
    return [bundle.indexContent.trim(), ...bundle.sections.map((section) => section.content.trim())].filter(Boolean).join("\n\n---\n\n");
}
