import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Building2,
  Check,
  Globe,
  Layers,
  Lightbulb,
  Loader2,
  Monitor,
  Rocket,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  SquareTerminal,
  Target,
  WandSparkles,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";
import {
  APP_TYPE_LABELS,
  APPLICATION_MODE_LABELS,
  CODE_AGENT_LABELS,
  FEATURE_LABELS,
  SCALE_LABELS,
  type AppType,
  type ApplicationMode,
  type FeatureKey,
  type PreferredCodeAgent,
  type ProjectConfig,
  type ProfessionalContext,
  type Scale,
} from "@contracts/types";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const APP_TYPE_ICONS: Record<AppType, typeof Globe> = {
  web: Globe,
  mobile: Smartphone,
  api: Webhook,
  desktop: Monitor,
  cli: SquareTerminal,
  aiAgent: Bot,
  other: Settings2,
};

const PLATFORMS = ["الويب", "iOS", "Android", "Windows", "macOS", "Linux"];

const STEPS = [
  { id: 1, title: "الفكرة", icon: Lightbulb, hint: "النية والمشكلة" },
  { id: 2, title: "النطاق", icon: Rocket, hint: "السوق والمنصة" },
  { id: 3, title: "القدرات", icon: Settings2, hint: "الميزات والحواجز" },
  { id: 4, title: "هندسة الوكيل", icon: Layers, hint: "وكيل البرمجة ونمط التطبيق" },
];

const IDEA_PROMPTS = [
  "من المستخدم الأساسي وما الألم الذي يعيشه اليوم؟",
  "ما النتيجة التي يجب أن يراها المستخدم خلال أول 5 دقائق؟",
  "ما الميزة التي تجعل المنتج مختلفاً عن البدائل؟",
  "ما القيود غير القابلة للتفاوض: ميزانية، أمان، زمن، امتثال؟",
];

const FEATURE_PRESETS: Record<"commerce" | "saas" | "ai", { label: string; features: FeatureKey[] }> = {
  commerce: {
    label: "تجارة/حجوزات",
    features: ["auth", "payments", "notifications", "analytics", "adminPanel"],
  },
  saas: {
    label: "SaaS متعدد الفرق",
    features: ["auth", "multiTenant", "analytics", "search", "fileStorage"],
  },
  ai: {
    label: "منتج ذكاء اصطناعي",
    features: ["auth", "aiIntegration", "fileStorage", "analytics", "adminPanel"],
  },
};

// خيارات وكيل البرمجة المفضل — تُرسل إلى AGENTS.md وسير العمل
const CODE_AGENT_OPTIONS: { value: PreferredCodeAgent; hint: string }[] = [
  { value: "codex", hint: "OpenAI Codex — CLI/سير أوامر" },
  { value: "claudeCode", hint: "Claude Code — وكيل طرفي من Anthropic" },
  { value: "cursor", hint: "Cursor — محرر بوكيل مدمج" },
  { value: "roo", hint: "Roo (Cline/Roo) — امتداد VS Code" },
  { value: "cline", hint: "Cline — امتداد وكيل برمجة" },
  { value: "githubCopilot", hint: "GitHub Copilot — إكمال ووكيل" },
  { value: "windsurf", hint: "Windsurf — محرر وكيلي" },
  { value: "generic", hint: "وكيل عام — تعليمات محايدة عن الأداة" },
  { value: "none", hint: "لا تفضيل — يقترح مِرْوَر الأنسب" },
];

// خيارات نمط التطبيق — تحدد عمق الوثائق وتركيز خطة التنفيذ
const APPLICATION_MODE_OPTIONS: {
  value: ApplicationMode;
  icon: typeof Rocket;
  hint: string;
}[] = [
    { value: "mvp", icon: Rocket, hint: "أصغر نسخة قابلة للاختبار — سرعة الإطلاق أولاً" },
    { value: "existingApp", icon: Building2, hint: "تحديث/توسيع تطبيق قائم — احترام البنية الحالية" },
    { value: "enterpriseApp", icon: ShieldCheck, hint: "تطبيق احترافي مؤسسي كامل — جودة وأمان وامتثال" },
  ];

// ملفات الجودة المعروضة كاقتراحات سريعة
const QUALITY_PROFILES = ["سرعة MVP", "إنتاج متوازن", "مؤسسي صارم"];

const emptyProfessionalContext: ProfessionalContext = {};

