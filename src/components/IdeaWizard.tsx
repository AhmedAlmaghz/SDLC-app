import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  Globe,
  Lightbulb,
  Loader2,
  Monitor,
  Rocket,
  Settings2,
  Smartphone,
  Sparkles,
  SquareTerminal,
  WandSparkles,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";
import {
  APP_TYPE_LABELS,
  FEATURE_LABELS,
  SCALE_LABELS,
  type AppType,
  type FeatureKey,
  type ProjectConfig,
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

export default function IdeaWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [idea, setIdea] = useState("");
  const [appType, setAppType] = useState<AppType>("web");
  const [scale, setScale] = useState<Scale>("mvp");
  const [audience, setAudience] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["الويب"]);
  const [features, setFeatures] = useState<FeatureKey[]>(["auth"]);
  const [constraints, setConstraints] = useState("");
  const [preferredStack, setPreferredStack] = useState("");
  const [docLanguage, setDocLanguage] = useState<"ar" | "en">("ar");

  const createMutation = trpc.projects.create.useMutation({
    onSuccess: (data) => {
      toast.success("بدأ التوليد — يتم بناء حزمة التوثيق الآن");
      navigate(`/projects/${data.id}`);
    },
    onError: (err) => toast.error(err.message || "فشل إنشاء المشروع"),
  });

  const trimmedIdeaLength = idea.trim().length;
  const canNext1 = name.trim().length >= 2 && trimmedIdeaLength >= 20;
  const completion = useMemo(() => {
    const checks = [
      name.trim().length >= 2,
      trimmedIdeaLength >= 20,
      Boolean(audience.trim()),
      platforms.length > 0,
      features.length >= 2,
      Boolean(preferredStack.trim()) || Boolean(constraints.trim()),
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [audience, constraints, features.length, name, platforms.length, preferredStack, trimmedIdeaLength]);

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
    };
    createMutation.mutate({ name: name.trim(), idea: idea.trim(), config });
  };

  return (
    <div className="premium-card relative overflow-hidden rounded-3xl">
      <div className="ambient-orb -right-20 top-16 h-56 w-56" />
      <div className="ambient-orb -left-24 bottom-10 h-52 w-52 bg-sky-400/10" />

      <div className="relative border-b border-white/10 px-5 py-4 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-primary">استوديو تحويل الفكرة إلى مواصفة</p>
            <h2 className="mt-1 text-lg font-bold">معالج ذكي يلتقط التفاصيل التي يحتاجها وكيل البرمجة</h2>
          </div>
          <div className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            اكتمال السياق {completion}%
          </div>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-gradient-to-l from-primary to-sky-400 transition-all" style={{ width: `${completion}%` }} />
        </div>
      </div>

      <div className="relative grid border-b border-white/10 sm:grid-cols-3">
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
          {step === 1 && !canNext1 ? "أضف اسماً ووصفاً أوضح للمتابعة" : "جاهز للخطوة التالية"}
        </div>

        {step < 3 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={step === 1 && !canNext1} className="gap-2">
            التالي
            <ArrowLeft className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={submit}
            disabled={createMutation.isPending || !canNext1 || !platforms.length || !features.length}
            className="gap-2 bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            ولّد حزمة التوثيق
          </Button>
        )}
      </div>
    </div>
  );
}
