import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, CheckCircle2, Edit3, Info, KeyRound, Loader2, Save, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SavedProvider } from "@contracts/types";

type AiProviderId = "openai-compatible" | "anthropic" | "gemini" | "openrouter" | "groq" | "mistral";

export default function Settings() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.settings.getAi.useQuery();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<AiProviderId>("openai-compatible");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [smallModel, setSmallModel] = useState("");
  const [makeActive, setMakeActive] = useState(true);

  const selectedProvider = useMemo(
    () => data?.providers.find((item) => item.id === provider),
    [data?.providers, provider],
  );

  useEffect(() => {
    if (data && !editingId && !name && !model) {
      setProvider(data.provider as AiProviderId);
      setBaseUrl(data.baseUrl);
      setModel(data.model);
      setSmallModel(data.smallModel);
    }
  }, [data, editingId, model, name]);

  function invalidateSettings() {
    void utils.settings.getAi.invalidate();
    void utils.settings.listProviders.invalidate();
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setApiKey("");
    setMakeActive(true);
    if (data) {
      setProvider(data.provider as AiProviderId);
      setBaseUrl(data.baseUrl);
      setModel(data.model);
      setSmallModel(data.smallModel);
    }
  }

  function applyProviderDefaults(nextProvider: AiProviderId) {
    const defaults = data?.providers.find((item) => item.id === nextProvider);
    setProvider(nextProvider);
    if (!defaults) return;
    setBaseUrl(defaults.baseUrl);
    setModel(defaults.model);
    setSmallModel(defaults.smallModel);
  }

  function editProvider(saved: SavedProvider) {
    setEditingId(saved.id);
    setName(saved.name);
    setProvider(saved.provider as AiProviderId);
    setBaseUrl(saved.baseUrl);
    setModel(saved.model);
    setSmallModel(saved.smallModel);
    setApiKey("");
    setMakeActive(saved.isActive);
  }

  const createMutation = trpc.settings.createProvider.useMutation({
    onSuccess: () => {
      toast.success(makeActive ? "حُفظ المزوّد وفُعّل" : "حُفظ المزوّد");
      resetForm();
      invalidateSettings();
    },
    onError: (e) => toast.error(e.message || "تعذّر الحفظ"),
  });

  const updateMutation = trpc.settings.updateProvider.useMutation({
    onSuccess: () => {
      toast.success("حُدّث المزوّد");
      resetForm();
      invalidateSettings();
    },
    onError: (e) => toast.error(e.message || "تعذّر التحديث"),
  });

  const deleteMutation = trpc.settings.deleteProvider.useMutation({
    onSuccess: () => {
      toast.success("حُذف المزوّد");
      invalidateSettings();
    },
    onError: (e) => toast.error(e.message || "تعذّر الحذف"),
  });

  const setActiveMutation = trpc.settings.setActiveProvider.useMutation({
    onSuccess: () => {
      toast.success("أصبح هذا المزوّد هو الافتراضي");
      invalidateSettings();
    },
    onError: (e) => toast.error(e.message || "تعذّر التفعيل"),
  });

  const clearActiveMutation = trpc.settings.clearActiveProvider.useMutation({
    onSuccess: () => {
      toast.success("تم الرجوع لإعدادات البيئة/الافتراضي");
      invalidateSettings();
    },
  });

  const clearMutation = trpc.settings.clearAiKey.useMutation({
    onSuccess: () => {
      toast.success("أُزيل مفتاح الإعداد الافتراضي — المزوّدات المحفوظة لا تتأثر");
      invalidateSettings();
    },
  });

  function submitProvider() {
    const payload = {
      name: name.trim(),
      provider,
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim() || undefined,
      model: model.trim(),
      smallModel: smallModel.trim(),
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate({ ...payload, makeActive });
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const activeSourceLabel = data?.source === "saved" ? "مزوّد محفوظ" : data?.source === "env" ? "متغيرات البيئة" : "الإعداد الافتراضي";

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          احفظ إعدادات مزوّدات الذكاء الاصطناعي بأسماء واضحة واختر المزوّد الافتراضي النشط
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BrainCircuit className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-bold">مزوّد الذكاء الاصطناعي</h2>
              <p className="text-xs text-muted-foreground">النشط الآن: {activeSourceLabel}</p>
            </div>
          </div>
          <Badge
            className={
              data.configured
                ? "w-fit border-0 bg-primary/15 text-primary"
                : "w-fit border-0 bg-amber-500/15 text-amber-400"
            }
          >
            {data.configured ? `مُفعّل: ${data.providerLabel}` : "وضع القوالب"}
          </Badge>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <label className="mb-2 block text-sm font-semibold">اسم الإعداد</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: Gemini للإنتاج أو OpenRouter للتجربة"
              className="bg-secondary/50"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">المزوّد</label>
            <Select value={provider} onValueChange={(value) => applyProviderDefaults(value as AiProviderId)}>
              <SelectTrigger className="w-full bg-secondary/50">
                <SelectValue placeholder="اختر المزوّد" />
              </SelectTrigger>
              <SelectContent>
                {data.providers.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {selectedProvider?.helpText ?? "اختر مزوداً لعرض الإعدادات الافتراضية المناسبة."}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">عنوان نقطة النهاية (Base URL)</label>
            <Input
              dir="ltr"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={selectedProvider?.baseUrl ?? "https://api.example.com/v1"}
              disabled={!selectedProvider?.requiresBaseUrl}
              className="bg-secondary/50 font-mono text-sm disabled:opacity-70"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {selectedProvider?.requiresBaseUrl
                ? "مطلوب للمزوّدات المتوافقة مع OpenAI مثل OpenCode أو Moonshot أو OpenAI."
                : "يُستخدم الافتراضي الرسمي لهذا المزوّد؛ غيّر المزوّد لتحديثه تلقائياً."}
            </p>
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              مفتاح API
            </label>
            <Input
              dir="ltr"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={editingId ? "اتركه فارغاً للاحتفاظ بالمفتاح الحالي" : "sk-..."}
              className="bg-secondary/50 font-mono text-sm"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold">النموذج الرئيسي</label>
              <Input
                dir="ltr"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={selectedProvider?.model ?? "model-name"}
                className="bg-secondary/50 font-mono text-sm"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">النموذج الصغير (اختياري)</label>
              <Input
                dir="ltr"
                value={smallModel}
                onChange={(e) => setSmallModel(e.target.value)}
                placeholder={selectedProvider?.smallModel ?? "نموذج أسرع وأرخص"}
                className="bg-secondary/50 font-mono text-sm"
              />
            </div>
          </div>

          {!editingId && (
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-secondary/30 p-4 text-sm">
              <input
                type="checkbox"
                checked={makeActive}
                onChange={(e) => setMakeActive(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              اجعل هذا المزوّد هو الافتراضي/النشط بعد الحفظ
            </label>
          )}

          <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary/40 p-4 text-xs leading-6 text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              عند اختيار مزوّد محفوظ كنشط، يستخدمه التوليد مباشرة من قاعدة البيانات. إذا لم يوجد مزوّد محفوظ نشط،
              يعود مِرْوَر إلى إعدادات البيئة أو الإعداد الافتراضي القديم للحفاظ على التوافق.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="ghost"
            className="gap-2 text-red-400 hover:bg-destructive/10 hover:text-red-400"
            onClick={() => clearMutation.mutate()}
            disabled={!data.configured || clearMutation.isPending || data.source === "saved"}
          >
            <Trash2 className="h-4 w-4" />
            إزالة مفتاح الإعداد الافتراضي
          </Button>
          <div className="flex gap-2">
            {editingId && (
              <Button variant="outline" className="gap-2" onClick={resetForm} disabled={isSaving}>
                <X className="h-4 w-4" />
                إلغاء
              </Button>
            )}
            <Button
              className="gap-2"
              onClick={submitProvider}
              disabled={isSaving || !name.trim() || !baseUrl.trim() || !model.trim()}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingId ? "تحديث المزوّد" : "حفظ مزوّد جديد"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold">المزوّدات المحفوظة</h2>
            <p className="text-xs text-muted-foreground">يمكنك تعديلها، حذفها، أو جعل أحدها الافتراضي النشط</p>
          </div>
          {data.activeProviderId && (
            <Button variant="outline" size="sm" onClick={() => clearActiveMutation.mutate()} disabled={clearActiveMutation.isPending}>
              الرجوع للبيئة/الافتراضي
            </Button>
          )}
        </div>

        <div className="divide-y divide-border">
          {data.savedProviders.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-muted-foreground">
              لا توجد مزوّدات محفوظة بعد. ابدأ بإدخال اسم وحفظ المزوّد أعلاه.
            </div>
          ) : (
            data.savedProviders.map((saved) => {
              const option = data.providers.find((item) => item.id === saved.provider);
              return (
                <div key={saved.id} className="flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{saved.name}</h3>
                      {saved.isActive && <Badge className="border-0 bg-primary/15 text-primary">نشط</Badge>}
                      <Badge variant="secondary">{option?.label ?? saved.provider}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span dir="ltr" className="font-mono">{saved.model}</span>
                      {saved.smallModel && <span dir="ltr" className="font-mono">{saved.smallModel}</span>}
                      <span>{saved.apiKeyMasked ? `مفتاح محفوظ: ${saved.apiKeyMasked}` : "لا يوجد مفتاح"}</span>
                    </div>
                    <p dir="ltr" className="truncate text-xs font-mono text-muted-foreground">{saved.baseUrl}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => setActiveMutation.mutate({ id: saved.id })}
                      disabled={saved.isActive || setActiveMutation.isPending}
                    >
                      <Star className="h-4 w-4" />
                      اجعله نشطاً
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => editProvider(saved)}>
                      <Edit3 className="h-4 w-4" />
                      تعديل
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-red-400 hover:bg-destructive/10 hover:text-red-400"
                      onClick={() => deleteMutation.mutate({ id: saved.id })}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                      حذف
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm leading-7">
          <strong>قاعدة البيانات:</strong> تُحفظ المزوّدات المسماة في SQLite للتطوير وPostgreSQL للإنتاج،
          مع ضمان مزوّد نشط واحد كحد أقصى والعودة الآمنة لمتغير <code dir="ltr">DATABASE_URL</code> وإعدادات البيئة عند الحاجة.
        </p>
      </div>
    </div>
  );
}
