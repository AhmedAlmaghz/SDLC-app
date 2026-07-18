import {
  APP_TYPE_LABELS,
  DOC_DEFINITIONS,
  FEATURE_LABELS,
  SCALE_LABELS,
  APPLICATION_MODE_LABELS,
  CODE_AGENT_LABELS,
  type AppType,
  type DocKey,
  type ProjectConfig,
} from "@contracts/types";

/**
 * محرك القوالب الهندسي — يولّد حزمة توثيق كاملة ومنظمة دون نموذج ذكاء اصطناعي.
 * يُستخدم كاحتياط موثوق عند غياب مفتاح المزوّد أو فشل التوليد،
 * ويضمن أن تبقى الأداة منتِجة في كل الظروف (Graceful Degradation).
 */

interface Ctx {
  name: string;
  idea: string;
  config: ProjectConfig;
  ar: boolean;
  appTypeLabel: string;
  scaleLabel: string;
  features: string[];
  applicationModeLabel: string;
  codeAgentLabel: string;
  stack: { layer: string; choice: string; why: string }[];
  professionalContext: string[];
}

function recommendStack(appType: AppType, ar: boolean): Ctx["stack"] {
  const L = (a: string, e: string) => (ar ? a : e);
  switch (appType) {
    case "mobile":
      return [
        { layer: L("الواجهة", "UI"), choice: "React Native + TypeScript + Expo", why: L("شفرة واحدة لمنصتين ومنظومة ناضجة", "Single codebase, mature ecosystem") },
        { layer: L("الخلفية", "Backend"), choice: "Hono + tRPC على Node.js", why: L("أمان أنواع طرف-لطرف وخفة في الأداء", "End-to-end type safety, lightweight") },
        { layer: L("قاعدة البيانات", "Database"), choice: "SQLite للتطوير / PostgreSQL للإنتاج + Drizzle ORM", why: L("بساطة التطوير وقوة الإنتاج بمخطط واحد", "Simple dev, robust prod, one schema") },
        { layer: L("الحالة", "State"), choice: "TanStack Query + Zustand", why: L("فصل حالة الخادم عن حالة الواجهة", "Separates server state from UI state") },
        { layer: L("الاختبارات", "Testing"), choice: "Vitest + Maestro", why: L("وحدات سريعة وتدفقات E2E للجوال", "Fast units + mobile E2E flows") },
      ];
    case "api":
      return [
        { layer: L("إطار العمل", "Framework"), choice: "Hono + tRPC + TypeScript", why: L("أداء عالٍ وأنواع مشتركة مع العملاء", "High performance, shared types") },
        { layer: L("قاعدة البيانات", "Database"), choice: "SQLite للتطوير / PostgreSQL للإنتاج + Drizzle ORM", why: L("تطوير بلا إعداد وإنتاج موثوق", "Zero-config dev, reliable prod") },
        { layer: L("التحقق", "Validation"), choice: "Zod على كل المداخل", why: L("عقود صارمة عند الحدود", "Strict contracts at boundaries") },
        { layer: L("المصادقة", "Auth"), choice: "JWT + OAuth 2.0", why: L("معيار صناعي قابل للتدقيق", "Auditable industry standard") },
        { layer: L("الاختبارات", "Testing"), choice: "Vitest + supertest", why: L("تغطية وحدات وعقود API", "Unit + API contract coverage") },
      ];
    case "aiAgent":
      return [
        { layer: L("النواة", "Core"), choice: "TypeScript + Vercel AI SDK", why: L("تجريد موحّد لمزودي النماذج وتوجيهها", "Unified provider abstraction & routing") },
        { layer: L("الأدوات", "Tools"), choice: "MCP + أدوات داخلية معرّفة بـ Zod", why: L("معيار مفتوح قابل للنقل بين البائعين", "Open, vendor-portable standard") },
        { layer: L("التنسيق", "Orchestration"), choice: "حلقة وكيل (perceive→plan→act→observe) مع مهارات", why: L("إفصاح تدريجي يحافظ على كثافة السياق", "Progressive disclosure keeps context dense") },
        { layer: L("التخزين", "Storage"), choice: "SQLite للتطوير / PostgreSQL للإنتاج + Drizzle ORM", why: L("ذاكرة وجلسات دائمة", "Durable memory & sessions") },
        { layer: L("التقييم", "Evals"), choice: "مجموعات تقييم + قضاة LM في CI", why: L("العتبة عند التقييم لا العرض التجريبي", "The bar is the eval, not the demo") },
      ];
    default:
      return [
        { layer: L("الواجهة", "Frontend"), choice: "React 19 + TypeScript + Vite + Tailwind + shadcn/ui", why: L("معيار حديث، مكونات جاهزة، أداء ممتاز", "Modern standard, ready components, great perf") },
        { layer: L("الخلفية", "Backend"), choice: "Hono + tRPC", why: L("أمان أنواع طرف-لطرف بلا توليد شفرة", "End-to-end types without codegen") },
        { layer: L("قاعدة البيانات", "Database"), choice: "SQLite للتطوير / PostgreSQL للإنتاج + Drizzle ORM", why: L("مخطط واحد بمحركين حسب البيئة", "One schema, two engines by environment") },
        { layer: L("الحالة", "State"), choice: "TanStack Query", why: L("مزامنة خادم موثوقة وتخزين مؤقت ذكي", "Reliable sync, smart caching") },
        { layer: L("الاختبارات", "Testing"), choice: "Vitest + Playwright", why: L("وحدات سريعة واختبارات متصفح حقيقية", "Fast units + real browser E2E") },
      ];
  }
}

function professionalContextLines(ctx: { config: ProjectConfig; ar: boolean }): string[] {
  const c = ctx.config.professionalContext;
  if (!c) return [];
  const out: string[] = [];
  const add = (labelAr: string, labelEn: string, value?: string) => {
    if (value && value.trim()) out.push(`- ${t(ctx.ar, labelAr, labelEn)}: ${value.trim()}`);
  };
  add("سياق التطبيق القائم", "Existing app context", c.existingAppContext);
  add("قيود التسليم", "Delivery constraints", c.deliveryConstraints);
  add("أولويات غير وظيفية", "Non-functional priorities", c.nonFunctionalPriorities);
  add("التكاملات", "Integrations", c.integrations);
  add("هدف النشر", "Deployment target", c.deploymentTarget);
  add("ملف الجودة", "Quality profile", c.qualityProfile);
  add("مقاييس النجاح", "Success metrics", c.successMetrics);
  add("الأمان والامتثال وحساسية البيانات", "Security / compliance / data sensitivity", c.securityCompliance);
  return out;
}

