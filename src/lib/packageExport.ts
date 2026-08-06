import { DOC_DEFINITIONS, type GeneratedDoc, type ProjectDetail } from "@contracts/types";
import {
    bundleAsMarkdown,
    documentBundleFiles,
    folderNameForDocument,
    markdownToSingleSectionBundle,
    parseDocumentBundle,
    safePathSegment,
} from "@contracts/documentBundle";

export interface ExportDocumentBundle {
    folderName: string;
    indexFileName: string;
    indexContent: string;
    parts: Array<{ fileName: string; title: string; content: string }>;
}

export { safePathSegment };

export function getDocBundle(doc: GeneratedDoc, project: ProjectDetail) {
    const parsed = doc.artifactType === "bundle" ? parseDocumentBundle(doc.content) : null;
    if (parsed) return parsed;
    const def = DOC_DEFINITIONS.find((item) => item.key === doc.key);
    if (!def) return null;
    return markdownToSingleSectionBundle({
        def,
        title: doc.title,
        language: project.docLanguage,
        content: doc.content,
        projectName: project.name,
        versionLabel: project.currentVersion?.label ?? `v${doc.packageVersionNumber}`,
        source: doc.source,
        model: doc.model,
        generatedAt: doc.createdAt,
    });
}

export function docMarkdownForDisplay(doc: GeneratedDoc, project: ProjectDetail): string {
    const bundle = getDocBundle(doc, project);
    if (bundle) return bundleAsMarkdown(bundle);
    return doc.content;
}

export function buildDocumentBundle(doc: GeneratedDoc, project: ProjectDetail): ExportDocumentBundle {
    const def = DOC_DEFINITIONS.find((item) => item.key === doc.key);
    const bundle = getDocBundle(doc, project);
    if (!bundle) {
        return {
            folderName: safePathSegment(doc.bundleFolderName || doc.fileName.replace(/\.md$/i, ""), doc.key),
            indexFileName: "INDEX.md",
            indexContent: doc.content,
            parts: [{ fileName: doc.fileName, title: doc.title, content: doc.content }],
        };
    }

    const files = documentBundleFiles(bundle);
    const index = files.find((file) => file.kind === "index");
    const sectionFiles = files.filter((file) => file.kind === "section");
    return {
        folderName: doc.bundleFolderName || bundle.metadata.folderName || (def ? folderNameForDocument(def) : safePathSegment(doc.title, doc.key)),
        indexFileName: index?.fileName ?? "INDEX.md",
        indexContent: index?.content ?? bundle.indexContent,
        parts: sectionFiles.map((file, index) => ({
            fileName: file.fileName,
            title: bundle.sections[index]?.title ?? file.fileName.replace(/\.md$/i, ""),
            content: file.content,
        })),
    };
}

export function packageVersionFolder(project: ProjectDetail): string {
    const versionLabel = project.currentVersion?.label ?? "v1";
    return `${safePathSegment(project.name, "project")}-doc-package-${safePathSegment(versionLabel, "v1")}`;
}
