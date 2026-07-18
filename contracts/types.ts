/**
 * العقود المشتركة بين الواجهة الأمامية والخلفية.
 * تستند حزمة التوثيق إلى أُطر ورقة "The New SDLC with Vibe Coding":
 * مراحل SDLC الجديدة، هندسة السياق، الـ Harness، نموذج المصنع،
 * وضعَي Conductor/Orchestrator، والاختبارات والتقييمات كعقد مع الوكيل.
 */

export * from "./errors";

// ---------------------------------------------------------------------------
// أنواع المستندات في الحزمة
// ---------------------------------------------------------------------------

export type DocKey =
  | "prd"
  | "architecture"
  | "agentsMd"
  | "contextPack"
  | "specPlan"
  | "testingEvals"
  | "guardrails"
  | "devopsObservability"
  | "roadmap";

export type DocComplexity = "high" | "standard";

export interface DocDefinition {
  key: DocKey;
  /** اسم الملف داخل الحزمة المُصدَّرة */
  fileName: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  /** مرحلة SDLC الجديدة التي تخدمها الوثيقة (وفق الورقة) */
  phaseAr: string;
  /** التعقيد → توجيه النموذج (Intelligent Model Routing) */
  complexity: DocComplexity;
}

export const DOC_DEFINITIONS: DocDefinition[] = [
  {
    key: "prd",
    fileName: "01-PRD.md",
    titleAr: "وثيقة متطلبات المنتج",
    titleEn: "Product Requirements Document",
    descriptionAr:
      "الرؤية، الشخصيات، قصص المستخدم، معايير القبول، والحالات الحدّية — المتطلبات كمحادثة تُنتج المواصفة.",
    phaseAr: "المتطلبات والتخطيط",
    complexity: "high",
  },
  {
    key: "architecture",
    fileName: "02-ARCHITECTURE.md",
    titleAr: "المعمارية وقراراتها",
    titleEn: "Architecture & ADRs",
    descriptionAr:
      "بنية النظام، نموذج البيانات، المكدس التقني، وسجلات القرارات المعمارية (ADR) مع المفاضلات.",
    phaseAr: "التصميم والمعمارية",
    complexity: "high",
  },
  {
    key: "agentsMd",
    fileName: "AGENTS.md",
    titleAr: "ملف AGENTS.md",
    titleEn: "AGENTS.md",
    descriptionAr:
      "السياق الساكن للوكيل: المكدس، الاصطلاحات، القواعد الصارمة، وسير العمل — قلب الـ Harness.",
    phaseAr: "تهيئة الـ Harness",
    complexity: "high",
  },
  {
    key: "contextPack",
    fileName: "03-CONTEXT-PACK.md",
    titleAr: "حزمة هندسة السياق",
    titleEn: "Context Engineering Pack",
    descriptionAr:
      "الأنواع الستة للسياق، الحد بين الساكن والديناميكي، وتصميم المهارات (Agent Skills).",
    phaseAr: "هندسة السياق",
    complexity: "high",
  },
  {
    key: "specPlan",
    fileName: "04-SPEC-PLAN.md",
    titleAr: "خطة التنفيذ الموجهة بالمواصفات",
    titleEn: "Spec-Driven Plan",
    descriptionAr:
      "تجزئة العمل إلى مهام بحجم الوكيل، مع معايير نجاح لكل مهمة — وفق نموذج المصنع ووضع المنسّق.",
    phaseAr: "التنفيذ",
    complexity: "high",
  },
  {
    key: "testingEvals",
    fileName: "05-TESTS-AND-EVALS.md",
    titleAr: "استراتيجية الاختبارات والتقييمات",
    titleEn: "Tests & Evals Strategy",
    descriptionAr:
      "هرم الاختبارات، مجموعات التقييم (Evals) بمعايير تسجيل واضحة، وبوابات الجودة في CI.",
    phaseAr: "الاختبار وضمان الجودة",
    complexity: "standard",
  },
  {
    key: "guardrails",
    fileName: "06-GUARDRAILS-AND-SECURITY.md",
    titleAr: "الحواجز والأمان",
    titleEn: "Guardrails & Security",
    descriptionAr:
      "الـ Hooks الحتمية، العزل (Sandboxing)، الثقة الصفرية، إدارة الأسرار، ونموذج التهديدات.",
    phaseAr: "الحواجز عبر الدورة",
    complexity: "standard",
  },
  {
    key: "devopsObservability",
    fileName: "07-DEPLOYMENT-AND-OBSERVABILITY.md",
    titleAr: "النشر والمراقبة",
    titleEn: "Deployment & Observability",
    descriptionAr:
      "خطوط النشر، المراقبة، قياس تكلفة الرموز (Tokens)، وحلقات التغذية الراجعة من الإنتاج.",
    phaseAr: "المراجعة والنشر",
    complexity: "standard",
  },
  {
    key: "roadmap",
    fileName: "08-ROADMAP-AND-MAINTENANCE.md",
    titleAr: "خارطة الطريق والصيانة",
    titleEn: "Roadmap & Maintenance",
    descriptionAr:
      "إدارة الدَّين التقني، التطوير المستمر، وتوزيع الأدوار بين الموجّه والمنسّق.",
    phaseAr: "الصيانة والتطور",
    complexity: "standard",
  },
];

