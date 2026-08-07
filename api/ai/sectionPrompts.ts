import { DEFAULT_SECTION_PURPOSE, type DocumentSectionPlan } from "../../contracts/documentBundle.js";
import type { DocDefinition, ProjectConfig } from "../../contracts/types.js";
import { projectBrief } from "./prompts.js";

export function buildSectionPrompt(input: {
    def: DocDefinition;
    name: string;
    idea: string;
    config: ProjectConfig;
    plan: DocumentSectionPlan;
    allSections: DocumentSectionPlan[];
}): string {
    const { def, name, idea, config, plan, allSections } = input;
    const language = config.docLanguage === "ar"
        ? "Write this section in Modern Standard Arabic (فصحى). Keep file names, commands, APIs, and code identifiers in English where conventional."
        : "Write this section in clear, professional English.";
    const hierarchy = allSections.map((section) => `${section.order}. ${section.title} — ${section.purpose}`).join("\n");
    const previous = allSections.filter((section) => section.order < plan.order).map((section) => `- ${section.title}: ./${section.fileName}`).join("\n") || "- None";
    const next = allSections.filter((section) => section.order > plan.order).map((section) => `- ${section.title}: ./${section.fileName}`).join("\n") || "- None";

    return `Generate ONE focused section for the document bundle "${def.fileName}" (${def.titleEn}).

Section to generate:
- Order: ${plan.order}
- Title: ${plan.title}
- Purpose: ${plan.purpose || DEFAULT_SECTION_PURPOSE}
- Output file: ${plan.fileName}

Parent document hierarchy:
${hierarchy}

Relative links available to adjacent sections:
Previous sections:
${previous}
Next sections:
${next}

Writing constraints:
- Output GitHub-flavored Markdown ONLY for this section file.
- Start directly with a single H1: "# ${plan.title}".
- Do NOT write the full parent document. Cover only this section's purpose.
- Be specific to project "${name}" and avoid generic filler, TODO, TBD, or placeholders.
- Use concise internal references to sibling section files only when helpful, with relative links like [Section title](./02-example.md).
- Keep the section focused enough to avoid truncation; prefer high-signal tables, checklists, and concrete acceptance criteria over long prose.
- ${language}

${projectBrief(name, idea, config)}`;
}