function makeCtx(name: string, idea: string, config: ProjectConfig): Ctx {
  const ar = config.docLanguage === "ar";
  const base: Omit<Ctx, "professionalContext"> = {
    name,
    idea,
    config,
    ar,
    appTypeLabel: ar ? APP_TYPE_LABELS[config.appType].ar : APP_TYPE_LABELS[config.appType].en,
    scaleLabel: SCALE_LABELS[config.scale],
    features: config.features.map((f) => FEATURE_LABELS[f]),
    applicationModeLabel: config.applicationMode
      ? ar
        ? APPLICATION_MODE_LABELS[config.applicationMode].ar
        : APPLICATION_MODE_LABELS[config.applicationMode].en
      : t(ar, "بناء جديد", "New build"),
    codeAgentLabel: config.preferredCodeAgent ? CODE_AGENT_LABELS[config.preferredCodeAgent] : t(ar, "لا تفضيل", "No preference"),
    stack: recommendStack(config.appType, ar),
  };
  return { ...base, professionalContext: professionalContextLines({ config, ar }) };
}

const t = (ar: boolean, a: string, e: string) => (ar ? a : e);

function stackTable(ctx: Ctx): string {
  const head = t(ctx.ar, "| الطبقة | الاختيار | المبرر |\n|---|---|---|", "| Layer | Choice | Rationale |\n|---|---|---|");
  return `${head}\n${ctx.stack.map((s) => `| ${s.layer} | ${s.choice} | ${s.why} |`).join("\n")}`;
}

function featureTasks(ctx: Ctx): string {
  const base = [
    t(ctx.ar, "تهيئة المستودع، البناء، وفحص الأنواع والتنسيق في CI", "Repo scaffolding, build, type-check & lint in CI"),
    t(ctx.ar, "مخطط قاعدة البيانات والهجرات (SQLite تطوير / PostgreSQL إنتاج)", "Database schema & migrations (SQLite dev / PostgreSQL prod)"),
    t(ctx.ar, "نماذج المجال والتحقق من المدخلات بـ Zod", "Domain models & Zod input validation"),
    t(ctx.ar, "الواجهات الأساسية للرحلة الرئيسية", "Core UI for the primary user journey"),
  ];
  const feat = ctx.features.map((f) =>
    t(ctx.ar, `تنفيذ قدرة «${f}» مع اختباراتها`, `Implement "${f}" capability with its tests`),
  );
  const tail = [
    t(ctx.ar, "حالات الخطأ والحالات الحدّية والتحميل", "Error states, edge cases & loading states"),
    t(ctx.ar, "اختبارات E2E للرحلات الحرجة", "E2E tests for critical journeys"),
    t(ctx.ar, "المراقبة، السجلات، ولوحة مقاييس الوكيل", "Observability, logging & agent metrics dashboard"),
  ];
  return [...base, ...feat, ...tail]
    .map((task, i) => `| T${String(i + 1).padStart(2, "0")} | ${task} | ${i < 3 ? "M0" : i < base.length + feat.length ? "M1" : "M2"} |`)
    .join("\n");
}

// ---------------------------------------------------------------------------
// مولّدات الوثائق
// ---------------------------------------------------------------------------

