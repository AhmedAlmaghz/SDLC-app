import { describe, it, expect } from "vitest";
import {
  buildIndexContent,
  createDocumentBundle,
  deriveSectionPlan,
  documentBundleFiles,
  folderNameForDocument,
  markdownToSingleSectionBundle,
  parseDocumentBundle,
  safePathSegment,
  serializeDocumentBundle,
} from "@contracts/documentBundle";
import { buildDocumentBundle } from "@/lib/packageExport";
import { DOC_DEFINITIONS, type GeneratedDoc, type ProjectDetail } from "@contracts/types";

const prd = {
  key: "prd",
  fileName: "01-PRD.md",
  titleAr: "وثيقة متطلبات المنتج",
  titleEn: "Product Requirements Document",
  descriptionAr: "Requirements bundle purpose.",
  phaseAr: "المتطلبات والتخطيط",
  complexity: "high",
} as const;

describe("deriveSectionPlan", () => {
  it("produces stable ordered section filenames", () => {
    const plan = deriveSectionPlan(prd, "en");

    expect(plan).toHaveLength(3);
    expect(plan[0].fileName).toBe("01-vision-goals-and-success-metrics.md");
    expect(plan[1].order).toBe(2);
    expect(plan.every((section) => section.parentKey === "prd")).toBe(true);
  });

  it("deduplicates repeated section names deterministically", () => {
    const plan = deriveSectionPlan(prd, "en", [
      { title: "Overview", purpose: "First overview." },
      { title: "Overview", purpose: "Second overview." },
      { title: "Overview", purpose: "Third overview." },
    ]);

    expect(plan.map((section) => section.fileName)).toEqual([
      "01-overview.md",
      "02-overview-2.md",
      "03-overview-3.md",
    ]);
  });
});

