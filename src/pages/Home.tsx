import {
  ArrowDown,
  ArrowLeft,
  BookOpenCheck,
  BrainCircuit,
  Factory,
  FileCheck2,
  FlaskConical,
  GitBranch,
  ListChecks,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import IdeaWizard from "@/components/IdeaWizard";

const packageDocs = [
  { icon: BookOpenCheck, title: "PRD", desc: "متطلبات المنتج وقصص المستخدم ومعايير القبول" },
  { icon: Workflow, title: "المعمارية", desc: "بنية النظام ونموذج البيانات وسجلات القرارات ADR" },
  { icon: BrainCircuit, title: "AGENTS.md", desc: "السياق الساكن والقواعد الصارمة لكل وكيل برمجة" },
  { icon: FileCheck2, title: "هندسة السياق", desc: "الأنواع الستة للسياق وحدود الساكن/الديناميكي" },
  { icon: ListChecks, title: "خطة التنفيذ", desc: "مهام بحجم الوكيل مع معايير نجاح قابلة للتحقق" },
  { icon: FlaskConical, title: "الاختبارات والتقييمات", desc: "هرم الاختبارات ومجموعات Evals وبوابات الجودة" },
  { icon: ShieldCheck, title: "الحواجز والأمان", desc: "خطافات حتمية وعزل وثقة صفرية" },
  { icon: GitBranch, title: "النشر والمراقبة", desc: "CI/CD ومراقبة الوكيل واقتصاد الرموز" },
  { icon: Factory, title: "خارطة الطريق", desc: "الصيانة والدَّين التقني ونموذج الفريق" },
];

const principles = [
  {
    title: "البنية تتوسع، الحدس لا يتوسع",
    desc: "الـ Vibe Coding للاستكشاف، والهندسة الوكيلة للإنتاج — مواصفات واختبارات وحواجز وإشراف بشري.",
  },
  {
    title: "النموذج محرك خام، والـ Harness هو السيارة",
    desc: "التعليمات والأدوات والعزل والتنسيق والمراقبة — معظم إخفاقات الوكيل إخفاقات تهيئة، لا إخفاقات نموذج.",
  },
  {
    title: "السياق مهارة حقيقية",
    desc: "جودة الشفرة المولّدة تعتمد على جودة السياق لا على ذكاء المطالبة — حزمة مِرْوَر هي ذلك السياق.",
  },
  {
    title: "الاختبارات والتقييمات هي العقد",
    desc: "مجموعة اختبار وEval مكتوبة جيداً تنقل النية أدق من أي مطالبة لغوية.",
  },
];

const stats = [
  { value: "9", label: "وثائق مترابطة" },
  { value: "6", label: "طبقات سياق" },
  { value: "100%", label: "قابل للتصدير" },
];

export default function Home() {
  return (
    <div>
      {/* البطل */}
      <section className="grid-pattern relative overflow-hidden border-b border-white/10">
        <div className="soft-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-background" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_360px]">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                مبني على إطار «The New SDLC» — من Vibe Coding إلى Agentic Engineering
              </div>
              <h1 className="text-4xl font-bold leading-[1.18] tracking-tight sm:text-6xl sm:leading-[1.12]">
                حوّل فكرتك إلى <span className="text-gradient">نظام مواصفات ذكي</span>
                <br />
                جاهز لوكلاء البرمجة
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                اكتب فكرتك بلغتك الطبيعية، ويولّد مِرْوَر حزمة توثيق احترافية تربط النية بالمعمارية
                والاختبارات والحواجز. النتيجة: بداية أسرع، قرارات أوضح، وسياق يرفع جودة الـ Vibe Coding.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a
                  href="#idea-wizard"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
                >
                  ابدأ بناء الحزمة
                  <ArrowLeft className="h-4 w-4" />
                </a>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-background/40 px-4 py-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  بدون إعدادات معقدة
                </span>
              </div>
            </div>

            <div className="animate-float hidden rounded-3xl border border-white/10 bg-card/70 p-5 shadow-2xl shadow-black/30 backdrop-blur lg:block">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Mirwr Intelligence</p>
                  <h2 className="font-bold">حزمة جاهزة للتنفيذ</h2>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">Live</span>
              </div>
              <div className="space-y-3">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between rounded-2xl border border-border bg-secondary/30 px-4 py-3">
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                    <strong className="font-mono text-lg text-primary">{stat.value}</strong>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6 text-muted-foreground">
                من فكرة خام إلى PRD وArchitecture وAGENTS.md وخطة تنفيذ يمكن تسليمها مباشرة لوكيل برمجة.
              </div>
            </div>
          </div>

          <div id="idea-wizard" className="mx-auto mt-12 max-w-5xl scroll-mt-24">
            <IdeaWizard />
          </div>
        </div>
      </section>

      {/* ماذا تتضمن الحزمة */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">ماذا تتضمن حزمة التوثيق؟</h2>
          <p className="mt-3 text-muted-foreground">
            تسع وثائق تغطي دورة حياة التطوير كاملة وفق الورقة — من النية إلى الإنتاج
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packageDocs.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="interactive-card group rounded-2xl border border-border bg-card/80 p-5 backdrop-blur hover:bg-primary/5"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 transition-transform group-hover:scale-110">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-bold">{title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* مبادئ الإطار */}
      <section className="border-t border-white/10 bg-card/40">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">المبادئ التي تحكم التوليد</h2>
            <p className="mt-3 text-muted-foreground">
              مستخلصة من الورقة البحثية — ومطبّقة حرفياً في كل وثيقة
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {principles.map((p, i) => (
              <div key={p.title} className="interactive-card flex gap-4 rounded-2xl border border-border bg-background/80 p-6">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-sm font-bold text-primary">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-bold">{p.title}</h3>
                  <p className="mt-1.5 text-sm leading-7 text-muted-foreground">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 flex justify-center">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:opacity-80"
            >
              <ArrowDown className="h-4 w-4 rotate-180" />
              ابدأ الآن — صف فكرتك في الأعلى
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
