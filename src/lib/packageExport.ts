import { DOC_DEFINITIONS, type GeneratedDoc, type ProjectDetail } from "@contracts/types";

export interface SplitDocumentPart {
    fileName: string;
    title: string;
    content: string;
}

export interface ExportDocumentBundle {
    folderName: string;
    indexFileName: string;
    indexContent: string;
    parts: SplitDocumentPart[];
}

const DEFAULT_MAX_PART_CHARS = 14_000;
const MIN_SPLIT_REMAINDER = 2_000;

function stripMarkdownExtension(fileName: string): string {
    return fileName.replace(/\.md$/i, "");
}

export function safePathSegment(value: string, fallback = "package"): string {
    const segment = value
        .trim()
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 90);
    return segment || fallback;
}

function headingForPart(content: string, partNumber: number): string {
    const heading = content.match(/^#{1,3}\s+(.+)$/m)?.[1]?.trim();
    return heading || `Part ${partNumber}`;
}

function findSplitPoint(content: string, maxChars: number): number {
    if (content.length <= maxChars + MIN_SPLIT_REMAINDER) return content.length;

    const windowStart = Math.max(Math.floor(maxChars * 0.55), 1);
    const window = content.slice(windowStart, maxChars);
    const headingMatches = [...window.matchAll(/\n(?=#{2,3}\s+)/g)];
    const headingPoint = headingMatches.at(-1)?.index;
    if (headingPoint != null) return windowStart + headingPoint + 1;

    const paragraphPoint = window.lastIndexOf("\n\n");
    if (paragraphPoint > -1) return windowStart + paragraphPoint + 2;

    const linePoint = window.lastIndexOf("\n");
    if (linePoint > -1) return windowStart + linePoint + 1;

    return maxChars;
}

export function splitMarkdownDocument(content: string, maxChars = DEFAULT_MAX_PART_CHARS): SplitDocumentPart[] {
    const normalized = content.trim();
    if (!normalized) return [{ fileName: "PART-01.md", title: "Part 1", content: "" }];
    if (normalized.length <= maxChars) return [{ fileName: "PART-01.md", title: headingForPart(normalized, 1), content: normalized }];

    const parts: SplitDocumentPart[] = [];
    let remaining = normalized;
    while (remaining.length) {
        const partNumber = parts.length + 1;
        const splitPoint = findSplitPoint(remaining, maxChars);
        const chunk = remaining.slice(0, splitPoint).trim();
        parts.push({
            fileName: `PART-${String(partNumber).padStart(2, "0")}.md`,
            title: headingForPart(chunk, partNumber),
            content: chunk,
        });
        remaining = remaining.slice(splitPoint).trim();
    }
    return parts;
}

export function buildDocumentBundle(doc: GeneratedDoc, project: ProjectDetail): ExportDocumentBundle {
    const def = DOC_DEFINITIONS.find((item) => item.key === doc.key);
    const parts = splitMarkdownDocument(doc.content).map((part, index) => ({
        ...part,
        fileName: `PART-${String(index + 1).padStart(2, "0")}.md`,
    }));
    const folderName = safePathSegment(stripMarkdownExtension(doc.fileName), doc.key);
    const versionLabel = project.currentVersion?.label ?? `v${doc.packageVersionNumber}`;
    const lines = [
        `# ${doc.title} Index`,
        "",
        `- Project: ${project.name}`,
        `- Package version: ${versionLabel}`,
        `- Source document: ${doc.fileName}`,
        `- Document key: ${doc.key}`,
        `- Source: ${doc.source}${doc.model ? ` (${doc.model})` : ""}`,
        `- Parts: ${parts.length}`,
        def ? `- Package role: ${def.titleEn}` : null,
        "",
        "## Parts",
        "",
        ...parts.map((part, index) => `| ${index + 1} | ${part.fileName} | ${part.title.replace(/\|/g, "-")} |`),
    ].filter((line): line is string => line != null);

    lines.splice(lines.indexOf("## Parts") + 2, 0, "| # | File | Starts with |", "|---|---|---|");

    return {
        folderName,
        indexFileName: "INDEX.md",
        indexContent: `${lines.join("\n")}\n`,
        parts,
    };
}

export function packageVersionFolder(project: ProjectDetail): string {
    const versionLabel = project.currentVersion?.label ?? "v1";
    return `${safePathSegment(project.name, "project")}-doc-package-${safePathSegment(versionLabel, "v1")}`;
}
