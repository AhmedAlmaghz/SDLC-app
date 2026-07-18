import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowRight,
  Bot,
  Check,
  Copy,
  Download,
  FileArchive,
  FileText,
  Gauge,
  Loader2,
  Pencil,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import JSZip from "jszip";
import { toast } from "sonner";
import { DOC_DEFINITIONS, type DocKey, type DocSource, type PackageChangeType, type PackageVersionStatus } from "@contracts/types";
import { trpc } from "@/providers/trpc";
import IdeaWizard from "@/components/IdeaWizard";
import MarkdownView from "@/components/MarkdownView";
import { buildDocumentBundle, packageVersionFolder } from "@/lib/packageExport";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const SOURCE_META: Record<DocSource, { label: string; className: string }> = {
  ai: { label: "ذكاء اصطناعي", className: "bg-primary/15 text-primary" },
  template: { label: "محرك القوالب", className: "bg-sky-500/15 text-sky-400" },
  "ai-fallback": { label: "AI → احتياط", className: "bg-amber-500/15 text-amber-400" },
};

const VERSION_STATUS_META: Record<PackageVersionStatus, { label: string; className: string; dot: string }> = {
  queued: { label: "في الانتظار", className: "border-amber-500/30 bg-amber-500/10 text-amber-300", dot: "bg-amber-400" },
  generating: { label: "توليد", className: "border-amber-500/30 bg-amber-500/10 text-amber-300", dot: "bg-amber-400 animate-pulse" },
  updating: { label: "تحديث", className: "border-amber-500/30 bg-amber-500/10 text-amber-300", dot: "bg-amber-400 animate-pulse" },
  ready: { label: "مكتمل", className: "border-primary/30 bg-primary/10 text-primary", dot: "bg-primary" },
  failed: { label: "فشل", className: "border-destructive/40 bg-destructive/10 text-red-300", dot: "bg-red-400" },
};

