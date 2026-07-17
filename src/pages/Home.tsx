import {
  ArrowDown,
  BookOpenCheck,
  BrainCircuit,
  Factory,
  FileCheck2,
  FlaskConical,
  GitBranch,
  ListChecks,
  ShieldCheck,
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

export default function Home() {
  return (
    <div>
      {/* البطل */}
      <section className="grid-pattern relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              مبني على إطار «The New SDLC» — من Vibe Coding إلى Agentic Engineering
            </div>
            <h1 className="text-4xl font-bold leading-[1.25] sm:text-5xl sm:leading-[1.2]">
              حوّل فكرتك إلى <span className="text-gradient">حزمة توثيق هندسية</span>
              <br />
              جاهزة لبناء تطبيقك بالذكاء الاصطناعي
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              اكتب فكرتك بلغتك الطبيعية، ويولّد مِرْوَر 9 وثائق احترافية مترابطة — متطلبات، معمارية،
              سياق وكلاء، خطة تنفيذ، اختبارات، حواجز، ونشر — لتبدأ الـ Vibe Coding بأساس يضاهي
              التطبيقات العالمية: قوي، متين، قابل للتوسع، وسهل الصيانة.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-4xl">
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
              className="group rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:bg-primary/5"
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
      <section className="border-t border-border bg-card/40">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">المبادئ التي تحكم التوليد</h2>
            <p className="mt-3 text-muted-foreground">
              مستخلصة من الورقة البحثية — ومطبّقة حرفياً في كل وثيقة
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {principles.map((p, i) => (
              <div key={p.title} className="flex gap-4 rounded-2xl border border-border bg-background p-6">
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