describe("buildIndexContent", () => {
  it("emits relative links to section files", () => {
    const plan = deriveSectionPlan(prd, "en", [{ title: "Short", purpose: "Short document section." }]);
    const index = buildIndexContent({
      title: "Product Requirements Document",
      purpose: "Explain requirements.",
      projectName: "Example Project",
      sourceFileName: "01-PRD.md",
      versionLabel: "v2",
      source: "ai",
      model: "test:model",
      sections: plan,
    });

    expect(index).toMatch(/## Purpose/);
    expect(index).toMatch(/\[Short\]\(01-short\.md\)/);
    expect(index.includes("http://")).toBe(false);
  });
});

describe("createDocumentBundle + documentBundleFiles + parseDocumentBundle", () => {
  it("serializes INDEX.md plus focused section files", () => {
    const plan = deriveSectionPlan(prd, "en", [{ title: "Long Requirements", purpose: "Very long requirements section." }]);
    const longContent = `${"Requirement details. ".repeat(3000)}`;
    const bundle = createDocumentBundle({
      def: prd,
      title: "Product Requirements Document",
      language: "en",
      source: "ai",
      sectionContents: [{ plan: plan[0], content: longContent }],
    });
    const files = documentBundleFiles(bundle);
    const parsed = parseDocumentBundle(serializeDocumentBundle(bundle));

    expect(files.map((file) => file.fileName)).toEqual(["INDEX.md", "01-long-requirements.md"]);
    expect(files[1].content).toMatch(/# Long Requirements/);
    expect(parsed?.metadata.artifactType).toBe("bundle");
  });
});

describe("safePathSegment", () => {
  it("falls back when the input collapses to empty", () => {
    expect(safePathSegment("")).toBe("document");
    expect(safePathSegment("   ")).toBe("document");
    expect(safePathSegment("!!!", "fallback")).toBe("fallback");
  });

  it("strips ASCII control characters and path separators", () => {
    const segment = safePathSegment('a\x00b\x07c|d/e\\f:g"h?*k');
    // Control chars and reserved path characters are replaced with hyphens,
    // then collapsed/trimmed. No raw control or separator chars survive.
    expect(segment).not.toMatch(/[\x00-\x1f|<>:"/\\|?*]/);
    expect(segment.length).toBeGreaterThan(0);
  });

  it("preserves Arabic letters while lowercasing ASCII", () => {
    const segment = safePathSegment("وثيقة PRD الرئيسية");
    // Arabic range is explicitly allowed by the allow-list regex.
    expect(segment).toMatch(/[\u0600-\u06ff]/);
    expect(segment).not.toMatch(/[A-Z]/);
    expect(segment.length).toBeGreaterThan(0);
  });

  it("truncates very long strings to the 90-character cap", () => {
    const long = "a".repeat(500);
    const segment = safePathSegment(long);
    expect(segment.length).toBeLessThanOrEqual(90);
  });

  it("collapses repeated separators and trims leading/trailing hyphens", () => {
    expect(safePathSegment("---a---b---")).toBe("a-b");
  });
});

describe("parseDocumentBundle malformed input", () => {
  it("returns null for non-JSON content", () => {
    expect(parseDocumentBundle("not json at all")).toBeNull();
  });

  it("returns null when artifactType is not 'bundle'", () => {
    expect(parseDocumentBundle(JSON.stringify({ metadata: { artifactType: "markdown" }, sections: [], indexContent: "" }))).toBeNull();
  });

  it("returns null when sections is not an array", () => {
    expect(
      parseDocumentBundle(
        JSON.stringify({ metadata: { artifactType: "bundle" }, sections: "nope", indexContent: "x" }),
      ),
    ).toBeNull();
  });

  it("returns null when indexContent is missing", () => {
    expect(
      parseDocumentBundle(
        JSON.stringify({ metadata: { artifactType: "bundle" }, sections: [] }),
      ),
    ).toBeNull();
  });

  it("round-trips a valid bundle", () => {
    const plan = deriveSectionPlan(prd, "en", [{ title: "Solo", purpose: "p" }]);
    const bundle = createDocumentBundle({
      def: prd,
      title: "T",
      language: "en",
      sectionContents: [{ plan: plan[0], content: "# Solo\n\nbody" }],
    });
    const parsed = parseDocumentBundle(serializeDocumentBundle(bundle));
    expect(parsed).not.toBeNull();
    expect(parsed?.sections).toHaveLength(1);
  });
});

describe("markdownToSingleSectionBundle (legacy upgrade path)", () => {
  it("wraps legacy markdown into a single-section bundle with INDEX.md", () => {
    const def = DOC_DEFINITIONS.find((d) => d.key === "prd")!;
    const bundle = markdownToSingleSectionBundle({
      def,
      title: def.titleEn,
      language: "en",
      content: "# Legacy\n\nSome legacy body text.",
      projectName: "Legacy Project",
      versionLabel: "v1",
      source: "template",
    });

    expect(bundle.metadata.artifactType).toBe("bundle");
    expect(bundle.metadata.documentKey).toBe("prd");
    expect(bundle.sections).toHaveLength(1);
    const files = documentBundleFiles(bundle);
    expect(files.map((f) => f.fileName)).toEqual(["INDEX.md", bundle.sections[0].fileName]);
    // The legacy content is preserved inside the single section.
    expect(bundle.sections[0].content).toContain("Some legacy body text.");
  });
});

describe("buildDocumentBundle (src/lib/packageExport)", () => {
  const baseProject = {
    id: "p1",
    name: "Example Project",
    idea: "idea",
    status: "ready" as const,
    docLanguage: "en" as const,
    docsCount: 0,
    totalDocs: DOC_DEFINITIONS.length,
    createdAt: new Date(),
    updatedAt: new Date(),
    config: {} as ProjectDetail["config"],
    docs: [],
    metrics: [],
    currentVersion: null,
    versions: [],
  };

  it("builds a bundle folder + index + parts from a parsed bundle document", () => {
    const def = DOC_DEFINITIONS.find((d) => d.key === "prd")!;
    const plan = deriveSectionPlan(def, "en", [
      { title: "Alpha", purpose: "first" },
      { title: "Beta", purpose: "second" },
    ]);
    const bundle = createDocumentBundle({
      def,
      title: def.titleEn,
      language: "en",
      source: "ai",
      sectionContents: [
        { plan: plan[0], content: "# Alpha\n\na" },
        { plan: plan[1], content: "# Beta\n\nb" },
      ],
    });
    const doc: GeneratedDoc = {
      id: "d1",
      projectId: "p1",
      key: "prd",
      title: def.titleEn,
      fileName: def.fileName,
      content: serializeDocumentBundle(bundle),
      artifactType: "bundle",
      source: "ai",
      model: "test:model",
      packageVersionId: "v1",
      packageVersionNumber: 1,
      bundleFolderName: bundle.metadata.folderName,
      relativePath: bundle.metadata.indexFileName,
      sectionOrder: 0,
      parentDocumentId: null,
      createdAt: new Date(),
    };

    const result = buildDocumentBundle(doc, baseProject);

    expect(result.folderName).toBe(bundle.metadata.folderName);
    expect(result.indexFileName).toBe("INDEX.md");
    expect(result.indexContent).toContain("# Product Requirements Document");
    expect(result.parts).toHaveLength(2);
    expect(result.parts.map((p) => p.fileName)).toEqual([
      bundle.sections[0].fileName,
      bundle.sections[1].fileName,
    ]);
    expect(result.parts[0].content).toContain("# Alpha");
  });

  it("falls back to a single-part bundle for legacy markdown documents", () => {
    const def = DOC_DEFINITIONS.find((d) => d.key === "prd")!;
    const doc: GeneratedDoc = {
      id: "d2",
      projectId: "p1",
      key: "prd",
      title: def.titleEn,
      fileName: def.fileName,
      content: "# Legacy\n\nbody",
      artifactType: "markdown",
      source: "template",
      model: null,
      packageVersionId: "v1",
      packageVersionNumber: 1,
      bundleFolderName: null,
      relativePath: def.fileName,
      sectionOrder: null,
      parentDocumentId: null,
      createdAt: new Date(),
    };

    const result = buildDocumentBundle(doc, baseProject);

    // Legacy markdown is upgraded via markdownToSingleSectionBundle, so it
    // still produces an INDEX.md plus one section part.
    expect(result.indexFileName).toBe("INDEX.md");
    expect(result.parts).toHaveLength(1);
    expect(result.parts[0].content).toContain("body");
  });

  it("uses the document's folder name when present", () => {
    const def = DOC_DEFINITIONS.find((d) => d.key === "prd")!;
    const plan = deriveSectionPlan(def, "en", [{ title: "Solo", purpose: "p" }]);
    const bundle = createDocumentBundle({
      def,
      title: def.titleEn,
      language: "en",
      sectionContents: [{ plan: plan[0], content: "# Solo\n\nx" }],
    });
    const doc: GeneratedDoc = {
      id: "d3",
      projectId: "p1",
      key: "prd",
      title: def.titleEn,
      fileName: def.fileName,
      content: serializeDocumentBundle(bundle),
      artifactType: "bundle",
      source: "ai",
      model: null,
      packageVersionId: "v1",
      packageVersionNumber: 1,
      bundleFolderName: "custom-folder",
      relativePath: bundle.metadata.indexFileName,
      sectionOrder: 0,
      parentDocumentId: null,
      createdAt: new Date(),
    };

    const result = buildDocumentBundle(doc, baseProject);
    expect(result.folderName).toBe("custom-folder");
  });
});

describe("folderNameForDocument", () => {
  it("derives a stable folder name from the doc file name", () => {
    const def = DOC_DEFINITIONS.find((d) => d.key === "prd")!;
    expect(folderNameForDocument(def)).toBe("01-prd");
  });
});