const CHANGE_TYPE_LABELS: Record<PackageChangeType, string> = {
  initial_generation: "توليد أولي",
  full_regeneration: "إعادة توليد كاملة",
  config_update: "تحديث إعدادات",
  single_doc_regeneration: "تحديث وثيقة واحدة",
};

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ProjectDetail() {
  const { id = "" } = useParams();
  const utils = trpc.useUtils();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pendingDocKey, setPendingDocKey] = useState<DocKey | null>(null);

  const { data: project } = trpc.projects.get.useQuery(
    { id },
    {
      refetchInterval: (query) =>
        query.state.data?.status === "generating" || query.state.data?.currentVersion?.status === "generating" || query.state.data?.currentVersion?.status === "updating" ? 2000 : false,
    },
  );

  const regenerateAll = trpc.projects.regenerate.useMutation({
    onSuccess: () => void utils.projects.get.invalidate({ id }),
  });
  const regenerateDoc = trpc.projects.regenerateDoc.useMutation({
    onSuccess: () => {
      toast.success("أُعيد توليد الوثيقة في إصدار جديد");
      setPendingDocKey(null);
      void utils.projects.get.invalidate({ id });
    },
    onError: () => {
      setPendingDocKey(null);
      toast.error("تعذّرت إعادة التوليد");
    },
  });

  const docs = useMemo(() => project?.docs ?? [], [project?.docs]);
  const activeKey = selectedKey ?? docs[0]?.key ?? null;
  const activeDoc = useMemo(
    () => docs.find((d) => d.key === activeKey) ?? null,
    [docs, activeKey],
  );
  const activeDef = DOC_DEFINITIONS.find((d) => d.key === activeKey);

  const totalInput = project?.metrics.reduce((s, m) => s + (m.inputTokens ?? 0), 0) ?? 0;
  const totalOutput = project?.metrics.reduce((s, m) => s + (m.outputTokens ?? 0), 0) ?? 0;
  const completedDocs = useMemo(() => new Set(docs.map((doc) => doc.key)), [docs]);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">جارٍ تحميل المشروع…</p>
      </div>
    );
  }

  const progress = Math.round((project.docsCount / project.totalDocs) * 100);
  const currentVersion = project.currentVersion;
  const versionStatus = currentVersion?.status ?? (project.status === "ready" ? "ready" : "queued");
  const statusMeta = VERSION_STATUS_META[versionStatus];
  const isVersionInFlight = versionStatus === "queued" || versionStatus === "generating" || versionStatus === "updating" || project.status === "generating";
  const versionContext = currentVersion ? CHANGE_TYPE_LABELS[currentVersion.changeType] : "توليد";

  const copyDoc = async () => {
    if (!activeDoc) return;
    await navigator.clipboard.writeText(activeDoc.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    toast.success("نُسخت الوثيقة");
  };

  const downloadDoc = () => {
    if (!activeDoc) return;
    downloadBlob(
      new Blob([activeDoc.content], { type: "text/markdown;charset=utf-8" }),
      activeDoc.fileName,
    );
  };

  const downloadZip = async () => {
    if (!docs.length) return;
    setZipping(true);
    try {
      const zip = new JSZip();
      const rootName = packageVersionFolder(project);
      const folder = zip.folder(rootName) ?? zip;
      const versionLabel = project.currentVersion?.label ?? "v1";
      folder.file(
        "README.md",
        `# حزمة توثيق ${project.name}\n\n- Version: ${versionLabel}\n- Documents: ${docs.length}/${project.totalDocs}\n\n${project.idea}\n\n---\nولّدها مِرْوَر وفق إطار «The New SDLC with Vibe Coding».\nكل وثيقة كبيرة محفوظة داخل مجلدها مع ملف INDEX.md وقائمة أجزاء مرتبة.\n`,
      );
      for (const d of docs) {
        const bundle = buildDocumentBundle(d, project);
        const docFolder = folder.folder(bundle.folderName) ?? folder;
        docFolder.file(bundle.indexFileName, bundle.indexContent);
        for (const part of bundle.parts) docFolder.file(part.fileName, part.content);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `${rootName}.zip`);
      toast.success("جُهّزت الحزمة المضغوطة");
    } finally {
      setZipping(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      {/* الترويسة */}
      <div className="mb-6">
        <Link
          to="/projects"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowRight className="h-4 w-4" />
          مشاريعي
        </Link>
        <div className="rounded-3xl border border-white/10 bg-card/60 p-5 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold">{project.name}</h1>
              <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{project.idea}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2" disabled={isVersionInFlight} onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
                تعديل
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setShowMetrics((v) => !v)}
              >
                <Gauge className="h-4 w-4" />
                المقاييس
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={project.status === "generating" || regenerateAll.isPending}
                onClick={() => {
                  if (confirm("إعادة توليد كل الوثائق؟ سيُنشأ إصدار جديد مستقل وتبقى الإصدارات السابقة محفوظة."))
                    regenerateAll.mutate({ id });
                }}
              >
                <RefreshCw className="h-4 w-4" />
                إعادة التوليد
              </Button>
              <Button
                size="sm"
                className="gap-2"
                onClick={downloadZip}
                disabled={!docs.length || zipping}
              >
                {zipping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileArchive className="h-4 w-4" />
                )}
                تصدير ZIP
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-4">
            {[
              { label: "الوثائق", value: `${project.docsCount}/${project.totalDocs}` },
              { label: "الإصدار", value: project.currentVersion?.label ?? "v1" },
              { label: "لغة الحزمة", value: project.docLanguage === "ar" ? "العربية" : "English" },
              { label: "سياق الإصدار", value: versionContext },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-border bg-background/50 px-4 py-3">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-1 font-semibold">{item.value}</p>
              </div>
            ))}
          </div>

          <div className={cn("mt-5 rounded-xl border p-4", statusMeta.className)}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 font-medium">
                {isVersionInFlight ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className={cn("h-2.5 w-2.5 rounded-full", statusMeta.dot)} />}
                {statusMeta.label}: {versionContext} — {project.docsCount}/{project.totalDocs}
              </span>
              <span className="font-mono text-xs text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            {currentVersion?.changeSummary && <p className="mt-2 text-xs text-muted-foreground">{currentVersion.changeSummary}</p>}
            {currentVersion?.createdFromVersionNumber && <p className="mt-1 text-xs text-muted-foreground">نسخة مشتقة من v{currentVersion.createdFromVersionNumber}</p>}
          </div>

          {project.status === "failed" && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-red-300">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="space-y-2">
                <p>
                  تعذّر إكمال التوليد ({project.docsCount}/{project.totalDocs} وثيقة). لم يتم استبدال فشل مزوّد
                  الذكاء الاصطناعي بقوالب صامتة.
                </p>
                {project.metrics.find((m) => m.status === "error")?.detail && (
                  <pre dir="ltr" className="whitespace-pre-wrap rounded-lg bg-background/70 p-3 font-mono text-xs text-red-200">
                    {project.metrics.find((m) => m.status === "error")?.detail}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* المقاييس — مراقبة الـ Harness */}
      {showMetrics && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center gap-6">
            <h3 className="flex items-center gap-2 font-bold">
              <Bot className="h-5 w-5 text-primary" />
              مراقبة التوليد (Observability)
            </h3>
            <div className="flex gap-5 text-sm text-muted-foreground">
              <span>
                رموز الإدخال: <strong className="font-mono text-foreground">{totalInput.toLocaleString()}</strong>
              </span>
              <span>
                رموز الإخراج: <strong className="font-mono text-foreground">{totalOutput.toLocaleString()}</strong>
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-start text-xs text-muted-foreground">
                  <th className="px-3 py-2 text-start font-medium">الوثيقة</th>
                  <th className="px-3 py-2 text-start font-medium">النموذج/المصدر</th>
                  <th className="px-3 py-2 text-start font-medium">الرموز (د/خ)</th>
                  <th className="px-3 py-2 text-start font-medium">الزمن</th>
                  <th className="px-3 py-2 text-start font-medium">الحالة</th>
                  <th className="px-3 py-2 text-start font-medium">التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {project.metrics
                  .filter((m) => m.kind === "doc")
                  .map((m) => (
                    <tr key={m.id} className="border-b border-border/60">
                      <td className="px-3 py-2 font-medium">{m.docKey}</td>
                      <td className="px-3 py-2 font-mono text-xs">{m.model ?? "template"}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {m.inputTokens ?? "—"} / {m.outputTokens ?? "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {m.durationMs != null ? `${(m.durationMs / 1000).toFixed(1)}s` : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <Badge
                          className={cn(
                            "border-0 text-[10px]",
                            m.status === "ok"
                              ? "bg-primary/15 text-primary"
                              : "bg-destructive/15 text-red-400",
                          )}
                        >
                          {m.status === "ok" ? "ناجح" : "خطأ"}
                        </Badge>
                      </td>
                      <td className="max-w-[360px] px-3 py-2 font-mono text-xs text-muted-foreground">
                        <span dir="ltr" className="line-clamp-3 whitespace-pre-wrap">
                          {m.detail ?? "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* المحتوى: قائمة الوثائق + العارض */}
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card/70 p-4">
            <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>خريطة الحزمة</span>
              <span className="font-mono">{progress}%</span>
            </div>
            <div className="grid grid-cols-9 gap-1" aria-label="تقدم وثائق الحزمة">
              {DOC_DEFINITIONS.map((def) => {
                const isPending = isVersionInFlight && !completedDocs.has(def.key);
                return (
                  <span
                    key={def.key}
                    className={cn("h-2 rounded-full", completedDocs.has(def.key) ? "bg-primary" : isPending ? "bg-amber-400 animate-pulse" : "bg-secondary")}
                    title={def.titleAr}
                  />
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            {DOC_DEFINITIONS.map((def) => {
              const doc = docs.find((d) => d.key === def.key);
              const active = activeKey === def.key;
              const pending = pendingDocKey === def.key || (!doc && isVersionInFlight) || (pendingDocKey === null && isVersionInFlight && currentVersion?.changeType !== "single_doc_regeneration" && !doc);
              const docStatus = pending ? (currentVersion?.changeType === "config_update" ? "updating" : "generating") : doc ? "ready" : "queued";
              return (
                <button
                  key={def.key}
                  type="button"
                  onClick={() => doc && setSelectedKey(def.key)}
                  disabled={!doc}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-start transition-all",
                    active
                      ? "border-primary/50 bg-primary/10"
                      : doc
                        ? "border-border bg-card hover:border-primary/30"
                        : "border-dashed border-border bg-transparent opacity-50",
                  )}
                >
                  <FileText
                    className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")}
                  />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-sm font-semibold", active && "text-primary", docStatus === "generating" || docStatus === "updating" ? "text-amber-300" : docStatus === "ready" ? "text-primary" : undefined)}>
                      {project.docLanguage === "ar" ? def.titleAr : def.titleEn}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {def.phaseAr} · {docStatus === "ready" ? "مكتملة" : docStatus === "updating" ? "تحديث جارٍ" : docStatus === "generating" ? "توليد جارٍ" : "في الانتظار"}
                    </span>
                  </span>
                  {docStatus === "generating" || docStatus === "updating" ? (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-amber-300" />
                  ) : (
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", docStatus === "ready" ? "bg-primary" : "bg-amber-400")} />
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="min-w-0">
          {activeDoc ? (
            <div className="rounded-3xl border border-border bg-card/85 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
                <div className="flex items-center gap-3">
                  <h2 className="font-bold">{activeDoc.title}</h2>
                  <Badge className={cn("border-0", SOURCE_META[activeDoc.source].className)}>
                    {SOURCE_META[activeDoc.source].label}
                  </Badge>
                  {activeDoc.model && (
                    <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
                      {activeDoc.model}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button variant="ghost" size="sm" className="gap-1.5" onClick={copyDoc}>
                    {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                    نسخ
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1.5" onClick={downloadDoc}>
                    <Download className="h-4 w-4" />
                    .md
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    disabled={regenerateDoc.isPending || isVersionInFlight}
                    onClick={() => {
                      setPendingDocKey(activeDoc.key);
                      regenerateDoc.mutate({ id, key: activeDoc.key, changeSummary: `Regenerated ${activeDoc.title}` });
                    }}
                  >
                    <RefreshCw className={cn("h-4 w-4", regenerateDoc.isPending && "animate-spin")} />
                    إعادة
                  </Button>
                </div>
              </div>
              {activeDef && (
                <p className="border-b border-border bg-secondary/30 px-6 py-2.5 text-xs leading-5 text-muted-foreground">
                  {activeDef.descriptionAr} — <span className="font-mono">{activeDef.fileName}</span>
                </p>
              )}
              <div className="px-6 py-6 sm:px-8">
                <MarkdownView content={activeDoc.content} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/40 py-32 text-center">
              <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary/60" />
              <p className="font-semibold">تُبنى الوثائق الآن…</p>
              <p className="mt-1 text-sm text-muted-foreground">
                تظهر كل وثيقة فور اكتمالها — لا حاجة لتحديث الصفحة
              </p>
            </div>
          )}
        </section>
      </div>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[92vh] w-[min(96vw,1440px)] max-w-none overflow-y-auto p-0 sm:rounded-3xl">
          <DialogHeader className="px-6 pt-6 lg:px-8">
            <DialogTitle>تعديل المشروع وتوليد إصدار جديد</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 lg:px-8">
            <IdeaWizard
              initialValues={{ id: project.id, name: project.name, idea: project.idea, config: project.config }}
              onSaved={() => {
                setEditOpen(false);
                void utils.projects.get.invalidate({ id });
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
