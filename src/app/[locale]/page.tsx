// src/app/[locale]/page.tsx
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db/prisma";
import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, Users, Award, Clock, Star, Sparkles, ChevronRight, Package } from "lucide-react";
import CourseCard from "@/components/course/CourseCard";
import ProductCard from "@/components/product/ProductCard";
import ItemsGrid from "@/components/common/ItemsGrid";
import { cn } from "@/lib/utils/cn";
import { Suspense } from "react";
import { connection } from "next/server"; // اضافه کردن این import

// کامپوننت‌های جداگانه برای بخش‌های داینامیک (با await connection())
async function StatsSection({ locale }: { locale: string }) {
  await connection(); // این خط ارور new Date() داخلی Prisma رو حل می‌کنه

  const t = await getTranslations({ locale, namespace: "home" });

  const stats = await prisma.$queryRaw`
    SELECT
      (SELECT COUNT(*) FROM "Course" WHERE status = 'PUBLISHED' AND "isVisible" = true AND "isSaleEnabled" = true) AS courses,
      (SELECT COUNT(*) FROM "Enrollment") AS students,
      (SELECT COUNT(*) FROM "UserRole" WHERE role = 'INSTRUCTOR') AS instructors,
      (SELECT COALESCE(AVG(rating), 0) FROM "Review") AS avg_rating
  `;

  const { courses = 0, students = 0, instructors = 0, avg_rating = 0 } = stats as any;

  return (
    <section className="container mx-auto px-6 py-32">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
        <div className="text-center">
          <p className="text-8xl font-black text-primary">{Number(courses) + 0}+</p>
          <p className="text-3xl text-foreground/70 mt-4">{t("courses") || "دوره فعال"}</p>
        </div>
        <div className="text-center">
          <p className="text-8xl font-black text-secondary">{Number(students) + 0}+</p>
          <p className="text-3xl text-foreground/70 mt-4">{t("students") || "دانشجو"}</p>
        </div>
        <div className="text-center">
          <p className="text-8xl font-black text-emerald-600">{Number(instructors) + 0}+</p>
          <p className="text-3xl text-foreground/70 mt-4">{t("instructors") || "استاد برجسته"}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-4">
            <Star size={80} className="text-yellow-500 fill-yellow-500" />
            <p className="text-8xl font-black text-yellow-500">{Number(avg_rating).toFixed(1)}</p>
          </div>
          <p className="text-3xl text-foreground/70 mt-4">{t("rating") || "امتیاز میانگین"}</p>
        </div>
      </div>
    </section>
  );
}