export const DOC_KEYS = DOC_DEFINITIONS.map((d) => d.key) as DocKey[];

// ---------------------------------------------------------------------------
// مدخلات المعالج (فكرة المستخدم)
// ---------------------------------------------------------------------------

export type AppType =
  | "web"
  | "mobile"
  | "api"
  | "desktop"
  | "cli"
  | "aiAgent"
  | "other";

export type ApplicationMode = "mvp" | "existingApp" | "enterpriseApp" | "newBuild" | "featureExpansion" | "migration";

export type PreferredCodeAgent = "codex" | "claudeCode" | "cursor" | "roo" | "cline" | "githubCopilot" | "windsurf" | "generic" | "other" | "none";

export type Scale = "mvp" | "growth" | "enterprise";

export type FeatureKey =
  | "auth"
  | "payments"
  | "realtime"
  | "aiIntegration"
  | "i18n"
  | "offline"
  | "adminPanel"
  | "analytics"
  | "notifications"
  | "fileStorage"
  | "search"
  | "multiTenant";

export type DocLanguage = "ar" | "en";

export interface ProfessionalContext {
  /** سياق التطبيق القائم: المكدس، البنية، نقاط الألم، أو خريطة المستودع */
  existingAppContext?: string;
  /** قيود التنفيذ غير القابلة للتفاوض */
  deliveryConstraints?: string;
  /** أولويات غير وظيفية مثل الأداء، الاعتمادية، الوصول، القابلية للتوسع */
  nonFunctionalPriorities?: string;
  /** تكاملات خارجية أو داخلية مطلوبة */
  integrations?: string;
  /** بيئة أو هدف النشر المتوقع */
  deploymentTarget?: string;
  /** ملف الجودة المطلوب: سرعة MVP، إنتاج متوازن، أو مؤسسي صارم */
  qualityProfile?: string;
  /** مقاييس النجاح التي تثبت أن المنتج/التحديث نجح */
  successMetrics?: string;
  /** حساسية البيانات ومتطلبات الأمان والامتثال */
  securityCompliance?: string;
}

export interface ProjectConfig {
  appType: AppType;
  audience: string;
  scale: Scale;
  platforms: string[];
  features: FeatureKey[];
  constraints: string;
  docLanguage: DocLanguage;
  /** مكدس مفضل اختياري من المستخدم (نص حر) */
  preferredStack: string;
  /** وكيل البرمجة المفضل لإرشادات AGENTS.md وسير العمل */
  preferredCodeAgent?: PreferredCodeAgent;
  /** نمط التطبيق المطلوب حتى تميّز الوثائق بين MVP أو تحديث تطبيق قائم أو تطبيق مؤسسي كامل */
  applicationMode?: ApplicationMode;
  /** سياق احترافي إضافي يرفع جودة المواصفات والحواجز وخطة التنفيذ */
  professionalContext?: ProfessionalContext;
}

export const APP_TYPE_LABELS: Record<AppType, { ar: string; en: string }> = {
  web: { ar: "تطبيق ويب", en: "Web App" },
  mobile: { ar: "تطبيق جوال", en: "Mobile App" },
  api: { ar: "خدمة API / باك إند", en: "API / Backend" },
  desktop: { ar: "تطبيق سطح مكتب", en: "Desktop App" },
  cli: { ar: "أداة سطر أوامر", en: "CLI Tool" },
  aiAgent: { ar: "وكيل ذكاء اصطناعي", en: "AI Agent" },
  other: { ar: "أخرى", en: "Other" },
};

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  auth: "مصادقة وحسابات",
  payments: "مدفوعات",
  realtime: "تحديثات لحظية",
  aiIntegration: "تكامل ذكاء اصطناعي",
  i18n: "تعدد لغات",
  offline: "عمل دون اتصال",
  adminPanel: "لوحة تحكم",
  analytics: "تحليلات",
  notifications: "إشعارات",
  fileStorage: "تخزين ملفات",
  search: "بحث",
  multiTenant: "تعدد مستأجرين",
};