type IdeaWizardInitialValues = {
  id?: string;
  name: string;
  idea: string;
  config: ProjectConfig;
};

export default function IdeaWizard({
  initialValues,
  onSaved,
}: {
  initialValues?: IdeaWizardInitialValues;
  onSaved?: () => void;
}) {
  const navigate = useNavigate();
  const editMode = Boolean(initialValues?.id);
  const initialConfig = initialValues?.config;
  const [step, setStep] = useState(1);
  const [name, setName] = useState(initialValues?.name ?? "");
  const [idea, setIdea] = useState(initialValues?.idea ?? "");
  const [appType, setAppType] = useState<AppType>(initialConfig?.appType ?? "web");
  const [scale, setScale] = useState<Scale>(initialConfig?.scale ?? "mvp");
  const [audience, setAudience] = useState(initialConfig?.audience ?? "");
  const [platforms, setPlatforms] = useState<string[]>(initialConfig?.platforms?.length ? initialConfig.platforms : ["الويب"]);
  const [features, setFeatures] = useState<FeatureKey[]>(initialConfig?.features?.length ? initialConfig.features : ["auth"]);
  const [constraints, setConstraints] = useState(initialConfig?.constraints ?? "");
  const [preferredStack, setPreferredStack] = useState(initialConfig?.preferredStack ?? "");
  const [docLanguage, setDocLanguage] = useState<"ar" | "en">(initialConfig?.docLanguage ?? "ar");

  // حقول الخطوة الرابعة: هندسة الوكيل
  const [preferredCodeAgent, setPreferredCodeAgent] = useState<PreferredCodeAgent>(initialConfig?.preferredCodeAgent ?? "none");
  const [applicationMode, setApplicationMode] = useState<ApplicationMode>(initialConfig?.applicationMode ?? "mvp");
  const [professionalContext, setProfessionalContext] = useState<ProfessionalContext>(initialConfig?.professionalContext ?? emptyProfessionalContext);

  const createMutation = trpc.projects.create.useMutation({
    onSuccess: (data) => {
      toast.success("بدأ التوليد — يتم بناء حزمة التوثيق الآن");
      navigate(`/projects/${data.id}`);
    },
    onError: (err) => toast.error(err.message || "فشل إنشاء المشروع"),
  });
  const updateMutation = trpc.projects.regenerate.useMutation({
    onSuccess: () => {
      toast.success("حُفظت التعديلات وبدأ إنشاء إصدار جديد");
      onSaved?.();
    },
    onError: (err) => toast.error(err.message || "فشل حفظ التعديلات"),
  });

  const trimmedIdeaLength = idea.trim().length;
  const canNext1 = name.trim().length >= 2 && trimmedIdeaLength >= 20;

  // نمط التطبيق يحدد أي الحقول الاحترافية ذات صلة
  const isExistingApp = applicationMode === "existingApp";
  const isEnterprise = applicationMode === "enterpriseApp";
  const showProfessionalFields = isExistingApp || isEnterprise;

  const setCtx = (patch: Partial<ProfessionalContext>) =>
    setProfessionalContext((prev) => ({ ...prev, ...patch }));

  // عدد الحقول الاحترافية المعبّأة (للنقاط والمراجعة)
  const filledProfessionalCount = useMemo(() => {
    const c = professionalContext;
    return [
      c.existingAppContext,
      c.deliveryConstraints,
      c.nonFunctionalPriorities,
      c.integrations,
      c.deploymentTarget,
      c.qualityProfile,
      c.successMetrics,
      c.securityCompliance,
    ].filter((v) => Boolean(v && v.trim())).length;
  }, [professionalContext]);

  const completion = useMemo(() => {
    const checks = [
      name.trim().length >= 2,
      trimmedIdeaLength >= 20,
      Boolean(audience.trim()),
      platforms.length > 0,
      features.length >= 2,
      Boolean(preferredStack.trim()) || Boolean(constraints.trim()),
      // اختيار وكيل برمجة (غير "none" يُحتسب كقوة سياق)
      preferredCodeAgent !== "none",
      // نمط التطبيق تم تحديده (دائماً له افتراضي، لكن نؤكد التزام المستخدم)
      Boolean(applicationMode),
      // سياق احترافي عند تفعيله
      showProfessionalFields ? filledProfessionalCount >= 2 : true,
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [
    audience,
    applicationMode,
    constraints,
    features.length,
    filledProfessionalCount,
    name,
    platforms.length,
    preferredCodeAgent,
    preferredStack,
    showProfessionalFields,
    trimmedIdeaLength,
  ]);

  const togglePlatform = (p: string) =>
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  const toggleFeature = (f: FeatureKey) =>
    setFeatures((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  const appendIdeaPrompt = (prompt: string) => {
    setIdea((current) => {
      const prefix = current.trim() ? `${current.trim()}\n` : "";
      return `${prefix}- ${prompt} `;
    });
  };

  const submit = () => {
    const config: ProjectConfig = {
      appType,
      audience: audience.trim(),
      scale,
      platforms,
      features,
      constraints: constraints.trim(),
      docLanguage,
      preferredStack: preferredStack.trim(),
      preferredCodeAgent,
      applicationMode,
      professionalContext: showProfessionalFields
        ? Object.fromEntries(Object.entries(professionalContext).filter(([, v]) => Boolean(v && v.trim())))
        : undefined,
    };
    if (editMode && initialValues?.id) {
      updateMutation.mutate({
        id: initialValues.id,
        name: name.trim(),
        idea: idea.trim(),
        config,
        changeSummary: "Project inputs/config updated from Edit wizard",
      });
    } else {
      createMutation.mutate({ name: name.trim(), idea: idea.trim(), config });
    }
  };

  // ملخص المراجعة قبل التوليد
  const reviewSummary = useMemo(() => {
    const items: { label: string; value: string }[] = [
      { label: "النوع", value: APP_TYPE_LABELS[appType].ar },
      { label: "النطاق", value: SCALE_LABELS[scale] },
      { label: "نمط التطبيق", value: APPLICATION_MODE_LABELS[applicationMode].ar },
      { label: "وكيل البرمجة", value: CODE_AGENT_LABELS[preferredCodeAgent] },
      { label: "القدرات", value: features.length ? `${features.length} ميزة` : "—" },
    ];
    if (showProfessionalFields) {
      items.push({ label: "السياق الاحترافي", value: `${filledProfessionalCount} حقل` });
    }
    return items;
  }, [appType, scale, applicationMode, preferredCodeAgent, features.length, showProfessionalFields, filledProfessionalCount]);

  return (
    <div className="premium-card relative overflow-hidden rounded-3xl">
      <div className="ambient-orb -right-20 top-16 h-56 w-56" />
      <div className="ambient-orb -left-24 bottom-10 h-52 w-52 bg-sky-400/10" />

      <div className="relative border-b border-white/10 px-5 py-4 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-primary">{editMode ? "تحديث إعدادات المشروع" : "استوديو تحويل الفكرة إلى مواصفة"}</p>
            <h2 className="mt-1 text-lg font-bold">{editMode ? "عدّل المدخلات ثم أنشئ إصداراً جديداً محفوظ التاريخ" : "معالج ذكي يلتقط التفاصيل التي يحتاجها وكيل البرمجة"}</h2>
          </div>
          <div className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            اكتمال السياق {completion}%
          </div>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-gradient-to-l from-primary to-sky-400 transition-all" style={{ width: `${completion}%` }} />
        </div>
      </div>

      <div className="relative grid border-b border-white/10 sm:grid-cols-4">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const active = step === s.id;
          const completed = step > s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => (s.id < step || canNext1) && setStep(s.id)}
              disabled={s.id > 1 && !canNext1}
              className={cn(
                "flex items-center gap-3 px-5 py-4 text-start transition-all disabled:cursor-not-allowed disabled:opacity-50 sm:px-6",
                active ? "bg-primary/10" : "hover:bg-white/[0.03]",
              )}
              aria-current={active ? "step" : undefined}
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-all",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : completed
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-secondary/50 text-muted-foreground",
                )}
              >
                {completed ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </span>
              <span>
                <span className={cn("block text-sm font-bold", active && "text-primary")}>{s.title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{s.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative p-5 sm:p-6">
        {step === 1 && (
          <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold" htmlFor="project-name">
                  اسم المشروع
                </label>
                <Input
                  id="project-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: منصّة سوق، مساعد دراسي، نظام حجوزات..."
                  className="h-12 bg-secondary/50 text-base"
                  autoComplete="off"
                />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="text-sm font-semibold" htmlFor="project-idea">
                    صف فكرتك بحرية
                  </label>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs",
                      trimmedIdeaLength >= 20
                        ? "bg-primary/10 text-primary"
                        : "bg-amber-500/10 text-amber-300",
                    )}
                  >
                    {trimmedIdeaLength} / 20 حرفاً
                  </span>
                </div>
                <Textarea
                  id="project-idea"
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  rows={8}
                  placeholder="ماذا يفعل التطبيق؟ لمن؟ ما المشكلة التي يحلها؟ ما التجربة المثالية؟ كل تفصيلة هنا تتحول لاحقاً إلى متطلبات واختبارات وحواجز أوضح."
                  className="resize-none bg-secondary/50 text-base leading-7"
                />
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  كلما كان الوصف أوضح، أصبحت وثائق PRD والمعمارية وAGENTS.md أقرب إلى نية المنتج الحقيقية.
                </p>
              </div>
            </div>

            <aside className="rounded-2xl border border-border bg-background/45 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold">
                <WandSparkles className="h-4 w-4 text-primary" />
                محفزات ذكية
              </div>
              <div className="space-y-2">
                {IDEA_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => appendIdeaPrompt(prompt)}
                    className="w-full rounded-xl border border-border bg-secondary/30 px-3 py-2 text-start text-xs leading-5 text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </aside>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="mb-3 block text-sm font-semibold">نوع التطبيق</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {(Object.keys(APP_TYPE_LABELS) as AppType[]).map((key) => {
                  const Icon = APP_TYPE_ICONS[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAppType(key)}
                      aria-pressed={appType === key}
                      className={cn(
                        "group flex min-h-20 flex-col items-start justify-between rounded-2xl border px-3 py-3 text-sm font-medium transition-all",
                        appType === key
                          ? "border-primary bg-primary/10 text-primary shadow-lg shadow-primary/5"
                          : "border-border bg-secondary/35 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      )}
                    >
                      <Icon className="h-5 w-5 transition-transform group-hover:scale-110" />
                      {APP_TYPE_LABELS[key].ar}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <label className="mb-3 block text-sm font-semibold">النطاق المستهدف</label>
                <div className="grid gap-2">
                  {(Object.keys(SCALE_LABELS) as Scale[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setScale(key)}
                      aria-pressed={scale === key}
                      className={cn(
                        "rounded-2xl border px-4 py-3 text-start text-sm font-medium transition-all",
                        scale === key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-secondary/35 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      )}
                    >
                      {SCALE_LABELS[key]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold" htmlFor="project-audience">
                    الجمهور المستهدف
                  </label>
                  <Input
                    id="project-audience"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder="مثال: أصحاب المتاجر الصغيرة، طلاب الجامعات..."
                    className="bg-secondary/50"
                  />
                </div>

                <div>
                  <label className="mb-3 block text-sm font-semibold">المنصات</label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePlatform(p)}
                        aria-pressed={platforms.includes(p)}
                        className={cn(
                          "rounded-full border px-4 py-1.5 text-sm transition-all",
                          platforms.includes(p)
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-semibold">القدرات الأساسية</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(FEATURE_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFeatures(preset.features)}
                      className="rounded-full border border-border bg-secondary/30 px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(Object.keys(FEATURE_LABELS) as FeatureKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleFeature(key)}
                    aria-pressed={features.includes(key)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-all",
                      features.includes(key)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded border",
                        features.includes(key)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/40",
                      )}
                    >
                      {features.includes(key) && <Check className="h-3 w-3" />}
                    </span>
                    {FEATURE_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold" htmlFor="project-constraints">
                  قيود أو ملاحظات <span className="font-normal text-muted-foreground">(اختياري)</span>
                </label>
                <Textarea
                  id="project-constraints"
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  rows={4}
                  placeholder="مثال: ميزانية محدودة، يجب العمل دون اتصال، التزام بمعايير معينة..."
                  className="resize-none bg-secondary/50"
                />
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold" htmlFor="preferred-stack">
                    مكدس تقني مفضل <span className="font-normal text-muted-foreground">(اختياري)</span>
                  </label>
                  <Input
                    id="preferred-stack"
                    value={preferredStack}
                    onChange={(e) => setPreferredStack(e.target.value)}
                    placeholder="مثال: Next.js + Supabase — اتركه فارغاً ليقترح مِرْوَر الأنسب"
                    className="bg-secondary/50"
                  />
                </div>

                <div>
                  <label className="mb-3 block text-sm font-semibold">لغة الوثائق</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { v: "ar", label: "العربية" },
                        { v: "en", label: "English" },
                      ] as const
                    ).map(({ v, label }) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setDocLanguage(v)}
                        aria-pressed={docLanguage === v}
                        className={cn(
                          "rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                          docLanguage === v
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            {/* وكيل البرمجة المفضل */}
            <div>
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
                <Bot className="h-4 w-4 text-primary" />
                وكيل البرمجة المفضل
              </div>
              <p className="mb-3 text-xs leading-5 text-muted-foreground">
                يُوجَّه AGENTS.md وسير العمل ليناسب الأداة التي ستستخدمها فعلاً. اختر «لا تفضيل» ليقترح مِرْوَر الأنسب.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {CODE_AGENT_OPTIONS.map(({ value, hint }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPreferredCodeAgent(value)}
                    aria-pressed={preferredCodeAgent === value}
                    title={hint}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-2xl border px-3 py-2.5 text-start transition-all",
                      preferredCodeAgent === value
                        ? "border-primary bg-primary/10 text-primary shadow-lg shadow-primary/5"
                        : "border-border bg-secondary/35 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    <span className="text-sm font-semibold">{CODE_AGENT_LABELS[value]}</span>
                    <span className="text-[11px] leading-4 text-muted-foreground">{hint}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* نمط التطبيق */}
            <div>
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
                <Target className="h-4 w-4 text-primary" />
                نمط التطبيق
              </div>
              <p className="mb-3 text-xs leading-5 text-muted-foreground">
                يحدد عمق الوثائق وتركيز خطة التنفيذ: MVP للسرعة، تحديث تطبيق قائم لاحترام البنية، أو تطبيق مؤسسي كامل للجودة والامتثال.
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {APPLICATION_MODE_OPTIONS.map(({ value, icon: Icon, hint }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setApplicationMode(value)}
                    aria-pressed={applicationMode === value}
                    className={cn(
                      "group flex min-h-24 flex-col items-start justify-between gap-2 rounded-2xl border px-4 py-3 text-start transition-all",
                      applicationMode === value
                        ? "border-primary bg-primary/10 text-primary shadow-lg shadow-primary/5"
                        : "border-border bg-secondary/35 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    <Icon className="h-5 w-5 transition-transform group-hover:scale-110" />
                    <span>
                      <span className="block text-sm font-semibold">{APPLICATION_MODE_LABELS[value].ar}</span>
                      <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">{hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* الحقول الاحترافية الشرطية */}
            {showProfessionalFields && (
              <div className="rounded-2xl border border-border bg-background/45 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <Layers className="h-4 w-4 text-primary" />
                    سياق احترافي يرفع جودة المواصفات
                  </div>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    {filledProfessionalCount} / 8
                  </span>
                </div>
                <p className="mb-4 text-xs leading-5 text-muted-foreground">
                  {isExistingApp
                    ? "صف التطبيق القائم وقيوده حتى تحترم الوثائق بنيته وتقترح تغييرات متوافقة."
                    : "للتطبيق المؤسسي: حدد الأولويات غير الوظيفية، التكاملات، النشر، الجودة، ومقاييس النجاح لينتج مواصفات صارمة."}
                </p>

                <div className="grid gap-4 lg:grid-cols-2">
                  {isExistingApp && (
                    <div className="lg:col-span-2">
                      <label className="mb-2 block text-sm font-semibold" htmlFor="ctx-existing">
                        سياق التطبيق القائم / بنية المستودع
                      </label>
                      <Textarea
                        id="ctx-existing"
                        value={professionalContext.existingAppContext ?? ""}
                        onChange={(e) => setCtx({ existingAppContext: e.target.value })}
                        rows={3}
                        placeholder="المكدس الحالي، بنية الأدلة، نقاط الألم، ما يجب ألا يُكسَر..."
                        className="resize-none bg-secondary/50"
                      />
                    </div>
                  )}

                  <div>
                    <label className="mb-2 block text-sm font-semibold" htmlFor="ctx-constraints">
                      قيود التسليم
                    </label>
                    <Textarea
                      id="ctx-constraints"
                      value={professionalContext.deliveryConstraints ?? ""}
                      onChange={(e) => setCtx({ deliveryConstraints: e.target.value })}
                      rows={2}
                      placeholder="موعد نهائي، ميزانية، فريق محدود، عدم تغيير الـ API العام..."
                      className="resize-none bg-secondary/50"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold" htmlFor="ctx-nfr">
                      أولويات غير وظيفية
                    </label>
                    <Textarea
                      id="ctx-nfr"
                      value={professionalContext.nonFunctionalPriorities ?? ""}
                      onChange={(e) => setCtx({ nonFunctionalPriorities: e.target.value })}
                      rows={2}
                      placeholder="الأداء، الاعتمادية، الوصول WCAG، القابلية للتوسع..."
                      className="resize-none bg-secondary/50"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold" htmlFor="ctx-integrations">
                      التكاملات
                    </label>
                    <Textarea
                      id="ctx-integrations"
                      value={professionalContext.integrations ?? ""}
                      onChange={(e) => setCtx({ integrations: e.target.value })}
                      rows={2}
                      placeholder="بوابات دفع، مزود بريد، SSO، APIs خارجية..."
                      className="resize-none bg-secondary/50"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold" htmlFor="ctx-deploy">
                      هدف النشر
                    </label>
                    <Input
                      id="ctx-deploy"
                      value={professionalContext.deploymentTarget ?? ""}
                      onChange={(e) => setCtx({ deploymentTarget: e.target.value })}
                      placeholder="Vercel / AWS / on-prem / k8s..."
                      className="bg-secondary/50"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold" htmlFor="ctx-quality">
                      ملف الجودة
                    </label>
                    <Input
                      id="ctx-quality"
                      value={professionalContext.qualityProfile ?? ""}
                      onChange={(e) => setCtx({ qualityProfile: e.target.value })}
                      placeholder="سرعة MVP / إنتاج متوازن / مؤسسي صارم"
                      className="bg-secondary/50"
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {QUALITY_PROFILES.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setCtx({ qualityProfile: q })}
                          className="rounded-full border border-border bg-secondary/30 px-2.5 py-1 text-[11px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold" htmlFor="ctx-metrics">
                      مقاييس النجاح
                    </label>
                    <Textarea
                      id="ctx-metrics"
                      value={professionalContext.successMetrics ?? ""}
                      onChange={(e) => setCtx({ successMetrics: e.target.value })}
                      rows={2}
                      placeholder="معدل تفعيل، احتفاظ أسبوعي، زمن رحلة، تكلفة لكل مستخدم..."
                      className="resize-none bg-secondary/50"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="mb-2 block text-sm font-semibold" htmlFor="ctx-security">
                      الأمان والامتثال وحساسية البيانات
                    </label>
                    <Textarea
                      id="ctx-security"
                      value={professionalContext.securityCompliance ?? ""}
                      onChange={(e) => setCtx({ securityCompliance: e.target.value })}
                      rows={2}
                      placeholder="GDPR / HIPA / PCI، بيانات حساسة، تشفير، سجلات تدقيق..."
                      className="resize-none bg-secondary/50"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ملخص المراجعة قبل التوليد */}
            <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold">
                <Sparkles className="h-4 w-4 text-primary" />
                ملخص قبل التوليد
              </div>
              <div className="flex flex-wrap gap-2">
                {reviewSummary.map((item) => (
                  <span
                    key={item.label}
                    className="rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs"
                  >
                    <span className="text-muted-foreground">{item.label}:</span>{" "}
                    <span className="font-medium text-foreground">{item.value}</span>
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                {completion >= 80
                  ? "سياق غني — الوثائق ستكون قريبة من نية المنتج الحقيقية. يمكنك التوليد الآن."
                  : "أضف المزيد من السياق (جمهور، قيود، سياق احترافي) لرفع دقة المواصفات."}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="relative flex items-center justify-between gap-3 border-t border-white/10 px-5 py-4 sm:px-6">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="gap-2"
        >
          <ArrowRight className="h-4 w-4" />
          السابق
        </Button>

        <div className="hidden text-xs text-muted-foreground sm:block">
          {step === 1 && !canNext1
            ? "أضف اسماً ووصفاً أوضح للمتابعة"
            : step === 4
              ? completion >= 80
                ? "جاهز للتوليد — السياق غني"
                : "يمكنك التوليد، لكن سياق أغنى يرفع الجودة"
              : "جاهز للخطوة التالية"}
        </div>

        {step < 4 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={step === 1 && !canNext1} className="gap-2">
            التالي
            <ArrowLeft className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={submit}
            disabled={createMutation.isPending || updateMutation.isPending || !canNext1 || !platforms.length || !features.length}
            className="gap-2 bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
          >
            {createMutation.isPending || updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {editMode ? "حفظ وتوليد إصدار" : "ولّد حزمة التوثيق"}
          </Button>
        )}
      </div>
    </div>
  );
}
