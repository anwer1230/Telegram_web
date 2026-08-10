import {
  ArrowLeft,
  ArrowUpLeft,
  BookOpen,
  Check,
  ChevronLeft,
  FileArchive,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  LayoutGrid,
  Link2,
  Presentation,
  Sparkles,
  WandSparkles,
} from 'lucide-react';

type ServicesCenterProps = {
  onBack: () => void;
};

function ServiceLink({
  href,
  icon: Icon,
  eyebrow,
  title,
  description,
  tone,
  featured = false,
}: {
  href: string;
  icon: typeof BookOpen;
  eyebrow: string;
  title: string;
  description: string;
  tone: string;
  featured?: boolean;
}) {
  return (
    <a
      href={href}
      data-testid={`link-service-${title}`}
      className={`group relative flex min-h-[164px] flex-col overflow-hidden rounded-[24px] border border-border/80 bg-card p-5 text-right transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_18px_38px_hsl(var(--foreground)/.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${featured ? 'md:col-span-2 md:min-h-[190px] md:p-7' : ''}`}
      dir="rtl"
    >
      <span className={`absolute -left-10 -top-10 h-28 w-28 rounded-full ${tone} opacity-20 transition-transform duration-500 group-hover:scale-150`} />
      <div className="relative flex items-start justify-between gap-4">
        <span className={`grid h-11 w-11 place-items-center rounded-2xl ${tone} text-foreground shadow-sm`}>
          <Icon size={21} strokeWidth={1.8} />
        </span>
        <span className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background/70 text-muted-foreground transition-all group-hover:border-primary/35 group-hover:bg-primary group-hover:text-primary-foreground">
          <ArrowUpLeft size={15} />
        </span>
      </div>
      <div className="relative mt-auto pt-7">
        <p className="font-mono-app text-[9px] uppercase tracking-[.16em] text-primary">{eyebrow}</p>
        <h3 className={`${featured ? 'mt-2 text-lg' : 'mt-1.5 text-sm'} font-bold`}>{title}</h3>
        <p className="mt-2 max-w-[470px] text-[11px] leading-6 text-muted-foreground">{description}</p>
      </div>
    </a>
  );
}

export function ServicesCenter({ onBack }: ServicesCenterProps) {
  return (
    <main className="workspace-shell min-h-[100dvh] overflow-y-auto" dir="rtl">
      <div className="mx-auto w-full max-w-[1180px] px-4 py-5 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
        <header className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            data-testid="button-back-to-chats"
            className="group inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card/70 px-3 py-2.5 text-[11px] font-bold text-muted-foreground transition hover:border-primary/35 hover:bg-card hover:text-foreground"
          >
            <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
            العودة إلى المحادثات
          </button>
          <div className="flex items-center gap-2 text-left">
            <div className="hidden text-left sm:block">
              <p className="font-mono-app text-[9px] uppercase tracking-[.18em] text-primary">workspace / ٠٢</p>
              <p className="mt-1 text-[10px] text-muted-foreground">مركز الخدمات</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <LayoutGrid size={19} />
            </span>
          </div>
        </header>

        <section className="relative mt-8 overflow-hidden rounded-[30px] border border-border/80 bg-card p-6 soft-shadow sm:mt-10 sm:p-9 lg:p-11">
          <div className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 right-1/3 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_270px] lg:items-end">
            <div className="max-w-[700px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-[10px] font-bold text-primary">
                <Sparkles size={13} />
                مساحة العمل الموحدة
              </div>
              <h1 className="mt-5 max-w-[660px] text-[clamp(2rem,5vw,4.25rem)] font-bold leading-[1.18] tracking-[-.045em]">
                أدواتك الأكاديمية،
                <span className="block text-primary">في مكان واحد.</span>
              </h1>
              <p className="mt-5 max-w-[570px] text-xs leading-7 text-muted-foreground sm:text-sm">
                انتقل من المحادثة إلى الأداة المناسبة دون مغادرة مساحة العمل. خدمات جاهزة للبحث، التنسيق، وتحويل الملفات.
              </p>
            </div>
            <div className="rounded-[22px] border border-border/80 bg-background/65 p-4 backdrop-blur-sm" data-testid="status-services">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#7dbd8a]/15 text-[#4e9b65]">
                  <Check size={18} strokeWidth={2.5} />
                </span>
                <div>
                  <p className="text-xs font-bold">الخدمات متاحة</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">يمكنك بدء أي أداة الآن</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-border/70 pt-3 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-[#7dbd8a]" />
                <span>حالة الاتصال مستقرة</span>
                <span className="mr-auto font-mono-app text-[9px] text-primary">LIVE</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-9 sm:mt-12" aria-labelledby="services-title">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="font-mono-app text-[9px] uppercase tracking-[.18em] text-primary">available tools</p>
              <h2 id="services-title" className="mt-1.5 text-lg font-bold">اختر الخدمة التي تحتاجها</h2>
            </div>
            <p className="hidden text-[10px] text-muted-foreground sm:block">٧ خدمات متصلة بمساحة العمل</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <ServiceLink
              href="/legacy/"
              icon={WandSparkles}
              eyebrow="legacy surface"
              title="الخدمات الأساسية"
              description="افتح واجهة الخدمات الكاملة للوصول إلى الأدوات المتاحة في النظام القديم."
              tone="bg-accent"
              featured
            />
            <ServiceLink
              href="/academic"
              icon={GraduationCap}
              eyebrow="academic"
              title="المساعد الأكاديمي"
              description="نظّم رحلتك الأكاديمية من مساحة واحدة."
              tone="bg-primary/20"
            />
            <ServiceLink
              href="/link-finder"
              icon={Link2}
              eyebrow="research"
              title="باحث الروابط"
              description="ابحث عن الروابط والمصادر المرتبطة بعملك."
              tone="bg-[#b9d8d1]"
            />
            <ServiceLink
              href="/formatter?section=pdf2word"
              icon={FileText}
              eyebrow="convert / 01"
              title="PDF إلى Word"
              description="حوّل مستندات PDF إلى ملفات قابلة للتحرير."
              tone="bg-[#e5c7b2]"
            />
            <ServiceLink
              href="/formatter?section=html2word"
              icon={FileArchive}
              eyebrow="convert / 02"
              title="HTML إلى Word"
              description="حوّل محتوى HTML إلى مستند Word منسق."
              tone="bg-[#d5c8e5]"
            />
            <ServiceLink
              href="/formatter?section=html2excel"
              icon={FileSpreadsheet}
              eyebrow="convert / 03"
              title="HTML إلى Excel"
              description="استخرج الجداول والمحتوى إلى ملف Excel عملي."
              tone="bg-[#c4dbc1]"
            />
            <ServiceLink
              href="/formatter?section=html2ppt"
              icon={Presentation}
              eyebrow="convert / 04"
              title="HTML إلى PowerPoint"
              description="حوّل صفحات HTML إلى عرض تقديمي قابل للتعديل."
              tone="bg-[#e6cf9e]"
            />
          </div>
        </section>

        <footer className="mt-8 flex flex-col gap-3 border-t border-border/70 py-5 text-[10px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-primary" />
            <span>الخدمات مرتبطة بمساحة Telegram الحالية</span>
          </div>
          <a href="/legacy/" data-testid="link-services-legacy-footer" className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline">
            استعراض كل الخدمات
            <ArrowLeft size={13} />
          </a>
        </footer>
      </div>
    </main>
  );
}