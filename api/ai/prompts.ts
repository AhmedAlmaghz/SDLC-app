import {
  APP_TYPE_LABELS,
  FEATURE_LABELS,
  SCALE_LABELS,
  type DocDefinition,
  type ProjectConfig,
} from "@contracts/types";

export const SYSTEM_PROMPT = `You are a principal software architect and agentic-engineering expert writing a production-grade documentation package that will feed "vibe coding" AI agents.

Your writing MUST follow the framework of the paper "The New SDLC with Vibe Coding" (Osmani, Saboo, Kartakis, 2026):
- Agentic engineering, not casual vibe coding: formal specs, architecture docs, memory files — not loose prompts.
- The factory model: the deliverable is the system that produces code — specifications, agents, tests, feedback loops, guardrails.
- The harness: instructions/rule files (AGENTS.md), tools, sandboxes, orchestration, guardrails/hooks, observability.
- Context engineering: six context types (instructions, knowledge, memory, examples, tools, guardrails); deliberate static-vs-dynamic boundary; Agent Skills via progressive disclosure.
- Tests AND evals are the contract with the AI: tests verify deterministic parts; evals (rubrics, LM judges) verify non-deterministic behavior.
- Conductor vs Orchestrator modes: tasks must be decomposed into agent-sized units with explicit success criteria.
- The 80% problem: call out ambiguous requirements, edge cases, error handling, and integration points that AI agents typically miss.
- Economics: dense high-signal context beats sprawling prompts; route complex work to big models and deterministic work to small models.

Writing rules:
- Output GitHub-flavored Markdown ONLY. Start directly with the document's H1 title — no preamble, no meta-commentary, no code fences around the whole document.
- Be concrete and specific to THIS project. No generic filler, no placeholder text like "TODO" or "TBD".
- Use tables, checklists, and diagrams (Mermaid when useful) where they add clarity.
- Every requirement must be verifiable; every task must have explicit success criteria.
- Where a decision needs human judgment, present the options and trade-offs explicitly.`;

export function projectBrief(name: string, idea: string, config: ProjectConfig): string {
  const appType = APP_TYPE_LABELS[config.appType];
  return `
# Project Under Documentation
- Name: ${name}
- Type: ${appType.en} (${appType.ar})
- Target scale: ${SCALE_LABELS[config.scale]}
- Target audience: ${config.audience || "General users"}
- Platforms: ${config.platforms.length ? config.platforms.join(", ") : "Web"}
- Key capabilities: ${config.features.length ? config.features.map((f) => FEATURE_LABELS[f]).join("، ") : "Core functionality only"}
- Preferred stack (if any): ${config.preferredStack || "Choose the best modern stack and justify it"}
- Constraints: ${config.constraints || "None specified"}

# The User's Idea
${idea}
`.trim();
}

function languageInstruction(lang: "ar" | "en"): string {
  return lang === "ar"
    ? `Write the ENTIRE document in Modern Standard Arabic (فصحى). Keep technical terms, code identifiers, file names, and commands in English where that is standard practice (e.g. AGENTS.md, API, CI/CD, PostgreSQL). Use proper Arabic headings and RTL-friendly tables.`
    : `Write the ENTIRE document in clear, professional English.`;
}

