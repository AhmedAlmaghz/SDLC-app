# مِرْوَر (Mirwr)

أداة تحوّل فكرة المستخدم إلى **حزمة توثيق هندسية كاملة** جاهزة للـ Vibe Coding، مبنية على إطار ورقة
«The New SDLC with Vibe Coding» (Osmani, Saboo, Kartakis — 2026).

## ماذا تولّد؟

تسع وثائق مترابطة لكل مشروع:

| الوثيقة | الغرض |
|---|---|
| `01-PRD.md` | المتطلبات: رؤية، شخصيات، قصص مستخدم، معايير قبول، حالات حدّية |
| `02-ARCHITECTURE.md` | المعمارية: مكدس، نموذج بيانات، سطح API، سجلات قرارات ADR |
| `AGENTS.md` | السياق الساكن للوكلاء: المكدس، الاصطلاحات، القواعد الصارمة، الحدود |
| `03-CONTEXT-PACK.md` | هندسة السياق: الأنواع الستة، الساكن/الديناميكي، تصميم المهارات |
| `04-SPEC-PLAN.md` | خطة تنفيذ: مهام بحجم الوكيل بمعايير نجاح، سجل مشكلة الـ 80% |
| `05-TESTS-AND-EVALS.md` | هرم الاختبارات، مجموعات Evals بمعايير تسجيل، بوابات CI |
| `06-GUARDRAILS-AND-SECURITY.md` | نموذج تهديدات، خطافات حتمية، عزل، ثقة صفرية |
| `07-DEPLOYMENT-AND-OBSERVABILITY.md` | CI/CD، مراقبة الوكيل، اقتصاد الرموز، SLOs |
| `08-ROADMAP-AND-MAINTENANCE.md` | خارطة طريق، سياسة الدَّين التقني، نموذج الفريق |

## المكدس

- **الواجهة**: React 19 + TypeScript + Vite + Tailwind + shadcn/ui (عربية RTL)
- **الخلفية**: Hono + tRPC (أمان أنواع طرف-لطرف)
- **الذكاء الاصطناعي**: Vercel AI SDK (`ai` + `@ai-sdk/openai-compatible`) مع توجيه ذكي للنماذج
  (الوثائق المعقدة → النموذج الرئيسي، القياسية → النموذج الصغير) وتسجيل استهلاك الرموز والزمن
- **قاعدة البيانات**: Drizzle ORM — **SQLite للتطوير** و**PostgreSQL للإنتاج** بمخططين متطابقين بنيوياً
- **احتياط حتمي**: محرك قوالب هندسي يولّد الحزمة كاملة دون مفتاح AI أو عند فشل المزوّد

## التشغيل (تطوير)

```bash
npm install
npm run dev        # http://localhost:3000
```

SQLite يُنشأ تلقائياً في `./data/mirwr.db` عند أول تشغيل — لا حاجة لأي إعداد.

## الإنتاج (PostgreSQL)

```bash
# 1) وفّر قاعدة PostgreSQL وصدّر المتغير
export DATABASE_URL=postgres://user:password@host:5432/mirwr

# 2) طبّق الهجرات
npm run db:generate:pg   # توليد SQL من db/schema.pg.ts (أول مرة)
npm run db:push:pg       # أو المزامنة المباشرة

# 3) ابنِ وشغّل
npm run build
npm start
```

يكتشف التطبيق صيغة `postgres://` في `DATABASE_URL` ويتحول تلقائياً لمحرك PostgreSQL.

## ربط الذكاء الاصطناعي

من صفحة «الإعدادات» داخل التطبيق، أو عبر متغيرات البيئة:

```bash
AI_BASE_URL=https://api.moonshot.ai/v1   # أي نقطة متوافقة مع OpenAI
AI_API_KEY=sk-...
AI_MODEL=kimi-k2-0905-preview            # النموذج الرئيسي (وثائق معقدة)
AI_SMALL_MODEL=kimi-k2-0905-preview      # النموذج الصغير (وثائق قياسية)
```

دون مفتاح يعمل التطبيق كاملاً بالمحرك الهندسي المدمج.

## بنية المشروع

```
src/            الواجهة (صفحات + مكونات)
api/            الخادم: routers + ai/ (مزوّد، مطالبات، قوالب، منسّق التوليد)
contracts/      الأنواع المشتركة (تعريفات الوثائق التسع ومدخلات المعالج)
db/             schema.ts (SQLite) + schema.pg.ts (PostgreSQL)
```
