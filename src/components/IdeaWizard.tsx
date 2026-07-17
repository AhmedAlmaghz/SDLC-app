import { useState } from "react";
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
  { id: 1, title: "الفكرة", icon: Lightbulb },
  { id: 2, title: "النطاق", icon: Rocket },
  { id: 3, title: "القدرات", icon: Settings2 },
];

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

  const togglePlatform = (p: string) =>
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  const toggleFeature = (f: FeatureKey) =>
    setFeatures((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  const canNext1 = name.trim().length >= 2 && idea.trim().length >= 20;

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
    <div className="rounded-2xl border border-border bg-card shadow-2xl shadow-black/30">
      {/* مؤشر الخطوات */}
      <div className="flex items-center gap-2 border-b border-border px-6 py-4">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => s.id < step && setStep(s.id)}
              className={cn(
                "flex items-center gap-2 text-sm font-medium transition-colors",
                step === s.id
                  ? "text-primary"
                  : step > s.id
                    ? "text-foreground"
                    : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold",
                  step === s.id
                    ? "border-primary bg-primary/15 text-primary"
                    : step > s.id
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border",
                )}
              >
                {step > s.id ? <Check className="h-3.5 w-3.5" /> : s.id}
              </span>
              <span className="hidden sm:inline">{s.title}</span>
            </button>
            {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
          </div>
        ))}
      </div>

      <div className="p-6">
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold">اسم المشروع</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: منصّة سوق، مساعد دراسي، نظام حجوزات…"
                className="h-12 bg-secondary/50 text-base"
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-semibold">صف فكرتك بحرية</label>
                <span
                  className={cn(
                    "text-xs",
                    idea.trim().length >= 20 ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {idea.trim().length} / 20 حرفاً على الأقل
                </span>
              </div>
              <Textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                rows={7}
                placeholder="ماذا يفعل التطبيق؟ لمن؟ ما المشكلة التي يحلها؟ اكتب كل ما يدور في ذهنك — كلما زادت التفاصيل، كانت حزمة التوثيق أدق وأعمق…"
                className="resize-none bg-secondary/50 text-base leading-7"
              />
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                سيحوّل مِرْوَر هذه الفكرة إلى 9 وثائق هندسية وفق إطار SDLC الجديد: متطلبات، معمارية،
                AGENTS.md، هندسة سياق، خطة تنفيذ، اختبارات وتقييمات، حواجز وأمان، نشر ومراقبة،
                وخارطة طريق.
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="mb-3 block text-sm font-semibold">نوع التطبيق</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(Object.keys(APP_TYPE_LABELS) as AppType[]).map((key) => {
                  const Icon = APP_TYPE_ICONS[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAppType(key)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-all",
                        appType === key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {APP_TYPE_LABELS[key].ar}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-3 block text-sm font-semibold">النطاق المستهدف</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(SCALE_LABELS) as Scale[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setScale(key)}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-sm font-medium transition-all",
                      scale === key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    {SCALE_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">الجمهور المستهدف</label>
              <Input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="مثال: أصحاب المتاجر الصغيرة، طلاب الجامعات…"
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
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <label className="mb-3 block text-sm font-semibold">القدرات الأساسية</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(Object.keys(FEATURE_LABELS) as FeatureKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleFeature(key)}
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
                        features.includes(key) ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                      )}
                    >
                      {features.includes(key) && <Check className="h-3 w-3" />}
                    </span>
                    {FEATURE_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                قيود أو ملاحظات <span className="font-normal text-muted-foreground">(اختياري)</span>
              </label>
              <Textarea
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                rows={2}
                placeholder="مثال: ميزانية محدودة، يجب العمل دون اتصال، التزام بمعايير معينة…"
                className="resize-none bg-secondary/50"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                مكدس تقني مفضل <span className="font-normal text-muted-foreground">(اختياري)</span>
              </label>
              <Input
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
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border px-6 py-4">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="gap-2"
        >
          <ArrowRight className="h-4 w-4" />
          السابق
        </Button>

        {step < 3 ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={step === 1 && !canNext1}
            className="gap-2"
          >
            التالي
            <ArrowLeft className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={submit}
            disabled={createMutation.isPending || !canNext1}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            ولّد حزمة التوثيق
          </Button>
        )}
      </div>
    </div>
  );
}