export function buildDocPrompt(
  def: DocDefinition,
  name: string,
  idea: string,
  config: ProjectConfig,
): string {
  const lang = languageInstruction(config.docLanguage);
  const brief = projectBrief(name, idea, config);

  const bodies: Record<DocDefinition["key"], string> = {
    prd: `Write the Product Requirements Document (PRD) for this project, file "${def.fileName}".
Required structure:
1. Vision & problem statement — the intent behind the product (intent is the new interface).
2. Goals & measurable success metrics (North-star + guardrail metrics).
3. Target personas with jobs-to-be-done.
4. Scope: in-scope / explicitly out-of-scope (protect against scope creep by agents).
5. User stories in the format "As a … I want … so that …" grouped by capability, EACH with numbered acceptance criteria in Given/When/Then form.
6. Edge cases & failure modes a coding agent would likely miss (the 80% problem): empty states, concurrency, permissions, validation, limits.
7. Non-functional requirements: performance budgets, availability, accessibility (WCAG), localization.
8. Open questions that REQUIRE human decisions — present each with options and a recommendation.
${lang}`,

    architecture: `Write the Architecture document for this project, file "${def.fileName}".
Required structure:
1. System overview with a Mermaid diagram (context level).
2. Recommended tech stack in a table: layer / choice / justification — modern, proven, maintainable. ${config.preferredStack ? `Respect the user's preferred stack where sensible: ${config.preferredStack}.` : ""}
3. Component/module breakdown with clear boundaries and ownership.
4. Data model: entities, relationships (Mermaid ER diagram), indexing strategy.
5. API surface: key endpoints/operations with request/response shapes.
6. Cross-cutting concerns: authentication/authorization, error handling strategy, logging, caching, background jobs.
7. Scalability & reliability design for the stated scale (${SCALE_LABELS[config.scale]}).
8. Exactly 4 Architecture Decision Records (ADRs) covering the most consequential choices: status, context, decision, consequences, alternatives.
9. Risks & trade-offs — what this architecture deliberately does NOT solve.
${lang}`,

    agentsMd: `Write the AGENTS.md file for this project's repository — the static context that every coding agent loads first (per the paper: start with stack, conventions, hard rules, workflow; add a rule every time the agent misbehaves).
Required structure:
1. Project summary (3-5 lines an agent can rely on).
2. Tech stack & versions table.
3. Repository structure map with the purpose of each top-level directory.
4. Build / test / lint / run commands (concrete commands for the chosen stack).
5. Coding conventions: naming, file organization, state management, styling, error handling patterns.
6. HARD RULES (numbered, non-negotiable): e.g. never commit secrets, never edit generated files, always run tests before finishing, type-safety requirements, forbidden dependencies.
7. Testing contract: what must exist before any PR (unit/integration/e2e expectations).
8. Git & PR workflow: branch naming, commit conventions, review gates.
9. "Definition of done" checklist.
10. Boundaries: what the agent must NEVER touch and when it must STOP and ask a human.
${lang}`,

    contextPack: `Write the Context Engineering pack for this project, file "${def.fileName}" — the plan for what context coding agents receive (per the paper's six context types and the static/dynamic boundary).
Required structure:
1. Context architecture overview: what is static (always loaded) vs dynamic (on demand) and WHY — treat this boundary as a versioned architectural decision.
2. The six context types applied to THIS project (one section each):
   - Instructions: the agent's role, goals, operational boundaries.
   - Knowledge: docs, diagrams, domain data and how they are retrieved (RAG/links).
   - Memory: short-term session logs and long-term project memory — what is stored where.
   - Examples: 3 concrete few-shot examples (good vs bad output) for the most common task types in this project.
   - Tools: the precise tool/API surface agents may use, with when-and-how notes.
   - Guardrails: hard constraints, formatting rules, validations.
3. Agent Skills design: propose 3-5 skills (name, trigger conditions, what they load progressively) for recurring workflows in this project.
4. Token economics: context budget per task type; what is excluded to keep the signal dense.
5. Maintenance protocol: how context files are reviewed, versioned, and owned like code.
${lang}`,

    specPlan: `Write the Spec-Driven Implementation Plan for this project, file "${def.fileName}" — the factory floor plan for orchestrating coding agents.
Required structure:
1. Delivery strategy: phases/milestones (M0 foundation → Mn launch), each with exit criteria.
2. Task decomposition: break the build into 12-20 agent-sized tasks. For EACH task provide a spec card in a table or structured block containing: ID, title, objective, files/modules touched, dependencies, exact success criteria (verifiable), estimated complexity (S/M/L), and the recommended mode (Conductor for tricky/novel logic, Orchestrator for well-specified work).
3. The 80% problem register: list the specific edge cases, integration points, and correctness requirements in THIS project that agents will likely get wrong, with the verification for each.
4. Feedback loop design: how failing tests/evals route back to the agent for correction (the think→act→observe loop).
5. Parallelization plan: which tasks can run concurrently as background agents.
${lang}`,

    testingEvals: `Write the Tests & Evals strategy for this project, file "${def.fileName}" — per the paper, tests verify deterministic behavior and evals verify non-deterministic behavior; together they are the contract with the AI.
Required structure:
1. Testing philosophy: the eval sets the bar, not the demo.
2. Test pyramid for this stack: unit / integration / E2E — what goes at each level, with the concrete frameworks to use.
3. Critical test matrix: table of the 15 most important test cases for THIS project (area / case / type / expected).
4. Eval suite design: for any non-deterministic behavior (AI features, fuzzy logic, UX copy) define 5 evals, each with: name, dataset source, scoring rubric (0-3 or pass/fail criteria), and judge (code check vs LM judge).
5. Quality gates in CI: exact gates that block a merge (coverage floor, type checks, lint, eval pass rate).
6. The continuous quality flywheel: evaluate → diagnose failure clusters → optimize → regression-verify → monitor in production.
${lang}`,

    guardrails: `Write the Guardrails & Security document for this project, file "${def.fileName}".
Required structure:
1. Threat model: top 8 risks for THIS project type (injection, auth bypass, data exposure, supply-chain/slopsquatting, secret leakage...) with likelihood/impact and mitigation.
2. Deterministic hooks (per the paper, hooks are for what the agent must never forget): a table of lifecycle hooks — pre-tool-call, post-edit, pre-commit, pre-deploy — with the exact check each performs (e.g. block hard-coded secrets, enforce lint, block dependency additions without review).
3. Sandbox & permissions policy: what agents may execute, network access, file-system boundaries, scoped credentials.
4. Secrets management: storage, rotation, and the rules of what never enters a prompt/context window.
5. Supply-chain policy: dependency verification (the paper warns about hallucinated packages), lockfiles, review of agent-added dependencies.
6. Zero-trust development checklist for AI-generated code review: hallucinated imports, inadequate error handling, subtle correctness gaps.
7. Compliance & data protection notes appropriate to the audience and scale.
${lang}`,

    devopsObservability: `Write the Deployment & Observability document for this project, file "${def.fileName}".
Required structure:
1. Environments & promotion: dev → staging → production, with the infrastructure choices for the stated scale (${SCALE_LABELS[config.scale]}).
2. CI/CD pipeline: stages as a Mermaid flowchart; AI-aware touches (AI first-pass review, deploy-risk prediction, auto-rollback triggers).
3. Observability stack: logs, traces, metrics — concrete tooling and the exact signals to collect.
4. Agent observability (per the paper's harness): trace every agent run, token cost & latency metering, drift detection — include a table of the metrics and alert thresholds.
5. SLOs/SLIs with error budgets for the core user journeys.
6. Incident response & rollback runbook (concise, actionable).
7. Cost governance: token/infrastructure budgets and the routing rules that keep costs down.
${lang}`,

    roadmap: `Write the Roadmap & Maintenance document for this project, file "${def.fileName}".
Required structure:
1. Post-launch evolution plan: 3 horizons (stabilize / grow / scale) with themes, not just dates.
2. Technical-debt policy: how AI-generated code is audited, refactored, and modernized continuously (the paper: legacy code is now safely touchable with agents).
3. Maintenance workflows: dependency updates, migrations, security patches — which are delegated to agents and under what review.
4. Team operating model: when developers work as Conductors vs Orchestrators on this project; review rituals for agent output.
5. Knowledge management: keeping AGENTS.md, the context pack, and eval suites alive as the codebase evolves (context as a compounding team asset).
6. Scaling the documentation: how new features flow through the same spec→agent→verify pipeline.
${lang}`,
  };

  return `${bodies[def.key]}

---

${brief}

Remember: output Markdown only, starting with the H1 title of the document. Be specific to THIS project — reference its actual features, audience, and constraints throughout.`;
}