async function RecentCoursesSection({ locale }: { locale: string }) {
  await connection(); // همینجا هم اضافه کن

  const t = await getTranslations({ locale, namespace: "home" });

  const recentCourses = await prisma.course.findMany({
    where: { status: "PUBLISHED", isVisible: true, isSaleEnabled: true },
    include: {
      instructor: { select: { name: true } },
      _count: { select: { enrollments: true, reviews: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return (
    <ItemsGrid
      title={t("recent_courses") || "دوره‌های جدید و محبوب"}
      subtitle={t("recent_subtitle") || "به‌روزترین دوره‌های دندانپزشکی با محتوای حرفه‌ای"}
      className="mb-32"
    >
      {recentCourses.map((course) => (
        <CourseCard
          key={course.id}
          id={course.id}
          title={course.title}
          image={course.image ?? undefined}
          price={course.price as any}
          reviewsCount={course._count.reviews}
          students={course._count.enrollments}
          instructor={course.instructor.name}
          duration={course.duration || t("unknown") || "نامشخص"}
        />
      ))}
    </ItemsGrid>
  );
}

async function TopProductsSection({ locale }: { locale: string }) {
  await connection(); // و اینجا هم

  const t = await getTranslations({ locale, namespace: "home" });

  const topProducts = await prisma.product.findMany({
    where: { isActive: true, isVisible: true },
    include: {
      _count: { select: { reviews: true, orderItems: true } },
    },
    orderBy: { orderItems: { _count: "desc" } },
    take: 8,
  });

  return (
    <ItemsGrid
      title={t("top_products") || "محصولات پرفروش"}
      subtitle={t("top_subtitle") || "تجهیزات اورجینال دندانپزشکی با ضمانت اصالت"}
      className="mb-32"
    >
      {topProducts.map((product) => (
        <ProductCard
          key={product.id}
          id={product.id}
          title={product.title}
          slug={product.slug}
          price={product.price as any}
          image={product.image ?? undefined}
          stock={product.stock}
          brand={product.brand || undefined}
          reviewsCount={product._count.reviews}
          discountPercent={product.discountPercent ?? 0}
        />
      ))}
    </ItemsGrid>
  );
}

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return {
    title: t("title") || "روم آکادمی | بهترین پلتفرم آموزش آنلاین دندانپزشکی",
    description: t("description") || "دوره‌های حرفه‌ای دندانپزشکی با اساتید برتر، تجهیزات اورجینال و گواهی معتبر",
    openGraph: {
      title: t("title") || "روم آکادمی",
      description: t("description") || "آموزش آنلاین دندانپزشکی با کیفیت جهانی",
      url: `https://rom.ir/${locale}`,
      images: ["/hero-home.jpg"],
    },
    alternates: {
      canonical: "/",
      languages: {
        fa: "/fa",
        en: "/en",
        ru: "/ru",
      },
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  const isRTL = locale === "fa";

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-secondary to-pink-900 py-32 md:py-48">
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative container mx-auto px-6 text-center text-white">
          <h1 className="text-6xl md:text-9xl font-black mb-12 leading-tight">
            {t("hero_title") || "روم آکادمی"}
            <br />
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              {t("hero_subtitle") || "آینده دندانپزشکی ایران"}
            </span>
          </h1>
          <p className="text-3xl md:text-5xl mb-20 max-w-5xl mx-auto opacity-90">
            {t("hero_desc") || "دوره‌های حرفه‌ای با اساتید برتر، تجهیزات اورجینال و گواهی معتبر — همه در یک پلتفرم"}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-12">
            <Link
              href="/courses"
              className="group inline-flex items-center gap-8 bg-white text-primary px-20 py-12 rounded-full text-5xl font-black shadow-3xl hover:scale-110 transition-all"
            >
              <BookOpen size={64} />
              {t("explore_courses") || "کاوش دوره‌ها"}
              <ChevronRight size={48} className={cn("group-hover:translate-x-4 transition", isRTL && "rotate-180")} />
            </Link>
            <Link
              href="/products"
              className="group inline-flex items-center gap-8 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-20 py-12 rounded-full text-5xl font-black shadow-3xl hover:scale-110 transition-all"
            >
              <Package size={64} />
              {t("shop_products") || "فروشگاه تجهیزات"}
              <ChevronRight size={48} className={cn("group-hover:translate-x-4 transition", isRTL && "rotate-180")} />
            </Link>
          </div>
        </div>
      </section>

      {/* آمار سریع */}
      <Suspense fallback={<div className="container mx-auto px-6 py-32"><p className="text-center text-4xl opacity-70">در حال بارگذاری آمار...</p></div>}>
        <StatsSection locale={locale} />
      </Suspense>

      {/* دوره‌های اخیر */}
      <Suspense fallback={<div className="container mx-auto px-6 py-32"><p className="text-center text-4xl opacity-70">در حال بارگذاری دوره‌ها...</p></div>}>
        <RecentCoursesSection locale={locale} />
      </Suspense>

      {/* محصولات پرفروش */}
      <Suspense fallback={<div className="container mx-auto px-6 py-32"><p className="text-center text-4xl opacity-70">در حال بارگذاری محصولات...</p></div>}>
        <TopProductsSection locale={locale} />
      </Suspense>

      {/* ویژگی‌ها */}
      <section className="container mx-auto px-6 py-32">
        <h2 className="text-7xl md:text-9xl font-black text-center mb-24 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {t("why_us") || "چرا روم آکادمی؟"}
        </h2>
        <div className="grid md:grid-cols-3 gap-16">
          <div className="bg-card/90 backdrop-blur-2xl rounded-4xl p-16 shadow-3xl border border-border/50 text-center">
            <Award size={120} className="mx-auto mb-12 text-emerald-600" />
            <h3 className="text-5xl font-black mb-8">{t("certified") || "گواهی معتبر"}</h3>
            <p className="text-2xl text-foreground/70">
              {t("certified_desc") || "گواهی پایان دوره مورد تأیید دانشگاه‌ها و انجمن‌های دندانپزشکی"}
            </p>
          </div>
          <div className="bg-card/90 backdrop-blur-2xl rounded-4xl p-16 shadow-3xl border border-border/50 text-center">
            <Users size={120} className="mx-auto mb-12 text-primary" />
            <h3 className="text-5xl font-black mb-8">{t("expert_instructors") || "اساتید برتر"}</h3>
            <p className="text-2xl text-foreground/70">
              {t("expert_desc") || "یادگیری از متخصصان با تجربه واقعی در کلینیک و دانشگاه"}
            </p>
          </div>
          <div className="bg-card/90 backdrop-blur-2xl rounded-4xl p-16 shadow-3xl border border-border/50 text-center">
            <Sparkles size={120} className="mx-auto mb-12 text-yellow-500" />
            <h3 className="text-5xl font-black mb-8">{t("practical") || "کاملاً عملی"}</h3>
            <p className="text-2xl text-foreground/70">
              {t("practical_desc") || "تمرکز روی مهارت‌های واقعی که در مطب نیاز دارید"}
            </p>
          </div>
        </div>
      </section>

      {/* CTA نهایی */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary to-secondary py-32">
        <div className="container mx-auto px-6 text-center text-white">
          <h2 className="text-7xl md:text-9xl font-black mb-12">
            {t("cta_title") || "همین حالا شروع کنید"}
          </h2>
          <p className="text-4xl mb-20 max-w-4xl mx-auto opacity-90">
            {t("cta_desc") || "به جامعه بزرگ دندانپزشکان روم بپیوندید و آینده حرفه‌ای خود را بسازید"}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-12">
            <Link
              href="/courses"
              className="inline-flex items-center gap-8 bg-white text-primary px-32 py-16 rounded-full text-6xl font-black shadow-3xl hover:scale-110 transition-all"
            >
              {t("start_learning") || "شروع یادگیری"}
              <ChevronRight size={64} className={cn(isRTL && "rotate-180")} />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-8 bg-white/20 backdrop-blur-xl text-white px-32 py-16 rounded-full text-6xl font-black shadow-3xl hover:bg-white/30 transition-all"
            >
              {t("contact_us") || "تماس با ما"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}