const generators: Record<DocKey, (ctx: Ctx) => string> = {
  prd: (ctx) => `# ${t(ctx.ar, "وثيقة متطلبات المنتج (PRD)", "Product Requirements Document")} — ${ctx.name}

> ${t(ctx.ar, "وُلّدت هذه الوثيقة وفق إطار «SDLC الجديد»: المتطلبات محادثة تُنتج المواصفة، لا وثيقة تُسلَّم بين الفرق.", "Generated per the New SDLC framework: requirements are a conversation that produces the spec, not a handoff document.")}

## 1. ${t(ctx.ar, "الرؤية وبيان المشكلة", "Vision & Problem Statement")}
${ctx.idea}

- ${t(ctx.ar, "نوع المنتج", "Product type")}: ${ctx.appTypeLabel}
- ${t(ctx.ar, "الجمهور المستهدف", "Target audience")}: ${ctx.config.audience || t(ctx.ar, "مستخدمون عامون", "General users")}
- ${t(ctx.ar, "نمط التطبيق", "Application mode")}: ${ctx.applicationModeLabel}
- ${t(ctx.ar, "النطاق المستهدف", "Target scale")}: ${ctx.scaleLabel}
${ctx.professionalContext.length ? `\n## ${t(ctx.ar, "السياق الاحترافي", "Professional Context")}\n${ctx.professionalContext.join("\n")}` : ""}

## 2. ${t(ctx.ar, "الأهداف ومقاييس النجاح", "Goals & Success Metrics")}
| ${t(ctx.ar, "المقياس", "Metric")} | ${t(ctx.ar, "الهدف", "Target")} | ${t(ctx.ar, "نوعه", "Kind")} |
|---|---|---|
| ${t(ctx.ar, "إتمام الرحلة الرئيسية", "Core journey completion")} | ≥ 70% | North Star |
| ${t(ctx.ar, "زمن الاستجابة p95", "p95 latency")} | < 300ms | ${t(ctx.ar, "حارس", "Guardrail")} |
| ${t(ctx.ar, "معدل الأخطاء", "Error rate")} | < 0.5% | ${t(ctx.ar, "حارس", "Guardrail")} |

## 3. ${t(ctx.ar, "الشخصيات", "Personas")}
1. **${t(ctx.ar, "المستخدم الأساسي", "Primary user")}** — ${ctx.config.audience || t(ctx.ar, "المستخدم النهائي", "End user")}: ${t(ctx.ar, "يريد إنجاز مهمته بأقل احتكاك.", "wants to get the job done with minimal friction.")}
2. **${t(ctx.ar, "المشرف/المالك", "Admin / Owner")}** — ${t(ctx.ar, "يريد رؤية وتحكماً وإدارة للمحتوى والمستخدمين.", "wants visibility, control, and administration.")}

## 4. ${t(ctx.ar, "النطاق", "Scope")}
**${t(ctx.ar, "داخل النطاق", "In scope")}:** ${ctx.features.length ? ctx.features.join("، ") : t(ctx.ar, "الوظائف الجوهرية للفكرة", "Core functionality of the idea")}.

**${t(ctx.ar, "خارج النطاق صراحةً", "Explicitly out of scope")}:** ${t(ctx.ar, "أي قدرة غير مذكورة أعلاه — تُدرج هنا لمنع زحف النطاق من الوكلاء.", "Anything not listed above — recorded to prevent agent scope creep.")}

## 5. ${t(ctx.ar, "قصص المستخدم ومعايير القبول", "User Stories & Acceptance Criteria")}
${ctx.features.length ? ctx.features.map((f, i) => `### US-${i + 1}: ${f}
- ${t(ctx.ar, `بصفتي مستخدمًا من فئة «${ctx.config.audience || "المستخدمون الأساسيون"}»، أريد قدرة «${f}» لكي أنجز هدفي بثقة.`, `As a ${ctx.config.audience || "primary user"}, I want the "${f}" capability so that I can achieve my goal reliably.`)}
- ${t(ctx.ar, "معايير القبول", "Acceptance criteria")}:
  1. ${t(ctx.ar, "بالنظر إلى حالة ابتدائية معروفة (Given)، عندما ينفذ المستخدم الإجراء (When)، تظهر النتيجة المتوقعة (Then) خلال ميزانية الأداء.", "Given a known initial state, when the user acts, then the expected result appears within the performance budget.")}
  2. ${t(ctx.ar, "تُعالج الحالات الفارغة والأخطاء برسائل واضحة.", "Empty and error states are handled with clear messaging.")}
`).join("\n") : ""}

## 6. ${t(ctx.ar, "الحالات الحدّية (مشكلة الـ 80%)", "Edge Cases (the 80% Problem)")}
- ${t(ctx.ar, "التزامن: عمليتان متزامنتان على نفس المورد.", "Concurrency: two simultaneous operations on the same resource.")}
- ${t(ctx.ar, "الصلاحيات: وصول غير مصرح لموارد الغير.", "Authorization: cross-user resource access attempts.")}
- ${t(ctx.ar, "التحقق: مدخلات حدّية (فارغة، طويلة جداً، محارف خاصة).", "Validation: boundary inputs (empty, over-long, special chars).")}
- ${t(ctx.ar, "انقطاع الشبكة أثناء العمليات الحرجة.", "Network failure mid-operation.")}

## 7. ${t(ctx.ar, "متطلبات غير وظيفية", "Non-Functional Requirements")}
- ${t(ctx.ar, "الأداء: p95 < 300ms، LCP < 2.5s.", "Performance: p95 < 300ms, LCP < 2.5s.")}
- ${t(ctx.ar, "إمكانية الوصول: WCAG 2.2 AA.", "Accessibility: WCAG 2.2 AA.")}
- ${t(ctx.ar, "التوافر: 99.9% لبيئة الإنتاج.", "Availability: 99.9% for production.")}

## 8. ${t(ctx.ar, "أسئلة تحتاج قراراً بشرياً", "Open Questions Requiring Human Decision")}
1. ${t(ctx.ar, "أولويات الإطلاق: أي القدرات في النسخة الأولى؟ (توصية: الأصغر القابل للاختبار)", "Launch priorities: which capabilities ship first? (Recommendation: the smallest testable set)")}
2. ${t(ctx.ar, "نموذج الاستضافة والميزانية التشغيلية الشهرية.", "Hosting model and monthly operating budget.")}
`,

  architecture: (ctx) => `# ${t(ctx.ar, "المعمارية وقراراتها", "Architecture & ADRs")} — ${ctx.name}

## 1. ${t(ctx.ar, "نظرة عامة", "System Overview")}
\`\`\`mermaid
flowchart LR
  U[${t(ctx.ar, "المستخدم", "User")}] --> FE[${t(ctx.ar, "الواجهة", "Frontend")}]
  FE --> API[tRPC API]
  API --> DB[(SQLite / PostgreSQL)]
  API --> OBS[${t(ctx.ar, "المراقبة", "Observability")}]
\`\`\`

## 2. ${t(ctx.ar, "المكدس التقني", "Tech Stack")}
${stackTable(ctx)}
${ctx.professionalContext.length ? `\n## ${t(ctx.ar, "السياق الاحترافي والقيود", "Professional Context & Constraints")}\n${ctx.professionalContext.join("\n")}` : ""}

## 3. ${t(ctx.ar, "المكونات والحدود", "Components & Boundaries")}
- **${t(ctx.ar, "طبقة العرض", "Presentation")}**: ${t(ctx.ar, "مكونات عديمة المعرفة بالخادم قدر الإمكان، تتواصل عبر عقود tRPC.", "Server-agnostic components communicating via tRPC contracts.")}
- **${t(ctx.ar, "طبقة التطبيق", "Application")}**: ${t(ctx.ar, "موجّهات (Routers) تنسق حالات الاستخدام وتفرض التحقق بـ Zod.", "Routers orchestrating use cases, enforcing Zod validation.")}
- **${t(ctx.ar, "طبقة البيانات", "Data")}**: ${t(ctx.ar, "Drizzle ORM بمخطط واحد، محرك SQLite للتطوير وPostgreSQL للإنتاج.", "Drizzle ORM single schema — SQLite dev, PostgreSQL prod.")}

## 4. ${t(ctx.ar, "نموذج البيانات", "Data Model")}
\`\`\`mermaid
erDiagram
  PROJECT ||--o{ DOCUMENT : has
  PROJECT ||--o{ RUN : tracks
\`\`\`
${t(ctx.ar, "فهارس على مفاتيح الربط والأعمدة المستخدمة في الفرز والتصفية.", "Indexes on foreign keys and columns used in sorting/filtering.")}

## 5. ${t(ctx.ar, "سطح الـ API", "API Surface")}
| ${t(ctx.ar, "العملية", "Operation")} | ${t(ctx.ar, "النوع", "Kind")} | ${t(ctx.ar, "الوصف", "Description")} |
|---|---|---|
| projects.list | Query | ${t(ctx.ar, "قائمة المشاريع", "List projects")} |
| projects.get | Query | ${t(ctx.ar, "تفاصيل مشروع مع وثائقه", "Project detail with docs")} |
| projects.create | Mutation | ${t(ctx.ar, "إنشاء وتوليد الحزمة", "Create & generate package")} |

## 6. ${t(ctx.ar, "الاهتمامات المستعرضة", "Cross-Cutting Concerns")}
- ${t(ctx.ar, "معالجة الأخطاء: أخطاء مُوسومة عبر الحدود، رسائل آمنة للمستخدم.", "Error handling: tagged errors across boundaries, safe user messages.")}
- ${t(ctx.ar, "السجلات: سجلات منظمة (JSON) بمعرف طلب موحّد.", "Logging: structured JSON logs with a unified request ID.")}

## 7. ${t(ctx.ar, "سجلات القرارات المعمارية (ADR)", "Architecture Decision Records")}

### ADR-001: ${t(ctx.ar, "قاعدة بيانات مزدوجة المحرك", "Dual-engine database")}
- **${t(ctx.ar, "السياق", "Context")}**: ${t(ctx.ar, "سرعة التطوير مقابل متانة الإنتاج.", "Dev speed vs production robustness.")}
- **${t(ctx.ar, "القرار", "Decision")}**: SQLite ${t(ctx.ar, "للتطوير و", "for dev, ")}PostgreSQL ${t(ctx.ar, "للإنتاج بمخطط Drizzle واحد بنيوياً.", "for prod with structurally identical Drizzle schemas.")}
- **${t(ctx.ar, "العواقب", "Consequences")}**: ${t(ctx.ar, "صفر إعداد محلياً؛ يجب الحفاظ على تطابق المخططين.", "Zero local setup; the two schemas must stay in sync.")}

### ADR-002: tRPC ${t(ctx.ar, "بدلاً من REST المفتوح", "over open REST")}
- **${t(ctx.ar, "القرار", "Decision")}**: ${t(ctx.ar, "أنواع مشتركة طرف-لطرف عبر contracts/ دون توليد شفرة.", "Shared end-to-end types via contracts/ without codegen.")}

### ADR-003: ${t(ctx.ar, "توليد غير متزامن للوثائق", "Asynchronous doc generation")}
- **${t(ctx.ar, "القرار", "Decision")}**: ${t(ctx.ar, "مهمة خلفية + استطلاع حالة، مع تسجيل مقاييس كل وثيقة.", "Background job + status polling, with per-doc metrics.")}

### ADR-004: ${t(ctx.ar, "احتياط القوالب الهندسية", "Template-engine fallback")}
- **${t(ctx.ar, "القرار", "Decision")}**: ${t(ctx.ar, "عند غياب مزود AI يعمل محرك قوالب حتمي — النظام منتِج دائماً.", "Without an AI provider, a deterministic template engine keeps the system productive.")}

## 8. ${t(ctx.ar, "المخاطر والمفاضلات", "Risks & Trade-offs")}
- ${t(ctx.ar, "لا يعالج هذا التصميم التوزيع متعدد المناطق في نطاقه الحالي.", "Multi-region distribution is out of the current design's scope.")}
`,

  agentsMd: (ctx) => `# AGENTS.md — ${ctx.name}

> ${t(ctx.ar, "السياق الساكن الذي يُحمَّل أولاً لكل وكيل برمجة. أضف قاعدة جديدة كلما أخطأ الوكيل خطأً لا يجب أن يتكرر.", "The static context loaded first by every coding agent. Add a rule whenever the agent makes a mistake that must not recur.")}

## ${t(ctx.ar, "ملخص المشروع", "Project Summary")}
${ctx.name} — ${ctx.appTypeLabel}. ${ctx.idea.split("\n")[0]}

- ${t(ctx.ar, "وكيل البرمجة المفضل", "Preferred code agent")}: ${ctx.codeAgentLabel}
- ${t(ctx.ar, "نمط التطبيق", "Application mode")}: ${ctx.applicationModeLabel}

## ${t(ctx.ar, "المكدس والإصدارات", "Stack & Versions")}
${stackTable(ctx)}

## ${t(ctx.ar, "خريطة المستودع", "Repository Map")}
| ${t(ctx.ar, "المسار", "Path")} | ${t(ctx.ar, "الغرض", "Purpose")} |
|---|---|
| \`src/\` | ${t(ctx.ar, "الواجهة الأمامية (React)", "Frontend (React)")} |
| \`api/\` | ${t(ctx.ar, "الخادم وموجّهات tRPC", "Server & tRPC routers")} |
| \`contracts/\` | ${t(ctx.ar, "الأنواع المشتركة بين الطرفين", "Shared types across the boundary")} |
| \`db/\` | ${t(ctx.ar, "مخططا قاعدة البيانات والهجرات", "DB schemas & migrations")} |

## ${t(ctx.ar, "الأوامر", "Commands")}
\`\`\`bash
npm run dev        # ${t(ctx.ar, "تشغيل التطوير", "Dev server")}
npm run check      # ${t(ctx.ar, "فحص الأنواع — يجب أن يمر قبل أي إنهاء", "Type check — must pass before finishing")}
npm run test       # ${t(ctx.ar, "تشغيل الاختبارات", "Run tests")}
npm run build      # ${t(ctx.ar, "بناء الإنتاج", "Production build")}
npm run db:push    # ${t(ctx.ar, "مزامنة مخطط SQLite (تطوير)", "Sync SQLite schema (dev)")}
\`\`\`

## ${t(ctx.ar, "الاصطلاحات", "Conventions")}
- ${t(ctx.ar, "TypeScript صارم؛ ممنوع \`any\` إلا بتعليل في تعليق.", "Strict TypeScript; no \`any\` without a justifying comment.")}
- ${t(ctx.ar, "لا استعلامات SQL خام — استعلامات Drizzle الآمنة نوعياً فقط.", "No raw SQL — Drizzle type-safe queries only.")}
- ${t(ctx.ar, "كل إجراء tRPC يتحقق من مدخلاته بـ Zod.", "Every tRPC procedure validates input with Zod.")}
- ${t(ctx.ar, "الواجهة عربية RTL افتراضياً مع دعم الإنجليزية في المكونات التقنية.", "UI defaults to Arabic RTL with English in technical components.")}

## ${t(ctx.ar, "القواعد الصارمة (غير قابلة للتفاوض)", "HARD RULES (non-negotiable)")}
1. ${t(ctx.ar, "ممنوع كتابة أسرار أو مفاتيح في الشفرة — استخدم متغيرات البيئة.", "NEVER hardcode secrets or keys — use environment variables.")}
2. ${t(ctx.ar, "ممنوع تعديل ملفات البنية المولّدة (\`api/lib/\`).", "NEVER modify generated framework internals (\`api/lib/\`).")}
3. ${t(ctx.ar, "شغّل \`npm run check\` و\`npm run test\` قبل إعلان إنجاز أي مهمة.", "Run \`npm run check\` and \`npm run test\` before declaring any task done.")}
4. ${t(ctx.ar, "أي تبعية جديدة تتطلب مبرراً وتحققاً من وجودها الحقيقي في السجل.", "Any new dependency requires justification and verification it really exists in the registry.")}
5. ${t(ctx.ar, "ممنوع \`db:push --force\` أو إسقاط الجداول.", "NEVER \`db:push --force\` or drop tables.")}

## ${t(ctx.ar, "عقد الاختبارات", "Testing Contract")}
${t(ctx.ar, "لا يُقبل أي PR دون: اختبارات وحدة للمنطق الجديد، واختبار تكامل لكل إجراء، واختبار E2E لكل رحلة حرجة.", "No PR is accepted without: unit tests for new logic, an integration test per procedure, and an E2E test per critical journey.")}

## ${t(ctx.ar, "تعريف الإنجاز", "Definition of Done")}
- [ ] ${t(ctx.ar, "فحص الأنواع والاختبارات خضراء", "Type check & tests green")}
- [ ] ${t(ctx.ar, "معالجة حالات الخطأ الواقعية لا السعيدة فقط", "Realistic error handling, not just the happy path")}
- [ ] ${t(ctx.ar, "تحديث الوثائق عند تغيير العقود", "Docs updated when contracts change")}

## ${t(ctx.ar, "الحدود — متى يتوقف الوكيل ويسأل", "Boundaries — When the Agent MUST Stop and Ask")}
- ${t(ctx.ar, "تغييرات مخطط قاعدة البيانات المدمرة.", "Destructive database schema changes.")}
- ${t(ctx.ar, "قرارات معمارية تتجاوز المهمة الحالية.", "Architectural decisions beyond the current task.")}
- ${t(ctx.ar, "متطلبات غامضة — لا تخمّن، اسأل.", "Ambiguous requirements — don't guess, ask.")}
`,

  contextPack: (ctx) => `# ${t(ctx.ar, "حزمة هندسة السياق", "Context Engineering Pack")} — ${ctx.name}

## 1. ${t(ctx.ar, "بنية السياق: ساكن مقابل ديناميكي", "Context Architecture: Static vs Dynamic")}
| | ${t(ctx.ar, "ساكن (يُحمَّل دائماً)", "Static (always loaded)")} | ${t(ctx.ar, "ديناميكي (عند الطلب)", "Dynamic (on demand)")} |
|---|---|---|
| ${t(ctx.ar, "المحتوى", "Content")} | AGENTS.md، ${t(ctx.ar, "القواعد الصارمة، أوامر البناء", "hard rules, build commands")} | ${t(ctx.ar, "وثائق العمق، نتائج الأدوات، المهارات", "Deep docs, tool results, skills")} |
| ${t(ctx.ar, "التكلفة", "Cost")} | ${t(ctx.ar, "تُدفع في كل تفاعل — أبقها كثيفة الإشارة", "Paid every interaction — keep it high-signal")} | ${t(ctx.ar, "تُدفع عند الحاجة فقط", "Paid only when needed")} |

## 2. ${t(ctx.ar, "الأنواع الستة للسياق مطبّقة على هذا المشروع", "The Six Context Types Applied")}

### ${t(ctx.ar, "التعليمات", "Instructions")}
${t(ctx.ar, "دور الوكيل: مهندس تنفيذ ضمن قيود AGENTS.md؛ هدفه إنتاج شفرة مختبرة تطابق المواصفة؛ حدوده موثقة في قسم «الحدود».", "Agent role: implementation engineer within AGENTS.md constraints; goal is tested code matching the spec; boundaries documented.")}

### ${t(ctx.ar, "المعرفة", "Knowledge")}
${t(ctx.ar, "وثائق الحزمة التسع هي مصدر الحقيقة. تُسترجع عند الطلب بروابط مباشرة، ولا تُلصق كاملة في نافذة السياق.", "The nine package documents are the source of truth. Retrieved on demand via direct links — never pasted wholesale into the context window.")}

### ${t(ctx.ar, "الذاكرة", "Memory")}
- ${t(ctx.ar, "قصيرة المدى: سجل الجلسة الحالية والقرارات المؤقتة.", "Short-term: current session log and transient decisions.")}
- ${t(ctx.ar, "طويلة المدى: AGENTS.md وسجلات ADR — تُراجَع كشفرة.", "Long-term: AGENTS.md and ADRs — reviewed like code.")}

### ${t(ctx.ar, "الأمثلة", "Examples")}
${t(ctx.ar, "مثالان سلوكيان لكل نمط متكرر (إجراء tRPC نموذجي، مكوّن واجهة نموذجي) — مثال جيد ومثال مرفوض مع السبب.", "Two behavioral examples per recurring pattern (a canonical tRPC procedure, a canonical UI component) — one good, one rejected with reasons.")}

### ${t(ctx.ar, "الأدوات", "Tools")}
${t(ctx.ar, "أدوات الوكيل: نظام الملفات، الطرفية (بناء/اختبار)، البحث في الشفرة — بلا وصول شبكي خارجي إلا بإذن صريح.", "Agent tools: filesystem, terminal (build/test), code search — no external network access without explicit permission.")}

### ${t(ctx.ar, "الحواجز", "Guardrails")}
${t(ctx.ar, "قواعد التنسيق، حظر الأسرار، وبوابات الاختبار — تفاصيل التنفيذ في وثيقة الحواجز والأمان.", "Formatting rules, secret blocking, test gates — implementation details in the Guardrails & Security document.")}

## 3. ${t(ctx.ar, "تصميم المهارات (Agent Skills)", "Agent Skills Design")}
| ${t(ctx.ar, "المهارة", "Skill")} | ${t(ctx.ar, "الشرط المحفّز", "Trigger")} | ${t(ctx.ar, "ما تُحمّله تدريجياً", "Progressively loads")} |
|---|---|---|
| add-feature | ${t(ctx.ar, "طلب قدرة جديدة", "New capability request")} | ${t(ctx.ar, "نمط الميزة الكامل: عقد + إجراء + واجهة + اختبارات", "Full feature pattern: contract + procedure + UI + tests")} |
| fix-bug | ${t(ctx.ar, "تقرير خطأ", "Bug report")} | ${t(ctx.ar, "بروتوكول إعادة الإنتاج ثم الإصلاح باختبار تراجع", "Reproduce-then-fix protocol with regression test")} |
| review-pr | PR ${t(ctx.ar, "جاهز للمراجعة", "ready")} | ${t(ctx.ar, "قائمة فحص الشفرة المولّدة بالذكاء الاصطناعي", "AI-generated code review checklist")} |

## 4. ${t(ctx.ar, "اقتصاد الرموز", "Token Economics")}
- ${t(ctx.ar, "ميزانية السياق الساكن: أقل من 2000 رمز.", "Static context budget: under 2k tokens.")}
- ${t(ctx.ar, "توجيه النماذج: المهام المعقدة (معمارية/تخطيط) للنموذج الرئيسي، والقياسية (اختبارات/مراجعة) للنموذج الصغير.", "Model routing: complex work (architecture/planning) → flagship model; standard work (tests/review) → small model.")}

## 5. ${t(ctx.ar, "بروتوكول الصيانة", "Maintenance Protocol")}
${t(ctx.ar, "ملفات السياق تُراجَع في PRs، وتُؤرخَن مع المشروع، ولها مالكون مسمَّون — وإلا انحرف الـ Harness.", "Context files are reviewed in PRs, versioned with the project, and have named owners — otherwise the harness drifts.")}
`,

  specPlan: (ctx) => `# ${t(ctx.ar, "خطة التنفيذ الموجهة بالمواصفات", "Spec-Driven Implementation Plan")} — ${ctx.name}

## 1. ${t(ctx.ar, "استراتيجية التسليم", "Delivery Strategy")}
| ${t(ctx.ar, "المرحلة", "Milestone")} | ${t(ctx.ar, "المحتوى", "Content")} | ${t(ctx.ar, "معيار الخروج", "Exit criteria")} |
|---|---|---|
| M0 — ${t(ctx.ar, "الأساس", "Foundation")} | ${t(ctx.ar, "المستودع، قاعدة البيانات، CI", "Repo, database, CI")} | ${t(ctx.ar, "بناء أخضر واختبار دخاني", "Green build + smoke test")} |
| M1 — ${t(ctx.ar, "القدرات", "Capabilities")} | ${t(ctx.ar, "قدرات الفكرة الجوهرية", "Core idea capabilities")} | ${t(ctx.ar, "قصص المستخدم تطابق معايير القبول", "User stories meet acceptance criteria")} |
| M2 — ${t(ctx.ar, "التصليب", "Hardening")} | ${t(ctx.ar, "الحالات الحدّية، المراقبة، الأداء", "Edge cases, observability, performance")} | ${t(ctx.ar, "بوابات الجودة خضراء", "Quality gates green")} |

${ctx.professionalContext.length ? `## ${t(ctx.ar, "السياق الاحترافي الموجِّه", "Guiding Professional Context")}\n${ctx.professionalContext.join("\n")}\n\n` : ""}## 2. ${t(ctx.ar, "تجزئة المهام بحجم الوكيل", "Agent-Sized Task Decomposition")}
| ${t(ctx.ar, "المعرّف", "ID")} | ${t(ctx.ar, "المهمة", "Task")} | ${t(ctx.ar, "المرحلة", "Milestone")} |
|---|---|---|
${featureTasks(ctx)}

${t(ctx.ar, `**لكل مهمة:** معيار نجاح قابل للتحقق (اختبار يمر)، ووضع موصى به — الموجّه (Conductor) للمنطق الجديد الدقيق، والمنسّق (Orchestrator) للمهام المحددة جيداً التي يمكن تسليمها لوكيل خلفي. وكيل البرمجة المفضل: ${ctx.codeAgentLabel}.`, `**Each task:** a verifiable success criterion (a passing test), and a recommended mode — Conductor for tricky novel logic, Orchestrator for well-specified work delegable to a background agent. Preferred code agent: ${ctx.codeAgentLabel}.`)}

## 3. ${t(ctx.ar, "سجل مشكلة الـ 80%", "The 80% Problem Register")}
| ${t(ctx.ar, "الموضع المتوقع للخطأ", "Likely failure point")} | ${t(ctx.ar, "التحقق", "Verification")} |
|---|---|
| ${t(ctx.ar, "افتراضات خاطئة عن منطق العمل في", "Wrong business-logic assumptions in")} ${ctx.features[0] || t(ctx.ar, "الرحلة الرئيسية", "the core journey")} | ${t(ctx.ar, "اختبارات معايير القبول", "Acceptance-criteria tests")} |
| ${t(ctx.ar, "تبعيات مُهلوسة غير موجودة في السجل", "Hallucinated dependencies")} | ${t(ctx.ar, "فحص السجل قبل التثبيت + lockfile", "Registry check before install + lockfile")} |
| ${t(ctx.ar, "معالجة أخطاء سطحية تبتلع الفشل", "Shallow error handling swallowing failures")} | ${t(ctx.ar, "اختبارات حقن الأعطال", "Fault-injection tests")} |
| ${t(ctx.ar, "حالات سباق في العمليات المتزامنة", "Race conditions in concurrent operations")} | ${t(ctx.ar, "اختبارات تزامن ومعاملات قاعدة البيانات", "Concurrency tests + DB transactions")} |

## 4. ${t(ctx.ar, "تصميم حلقة التغذية الراجعة", "Feedback Loop Design")}
${t(ctx.ar, "فكر → نفّذ → لاحظ: عند فشل اختبار يلتقط الـ Harness مخرجات الخطأ ويعيد توجيهها للوكيل لإعادة المحاولة — بحد أقصى 3 محاولات ثم يتصعّد للإنسان.", "Think → act → observe: on test failure the harness captures error output and routes it back to the agent — max 3 attempts, then escalate to a human.")}

## 5. ${t(ctx.ar, "خطة التوازي", "Parallelization Plan")}
${t(ctx.ar, "مهام M1 المستقلة عن قاعدة البيانات يمكن أن تعمل كوكلاء خلفيين متوازيين؛ مهام M0 تسلسلية.", "M1 tasks independent of the database can run as parallel background agents; M0 tasks are sequential.")}
`,

  testingEvals: (ctx) => `# ${t(ctx.ar, "استراتيجية الاختبارات والتقييمات", "Tests & Evals Strategy")} — ${ctx.name}

> ${t(ctx.ar, "الاختبارات تتحقق من الأجزاء الحتمية؛ التقييمات (Evals) تتحقق من غير الحتمية. معاً هما العقد مع الذكاء الاصطناعي — والعتبة عند التقييم لا العرض التجريبي.", "Tests verify deterministic parts; evals verify non-deterministic ones. Together they are the contract with the AI — the bar is the eval, not the demo.")}

## 1. ${t(ctx.ar, "هرم الاختبارات", "Test Pyramid")}
- **${t(ctx.ar, "وحدة (Vitest)", "Unit (Vitest)")}**: ${t(ctx.ar, "منطق المجال النقي والتحققات.", "Pure domain logic and validators.")}
- **${t(ctx.ar, "تكامل", "Integration")}**: ${t(ctx.ar, "إجراءات tRPC ضد قاعدة بيانات حقيقية (SQLite اختبار).", "tRPC procedures against a real (SQLite) test database.")}
- **${t(ctx.ar, "شامل (Playwright)", "E2E (Playwright)")}**: ${t(ctx.ar, "الرحلات الحرجة في متصفح حقيقي.", "Critical journeys in a real browser.")}

## 2. ${t(ctx.ar, "مصفوفة الاختبارات الحرجة", "Critical Test Matrix")}
| ${t(ctx.ar, "المنطقة", "Area")} | ${t(ctx.ar, "الحالة", "Case")} | ${t(ctx.ar, "النوع", "Type")} |
|---|---|---|
| ${t(ctx.ar, "إنشاء مشروع", "Project creation")} | ${t(ctx.ar, "مدخلات صالحة تُنشئ مشروعاً ووثائقه", "Valid input creates project and docs")} | ${t(ctx.ar, "تكامل", "Integration")} |
| ${t(ctx.ar, "التحقق", "Validation")} | ${t(ctx.ar, "فكرة فارغة/قصيرة تُرفض برسالة واضحة", "Empty/short idea rejected with clear message")} | ${t(ctx.ar, "وحدة", "Unit")} |
| ${t(ctx.ar, "التوليد", "Generation")} | ${t(ctx.ar, "فشل مزود AI يفعّل الاحتياط دون فقدان بيانات", "AI provider failure triggers fallback without data loss")} | ${t(ctx.ar, "تكامل", "Integration")} |
| ${t(ctx.ar, "الصلاحيات", "Authorization")} | ${t(ctx.ar, "لا وصول لمشاريع الغير", "No cross-project access")} | ${t(ctx.ar, "تكامل", "Integration")} |
| ${t(ctx.ar, "الحالات الحدّية", "Edge cases")} | ${t(ctx.ar, "محتوى طويل جداً ومحارف خاصة", "Very long content & special characters")} | ${t(ctx.ar, "وحدة", "Unit")} |

## 3. ${t(ctx.ar, "تصميم مجموعة التقييمات", "Eval Suite Design")}
| ${t(ctx.ar, "التقييم", "Eval")} | ${t(ctx.ar, "معيار التسجيل", "Scoring rubric")} | ${t(ctx.ar, "الحكم", "Judge")} |
|---|---|---|
| ${t(ctx.ar, "اكمال حزمة التوثيق", "Package completeness")} | ${t(ctx.ar, "كل الأقسام الإلزامية موجودة (0-3)", "All mandatory sections present (0-3)")} | ${t(ctx.ar, "فحص برمجي", "Code check")} |
| ${t(ctx.ar, "خصوصية المحتوى", "Content specificity")} | ${t(ctx.ar, "يشير إلى قدرات المشروع الفعلية لا عموميات (0-3)", "References actual project capabilities, not generics (0-3)")} | ${t(ctx.ar, "قاضي LM", "LM judge")} |
| ${t(ctx.ar, "قابلية التحقق", "Verifiability")} | ${t(ctx.ar, "كل مهمة لها معيار نجاح (ناجح/راسخ)", "Every task has a success criterion (pass/fail)")} | ${t(ctx.ar, "فحص برمجي", "Code check")} |

## 4. ${t(ctx.ar, "بوابات الجودة في CI", "CI Quality Gates")}
- [ ] ${t(ctx.ar, "فحص الأنواع صفر أخطاء", "Zero type errors")}
- [ ] ${t(ctx.ar, "تغطية الوحدات ≥ 70% على المنطق الجديد", "Unit coverage ≥ 70% on new logic")}
- [ ] ${t(ctx.ar, "كل التقييمات تتجاوز عتبتها", "All evals pass their thresholds")}

## 5. ${t(ctx.ar, "دولاب الجودة المستمر", "Continuous Quality Flywheel")}
${t(ctx.ar, "قيّم → شخّص عناقيد الفشل → حسّن → تحقق بالتراجع → راقب الإنتاج. كل دورة تتراكم.", "Evaluate → diagnose failure clusters → optimize → regression-verify → monitor production. Each cycle compounds.")}
`,

  guardrails: (ctx) => `# ${t(ctx.ar, "الحواجز والأمان", "Guardrails & Security")} — ${ctx.name}

## 1. ${t(ctx.ar, "نموذج التهديدات", "Threat Model")}
| ${t(ctx.ar, "التهديد", "Threat")} | ${t(ctx.ar, "الاحتمال/الأثر", "Likelihood/Impact")} | ${t(ctx.ar, "التخفيف", "Mitigation")} |
|---|---|---|
| ${t(ctx.ar, "تسريب أسرار في الشفرة", "Secret leakage in code")} | ${t(ctx.ar, "متوسط/عالٍ", "Med/High")} | ${t(ctx.ar, "خطاف pre-commit + فحص CI", "pre-commit hook + CI scan")} |
| ${t(ctx.ar, "تبعيات مُهلوسة (slopsquatting)", "Hallucinated dependencies (slopsquatting)")} | ${t(ctx.ar, "عالٍ/عالٍ", "High/High")} | ${t(ctx.ar, "تحقق من السجل + مراجعة بشرية لكل إضافة", "Registry verification + human review per addition")} |
| ${t(ctx.ar, "حقن عبر المدخلات", "Input injection")} | ${t(ctx.ar, "متوسط/عالٍ", "Med/High")} | ${t(ctx.ar, "Zod عند كل الحدود + استعلامات مُعاملة", "Zod at all boundaries + parameterized queries")} |
| ${t(ctx.ar, "وصول غير مصرح", "Unauthorized access")} | ${t(ctx.ar, "منخفض/عالٍ", "Low/High")} | ${t(ctx.ar, "تحقق صلاحية في كل إجراء", "Authorization check in every procedure")} |

## 2. ${t(ctx.ar, "الخطافات الحتمية (Hooks)", "Deterministic Hooks")}
| ${t(ctx.ar, "نقطة الدورة", "Lifecycle point")} | ${t(ctx.ar, "الفحص", "Check")} |
|---|---|
| ${t(ctx.ar, "قبل استدعاء أداة", "Pre-tool-call")} | ${t(ctx.ar, "منع أوامر مدمرة (rm -rf، إسقاط جداول)", "Block destructive commands (rm -rf, table drops)")} |
| ${t(ctx.ar, "بعد تحرير ملف", "Post-edit")} | ${t(ctx.ar, "تنسيق + فحص أنواع سريع", "Format + fast type check")} |
| ${t(ctx.ar, "قبل الالتزام", "Pre-commit")} | ${t(ctx.ar, "فحص الأسرار + lint + اختبارات الوحدات", "Secret scan + lint + unit tests")} |
| ${t(ctx.ar, "قبل النشر", "Pre-deploy")} | ${t(ctx.ar, "اختبارات E2E + مراجعة الهجرات", "E2E tests + migration review")} |

## 3. ${t(ctx.ar, "سياسة العزل والأذونات", "Sandbox & Permissions Policy")}
- ${t(ctx.ar, "الوكيل ينفذ داخل بيئة معزولة بصلاحيات دنيا؛ لا وصول شبكي خارجي افتراضياً.", "Agents execute in a least-privilege sandbox; no external network by default.")}
- ${t(ctx.ar, "بيانات اعتماد محدودة النطاق لكل بيئة، وتُدوَّر دورياً.", "Scoped credentials per environment, rotated regularly.")}

## 4. ${t(ctx.ar, "إدارة الأسرار", "Secrets Management")}
${t(ctx.ar, "الأسرار في متغيرات البيئة فقط؛ لا تدخل نافذة سياق أي وكيل؛ تُخزَّن مشفرة وتُدوَّر كل 90 يوماً.", "Secrets live in environment variables only; never enter an agent's context window; stored encrypted, rotated every 90 days.")}

## 5. ${t(ctx.ar, "قائمة فحص مراجعة الشفرة المولّدة (ثقة صفرية)", "AI-Generated Code Review Checklist (Zero-Trust)")}
- [ ] ${t(ctx.ar, "كل الحزم المستوردة حقيقية وموجودة في السجل", "All imported packages are real and exist in the registry")}
- [ ] ${t(ctx.ar, "معالجة الأخطاء تغطي أنماط فشل واقعية", "Error handling covers realistic failure modes")}
- [ ] ${t(ctx.ar, "لا منطق «يبدو صحيحاً» دون اختبار يثبته", "No \"looks right\" logic without a proving test")}
- [ ] ${t(ctx.ar, "لا أسرار أو بيانات حساسة في السجلات", "No secrets or sensitive data in logs")}
`,

  devopsObservability: (ctx) => `# ${t(ctx.ar, "النشر والمراقبة", "Deployment & Observability")} — ${ctx.name}

## 1. ${t(ctx.ar, "البيئات والترقية", "Environments & Promotion")}
${t(ctx.ar, "تطوير (SQLite محلي) ← تجريبي (PostgreSQL) ← إنتاج (PostgreSQL). الترقية عبر بوابات CI فقط.", "Dev (local SQLite) → Staging (PostgreSQL) → Production (PostgreSQL). Promotion through CI gates only.")}

## 2. ${t(ctx.ar, "خط أنابيب CI/CD", "CI/CD Pipeline")}
\`\`\`mermaid
flowchart LR
  PR --> CHECK[${t(ctx.ar, "أنواع + lint", "Types + lint")}]
  CHECK --> TEST[${t(ctx.ar, "وحدات + تكامل", "Unit + integration")}]
  TEST --> E2E
  E2E --> REVIEW[${t(ctx.ar, "مراجعة أولى بالذكاء الاصطناعي", "AI first-pass review")}]
  REVIEW --> DEPLOY[${t(ctx.ar, "نشر", "Deploy")}]
  DEPLOY --> MON[${t(ctx.ar, "مراقبة + تراجع تلقائي", "Monitor + auto-rollback")}]
\`\`\`

## 3. ${t(ctx.ar, "مراقبة الوكيل (الـ Harness)", "Agent Observability (Harness)")}
| ${t(ctx.ar, "المقياس", "Metric")} | ${t(ctx.ar, "عتبة التنبيه", "Alert threshold")} |
|---|---|
| ${t(ctx.ar, "رموز الإدخال/الإخراج لكل توليد", "Input/output tokens per generation")} | ${t(ctx.ar, "انحراف > 50% عن المتوسط", ">50% deviation from average")} |
| ${t(ctx.ar, "زمن التوليد", "Generation latency")} | p95 > 120s |
| ${t(ctx.ar, "معدل اللجوء للاحتياط", "Fallback rate")} | > 20% |
| ${t(ctx.ar, "انحراف سلوك الوكيل", "Agent drift")} | ${t(ctx.ar, "تغير غير مقصود في المخرجات", "Unintended output changes")} |

## 4. ${t(ctx.ar, "مستويات الخدمة (SLO)", "SLOs")}
- ${t(ctx.ar, "التوافر: 99.9% شهرياً بميزانية خطأ 43 دقيقة.", "Availability: 99.9% monthly, 43-minute error budget.")}
- ${t(ctx.ar, "الأداء: p95 < 300ms للقراءات.", "Performance: p95 < 300ms for reads.")}

## 5. ${t(ctx.ar, "دليل الاستجابة للحوادث", "Incident Runbook")}
1. ${t(ctx.ar, "اكتشف عبر التنبيهات، صنّف الخطورة.", "Detect via alerts, classify severity.")}
2. ${t(ctx.ar, "تراجع تلقائي عند تجاوز معدل الخطأ العتبة.", "Auto-rollback when error rate breaches threshold.")}
3. ${t(ctx.ar, "تحليل جذري بعد الحادث يغذي الاختبارات والتقييمات.", "Post-incident root-cause feeds tests and evals.")}
`,

  roadmap: (ctx) => `# ${t(ctx.ar, "خارطة الطريق والصيانة", "Roadmap & Maintenance")} — ${ctx.name}

## 1. ${t(ctx.ar, "آفاق التطور", "Evolution Horizons")}
| ${t(ctx.ar, "الأفق", "Horizon")} | ${t(ctx.ar, "التركيز", "Focus")} |
|---|---|
| H1 — ${t(ctx.ar, "تثبيت", "Stabilize")} | ${t(ctx.ar, "سد فجوات الجودة، رفع التغطية، إغلاق ملاحظات المستخدمين الأوائل", "Close quality gaps, raise coverage, address early-user feedback")} |
| H2 — ${t(ctx.ar, "نمو", "Grow")} | ${t(ctx.ar, "قدرات جديدة عبر نفس خط «مواصفة ← وكيل ← تحقق»", "New capabilities through the same spec → agent → verify pipeline")} |
| H3 — ${t(ctx.ar, "توسع", "Scale")} | ${t(ctx.ar, "أداء، تعدد فرق، حوكمة موسّعة", "Performance, multiple teams, extended governance")} |

## 2. ${t(ctx.ar, "سياسة الدَّين التقني", "Technical-Debt Policy")}
${t(ctx.ar, "الشفرة المولّدة بالذكاء الاصطناعي تُدقَّق دورياً وتُعاد كتابتها بالوكلاء أنفسهم — الشفرة القديمة لم تعد «خطيرة اللمس». سجل دَين معلن يُراجَع كل إصدار.", "AI-generated code is audited regularly and refactored by the agents themselves — legacy code is no longer \"too risky to touch\". A public debt register is reviewed every release.")}

## 3. ${t(ctx.ar, "سير عمل الصيانة", "Maintenance Workflows")}
| ${t(ctx.ar, "النشاط", "Activity")} | ${t(ctx.ar, "المنفّذ", "Owner")} | ${t(ctx.ar, "المراجعة", "Review")} |
|---|---|---|
| ${t(ctx.ar, "تحديث التبعيات", "Dependency updates")} | ${t(ctx.ar, "وكيل خلفي مجدول", "Scheduled background agent")} | ${t(ctx.ar, "بشري + بوابات CI", "Human + CI gates")} |
| ${t(ctx.ar, "الهجرات", "Migrations")} | ${t(ctx.ar, "وكيل بإشراف مباشر", "Agent with direct supervision")} | ${t(ctx.ar, "بشري إلزامي", "Mandatory human")} |
| ${t(ctx.ar, "توليد اختبارات", "Test generation")} | ${t(ctx.ar, "وكيل منسّق", "Orchestrated agent")} | ${t(ctx.ar, "تغطية + مراجعة عينة", "Coverage + sample review")} |

## 4. ${t(ctx.ar, "النموذج التشغيلي للفريق", "Team Operating Model")}
- **${t(ctx.ar, "الموجّه (Conductor)", "Conductor")}**: ${t(ctx.ar, "للمنطق المعقد، تصحيح الأخطاء الدقيقة، والشفرة غير المألوفة.", "For complex logic, tricky debugging, unfamiliar code.")}
- **${t(ctx.ar, "المنسّق (Orchestrator)", "Orchestrator")}**: ${t(ctx.ar, "للمهام المحددة جيداً: إصلاحات، ترحيلات، توليد اختبارات — تُسلَّم لوكلاء خلفيين وتُراجَع نتائجهم.", "For well-specified tasks: fixes, migrations, test generation — delegated to background agents with reviewed output.")}

## 5. ${t(ctx.ar, "إدارة المعرفة", "Knowledge Management")}
${t(ctx.ar, "AGENTS.md وحزمة السياق ومجموعات التقييم أصول فريق متراكمة: تُراجَع في PRs وتُوثَّق وتُحسَّن باستمرار — الفريق الأكثر قيمة من يبني الـ Harness مرة ويحسّنه مرات.", "AGENTS.md, the context pack, and eval suites are compounding team assets: reviewed in PRs, documented, continuously improved — the teams that win build their harness once and refine it many times.")}
`,
};

export interface TemplateResult {
  title: string;
  fileName: string;
  content: string;
}

export function generateFromTemplate(
  key: DocKey,
  name: string,
  idea: string,
  config: ProjectConfig,
): TemplateResult {
  const ctx = makeCtx(name, idea, config);
  const def = DOC_DEFINITIONS.find((d) => d.key === key)!;
  return {
    title: config.docLanguage === "ar" ? def.titleAr : def.titleEn,
    fileName: def.fileName,
    content: generators[key](ctx),
  };
}