export const SCALE_LABELS: Record<Scale, string> = {
  mvp: "منتج أولي (MVP)",
  growth: "نمو وفريق صغير",
  enterprise: "مؤسسي واسع النطاق",
};

export const APPLICATION_MODE_LABELS: Record<ApplicationMode, { ar: string; en: string }> = {
  mvp: { ar: "منتج أولي MVP", en: "MVP" },
  existingApp: { ar: "تحديث تطبيق قائم", en: "Update existing app" },
  enterpriseApp: { ar: "تطبيق احترافي مؤسسي كامل", en: "Full professional enterprise app" },
  newBuild: { ar: "بناء جديد", en: "New build" },
  featureExpansion: { ar: "توسيع ميزات", en: "Feature expansion" },
  migration: { ar: "ترحيل/تحديث", en: "Migration / modernization" },
};

export const CODE_AGENT_LABELS: Record<PreferredCodeAgent, string> = {
  codex: "Codex",
  claudeCode: "Claude Code",
  cursor: "Cursor",
  roo: "Roo",
  cline: "Cline",
  githubCopilot: "GitHub Copilot",
  windsurf: "Windsurf",
  generic: "Generic agent",
  other: "Other",
  none: "No preference",
};

// ---------------------------------------------------------------------------
// حالات التوليد والكيانات
// ---------------------------------------------------------------------------

export type ProjectStatus = "draft" | "generating" | "ready" | "failed";
export type DocSource = "ai" | "template" | "ai-fallback";

export interface ProjectSummary {
  id: string;
  name: string;
  idea: string;
  status: ProjectStatus;
  docLanguage: DocLanguage;
  docsCount: number;
  totalDocs: number;
  createdAt: Date;
  updatedAt: Date;
}

export type PackageChangeType = "initial_generation" | "full_regeneration" | "config_update" | "single_doc_regeneration";
export type PackageVersionStatus = "queued" | "generating" | "updating" | "ready" | "failed";

export interface PackageVersion {
  id: string;
  projectId: string;
  versionNumber: number;
  label: string;
  status: PackageVersionStatus;
  changeType: PackageChangeType;
  changeSummary: string | null;
  createdFromVersionNumber: number | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface GeneratedDoc {
  id: string;
  projectId: string;
  key: DocKey;
  title: string;
  fileName: string;
  content: string;
  source: DocSource;
  model: string | null;
  packageVersionId: string | null;
  packageVersionNumber: number;
  createdAt: Date;
}

export interface RunMetric {
  id: string;
  projectId: string;
  docKey: string | null;
  kind: string;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  durationMs: number | null;
  status: string;
  detail: string | null;
  createdAt: Date;
}

export interface ProjectDetail extends ProjectSummary {
  config: ProjectConfig;
  docs: GeneratedDoc[];
  metrics: RunMetric[];
  currentVersion: PackageVersion | null;
  versions: PackageVersion[];
}

export interface AiSettingsView {
  configured: boolean;
  baseUrl: string;
  model: string;
  smallModel: string;
  apiKeyMasked: string | null;
}

// ---------------------------------------------------------------------------
// مزوّدات الذكاء الاصطناعي المسمّاة والمحفوظة
// ---------------------------------------------------------------------------

/** تعريف مزوّد ثابت (للعرض في الواجهة) */
export interface AiProviderOption {
  id: string;
  label: string;
  baseUrl: string;
  requiresBaseUrl: boolean;
  model: string;
  smallModel: string;
  helpText: string;
}

/** مزوّد محفوظ باسم — يُرجع من الـ API (المفتاح مُقنّع) */
export interface SavedProvider {
  id: string;
  name: string;
  provider: string;
  baseUrl: string;
  model: string;
  smallModel: string;
  apiKeyMasked: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** مدخلات إنشاء/تحديث مزوّد محفوظ */
export interface SavedProviderInput {
  name: string;
  provider: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
  smallModel?: string;
}

/** عرض إعدادات الذكاء الاصطناعي الكامل (مزوّد نشط + قائمة المحفوظين) */
export interface AiSettingsFullView {
  configured: boolean;
  provider: string;
  providerLabel: string;
  baseUrl: string;
  model: string;
  smallModel: string;
  apiKeyMasked: string | null;
  activeProviderId: string | null;
  source: "saved" | "env" | "default";
  providers: AiProviderOption[];
  savedProviders: SavedProvider[];
}
