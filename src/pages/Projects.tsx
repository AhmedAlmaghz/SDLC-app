import { useMemo, useState } from "react";
import { Link } from "react-router";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Activity, FileText, FolderOpen, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: { label: "مسودة", className: "bg-secondary text-muted-foreground" },
  generating: { label: "قيد التوليد", className: "bg-amber-500/15 text-amber-400" },
  ready: { label: "جاهزة", className: "bg-primary/15 text-primary" },
  failed: { label: "متعذّر", className: "bg-destructive/15 text-red-400" },
};

export default function Projects() {
  const utils = trpc.useUtils();
  const [query, setQuery] = useState("");
  const { data: projects, isLoading } = trpc.projects.list.useQuery(undefined, {
    refetchInterval: (query) =>
      query.state.data?.some((p) => p.status === "generating") ? 2500 : false,
  });

  const removeMutation = trpc.projects.remove.useMutation({
    onSuccess: () => {
      toast.success("حُذف المشروع");
      void utils.projects.list.invalidate();
    },
    onError: () => toast.error("تعذّر حذف المشروع"),
  });

  const filteredProjects = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return projects ?? [];
    return (projects ?? []).filter((project) =>
      `${project.name} ${project.idea} ${project.status}`.toLowerCase().includes(search),
    );
  }, [projects, query]);

  const readyCount = projects?.filter((project) => project.status === "ready").length ?? 0;
  const generatingCount = projects?.filter((project) => project.status === "generating").length ?? 0;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-col justify-between gap-5 rounded-3xl border border-white/10 bg-card/55 p-5 backdrop-blur sm:flex-row sm:items-center">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Activity className="h-3.5 w-3.5" />
            {readyCount} جاهزة · {generatingCount} قيد التوليد
          </div>
          <h1 className="text-2xl font-bold">مشاريعي</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            لوحة عمل لحزم التوثيق: راقب التقدم، افتح الوثائق، وصدّرها عند الجاهزية.
          </p>
        </div>
        <Link to="/">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            حزمة جديدة
          </Button>
        </Link>
      </div>

      {!!projects?.length && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-border bg-card/70 px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث باسم المشروع أو الفكرة أو الحالة..."
            className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !projects?.length ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/40 py-24 text-center">
          <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="font-semibold">لا مشاريع بعد</p>
          <p className="mt-1 text-sm text-muted-foreground">صف فكرتك الأولى وولّد حزمتها</p>
          <Link to="/" className="mt-5">
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              توليد حزمة
            </Button>
          </Link>
        </div>
      ) : !filteredProjects.length ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/40 py-20 text-center">
          <Search className="mb-4 h-10 w-10 text-muted-foreground/50" />
          <p className="font-semibold">لا توجد نتائج مطابقة</p>
          <p className="mt-1 text-sm text-muted-foreground">جرّب كلمة مختلفة أو امسح حقل البحث.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((p) => {
            const status = STATUS_LABELS[p.status] ?? STATUS_LABELS.draft;
            return (
              <div
                key={p.id}
                className="interactive-card group relative flex flex-col rounded-2xl border border-border bg-card/80 p-5 backdrop-blur"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <Link to={`/projects/${p.id}`} className="min-w-0">
                    <h3 className="truncate text-lg font-bold transition-colors group-hover:text-primary">
                      {p.name}
                    </h3>
                  </Link>
                  <Badge className={cn("shrink-0 border-0", status.className)}>
                    {p.status === "generating" && (
                      <Loader2 className="me-1 h-3 w-3 animate-spin" />
                    )}
                    {status.label}
                  </Badge>
                </div>
                <p className="mb-4 line-clamp-2 flex-1 text-sm leading-6 text-muted-foreground">
                  {p.idea}
                </p>
                <div className="mb-4 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      p.status === "failed" ? "bg-destructive" : p.status === "generating" ? "bg-amber-400" : "bg-primary",
                    )}
                    style={{ width: `${Math.round((p.docsCount / p.totalDocs) * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    {p.docsCount}/{p.totalDocs} وثيقة
                  </span>
                  <span>
                    {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true, locale: ar })}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`حذف مشروع «${p.name}» نهائياً؟`))
                        removeMutation.mutate({ id: p.id });
                    }}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-red-400"
                    aria-label="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
