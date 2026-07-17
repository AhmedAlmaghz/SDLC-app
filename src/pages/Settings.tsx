import { useEffect, useState } from "react";
import { BrainCircuit, CheckCircle2, Info, KeyRound, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function Settings() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.settings.getAi.useQuery();

  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [smallModel, setSmallModel] = useState("");

  useEffect(() => {
    if (data) {
      setBaseUrl(data.baseUrl);
      setModel(data.model);
      setSmallModel(data.smallModel);
    }
  }, [data]);

  const saveMutation = trpc.settings.saveAi.useMutation({
    onSuccess: () => {
      toast.success("حُفظت الإعدادات");
      setApiKey("");
      void utils.settings.getAi.invalidate();
    },
    onError: (e) => toast.error(e.message || "تعذّر الحفظ"),
  });

  const clearMutation = trpc.settings.clearAiKey.useMutation({
    onSuccess: () => {
      toast.success("أُزيل المفتاح — سيعمل مِرْوَر بالمحرك الهندسي المدمج");
      void utils.settings.getAi.invalidate();
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ربط نماذج الذكاء الاصطناعي عبر Vercel AI SDK — أي مزوّد متوافق مع OpenAI
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BrainCircuit className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-bold">مزوّد الذكاء الاصطناعي</h2>
              <p className="text-xs text-muted-foreground">توجيه ذكي: نموذج رئيسي للمهام المعقدة ونموذج صغير للقياسية</p>
            </div>
          </div>
          <Badge
            className={
              data.configured
                ? "border-0 bg-primary/15 text-primary"
                : "border-0 bg-amber-500/15 text-amber-400"
            }
          >
            {data.configured ? "مُفعّل" : "وضع القوالب"}
          </Badge>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <label className="mb-2 block text-sm font-semibold">عنوان نقطة النهاية (Base URL)</label>
            <Input
              dir="ltr"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.moonshot.ai/v1"
              className="bg-secondary/50 font-mono text-sm"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Moonshot: api.moonshot.ai/v1 — OpenAI: api.openai.com/v1 — أو أي مزوّد متوافق
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
              placeholder={data.apiKeyMasked ? `محفوظ حالياً: ${data.apiKeyMasked} — أدخل مفتاحاً جديداً للتغيير` : "sk-..."}
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
                placeholder="kimi-k2-0905-preview"
                className="bg-secondary/50 font-mono text-sm"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                للمتطلبات والمعمارية وهندسة السياق والخطة
              </p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">النموذج الصغير (اختياري)</label>
              <Input
                dir="ltr"
                value={smallModel}
                onChange={(e) => setSmallModel(e.target.value)}
                placeholder="نموذج أسرع وأرخص"
                className="bg-secondary/50 font-mono text-sm"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                للاختبارات والحواجز والنشر وخارطة الطريق
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary/40 p-4 text-xs leading-6 text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              دون مفتاح، يعمل مِرْوَر بمحرك قوالب هندسي مدمج يولّد الحزمة كاملة بجودة عالية. مع
              المفتاح، تُولَّد الوثائق بالذكاء الاصطناعي مع تسجيل استهلاك الرموز والزمن لكل وثيقة —
              وعند أي فشل في المزوّد يسقط التوليد تلقائياً إلى القوالب دون أن تفقد شيئاً.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <Button
            variant="ghost"
            className="gap-2 text-red-400 hover:bg-destructive/10 hover:text-red-400"
            onClick={() => clearMutation.mutate()}
            disabled={!data.configured || clearMutation.isPending}
          >
            <Trash2 className="h-4 w-4" />
            إزالة المفتاح
          </Button>
          <Button
            className="gap-2"
            onClick={() =>
              saveMutation.mutate({
                baseUrl: baseUrl.trim(),
                apiKey: apiKey.trim() || undefined,
                model: model.trim(),
                smallModel: smallModel.trim(),
              })
            }
            disabled={saveMutation.isPending || !baseUrl.trim() || !model.trim()}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            حفظ
          </Button>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm leading-7">
          <strong>قاعدة البيانات:</strong> SQLite للتطوير (ملف محلي بلا إعداد) وPostgreSQL للإنتاج
          عبر متغير <code dir="ltr">DATABASE_URL</code> — بمخطط Drizzle واحد متطابق بنيوياً.
        </p>
      </div>
    </div>
  );
}
