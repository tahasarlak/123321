// src/app/[locale]/courses/[id]/page.tsx
import { getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import UniversalGallery from "@/components/common/UniversalGallery";
import DetailHeader from "@/components/common/DetailHeader";
import PriceBox from "@/components/price/PriceBox";
import ActionButton from "@/components/common/ActionButton";
import ShareButton from "@/components/common/ShareButton";
import ReadMore from "@/components/ui/ReadMore";
import ItemsGrid from "@/components/common/ItemsGrid";
import ReviewSection from "@/components/review/ReviewSection";
import CourseCard from "@/components/course/CourseCard";
import { Package, Calendar, Clock, PlayCircle } from "lucide-react";

type Props = {
  params: Promise<{ id: string; locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, locale } = await params;
  const t = await getTranslations({ locale, namespace: "course" });

  const course = await prisma.course.findUnique({
    where: { id },
    select: { title: true, shortDescription: true, image: true },
  });

  if (!course) return { title: t("not_found") || "دوره یافت نشد" };

  return {
    title: course.title,
    description: course.shortDescription || "",
    openGraph: {
      title: course.title,
      description: course.shortDescription || "",
      url: `https://rom.ir/${locale}/courses/${id}`,
      images: [course.image || "/placeholder-course.jpg"],
      type: "website",
    },
    alternates: {
      canonical: `/courses/${id}`,
      languages: { fa: `/fa/courses/${id}`, en: `/en/courses/${id}`, ru: `/ru/courses/${id}` },
    },
  };
}

export default async function CourseDetailPage({ params }: Props) {
  const { id, locale } = await params;
  const t = await getTranslations({ locale, namespace: "course" });
  const session = await getServerSession(authOptions);

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      instructor: { select: { id: true, name: true, image: true, bio: true } },
      categories: true,
      tags: true,
      reviews: {
        include: { user: { select: { name: true, image: true } } },
        orderBy: { createdAt: "desc" },
      },
      likes: session?.user?.id
        ? { where: { userId: session.user.id }, select: { id: true } }
        : false,
      lessons: {
        orderBy: { order: "asc" },
        select: { id: true, title: true, duration: true, isFree: true },
      },
      _count: { select: { reviews: true, likes: true, enrollments: true } },
    },
  });

  if (!course || course.status !== "PUBLISHED" || !course.isSaleEnabled) notFound();

  const enrolledCount = course._count.enrollments;

  const isEnrolled = session
    ? await prisma.enrollment.findFirst({
        where: { userId: session.user.id, courseId: course.id, status: "APPROVED" },
      })
    : null;

  const isLiked = Array.isArray(course.likes) && course.likes.length > 0;

  const avgRating =
    course.reviews.length > 0
      ? Number((course.reviews.reduce((sum, r) => sum + r.rating, 0) / course.reviews.length).toFixed(1))
      : 0;

  const price = (course.price as any)?.IRR || 0;
  const discountPercent = course.discountPercent || 0;
  const finalPrice = discountPercent > 0 ? Math.round(price * (1 - discountPercent / 100)) : price;
  const hasDiscount = discountPercent > 0;

  const relatedCourses = await prisma.course.findMany({
    where: {
      status: "PUBLISHED",
      isSaleEnabled: true,
      OR: [
        { categories: { some: { id: { in: course.categories.map((c) => c.id) } } } },
        { tags: { some: { id: { in: course.tags.map((t) => t.id) } } } },
      ],
      NOT: { id: course.id },
    },
    include: {
      instructor: { select: { name: true } },
      _count: { select: { reviews: true, enrollments: true, likes: true } },
      likes: session?.user?.id
        ? { where: { userId: session.user.id }, select: { id: true } }
        : false,
    },
    take: 8,
  });

  const galleryImages: string[] = [
    ...(course.image ? [course.image] : []),
    ...(Array.isArray(course.gallery)
      ? course.gallery.filter((item): item is string => typeof item === "string")
      : []),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Course",
            name: course.title,
            description: course.shortDescription || "",
            provider: { "@type": "Organization", name: "روم آکادمی" },
            image: course.image || "/placeholder-course.jpg",
            offers: { "@type": "Offer", price: finalPrice, priceCurrency: "IRR" },
          }),
        }}
      />

      {isEnrolled && (
        <section className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white py-32">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <h1 className="text-6xl md:text-9xl font-black mb-6 leading-tight">
              {t("enrolled_welcome") || "تبریک! به دوره خوش آمدید"}
            </h1>
            <div className="flex justify-center gap-10 mt-16 flex-wrap">
              <Link
                href={`/my-courses/${course.id}`}
                className="group flex items-center gap-6 bg-white text-emerald-600 px-20 py-12 rounded-3xl text-4xl md:text-5xl font-black hover:scale-105 transition-all shadow-2xl"
              >
                <PlayCircle size={80} className="group-hover:animate-pulse" />
                {t("continue_learning") || "ادامه یادگیری"}
              </Link>
            </div>
          </div>
        </section>
      )}

      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex items-center gap-3 text-lg text-gray-600 mb-12">
            <Link href="/" className="hover:text-indigo-600 transition">{t("home") || "خانه"}</Link>
            <span>→</span>
            <Link href="/courses" className="hover:text-indigo-600 transition">{t("courses") || "دوره‌ها"}</Link>
            <span>→</span>
            <span className="text-indigo-600 font-bold">{course.title}</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div className="sticky top-24 z-10">
              <UniversalGallery
                images={galleryImages}
                discountBadge={hasDiscount ? { type: "PERCENTAGE", value: discountPercent } : undefined}
                likeId={course.id}
                likeType="course"
                initialLiked={isLiked}
              />
            </div>

            <article className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
              <div className="p-10 space-y-14">
                <DetailHeader
                  title={course.title}
                  rating={avgRating}
                  reviewsCount={course._count.reviews}
                  items={[
                    { label: t("instructor") || "مدرس", value: course.instructor.name, color: "indigo" },
                    { label: t("duration") || "مدت دوره", value: course.duration || t("unknown") || "نامشخص", color: "emerald" },
                    { label: t("students") || "دانشجو", value: `${enrolledCount.toLocaleString("fa-IR")} نفر`, color: "blue" },
                    { label: t("language") || "زبان", value: "فارسی", color: "cyan" },
                    course.startDate && {
                      label: t("start_date") || "شروع",
                      value: new Date(course.startDate).toLocaleDateString("fa-IR"),
                      color: "purple",
                    },
                  ].filter(Boolean) as any}
                  tags={course.tags.map((tag) => ({ id: tag.id, name: tag.name }))}
                />

                <PriceBox price={Math.round(finalPrice)} discountPercent={discountPercent} size="xl" className="my-8" />

                {course.startDate && (
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-3xl p-10 text-center">
                    <Calendar size={64} className="mx-auto text-emerald-600 mb-4" />
                    <p className="text-3xl font-bold text-gray-700">{t("course_start") || "شروع دوره"}</p>
                    <p className="text-5xl font-black text-emerald-600">
                      {new Date(course.startDate).toLocaleDateString("fa-IR")}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-6">
                  {isEnrolled ? (
                    <Link
                      href={`/my-courses/${course.id}`}
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-10 rounded-full text-4xl font-black hover:scale-105 transition-all shadow-2xl text-center"
                    >
                      {t("continue_learning") || "ادامه یادگیری"}
                    </Link>
                  ) : (
                    <ActionButton type="enroll" className="flex-1 text-4xl py-10" />
                  )}
                  <ShareButton size="lg" title={course.title} />
                </div>

                <section className="bg-gray-50 rounded-3xl p-10 border border-gray-200">
                  <h2 className="text-4xl font-black mb-8 text-gray-800">{t("about_course") || "درباره این دوره"}</h2>
                  <ReadMore maxHeight={280}>
                    {course.description || t("no_description") || "توضیحات به‌زودی اضافه می‌شود..."}
                  </ReadMore>
                </section>
              </div>
            </article>
          </div>

          {course.lessons.length > 0 && (
            <section className="mt-32 bg-white rounded-3xl shadow-2xl p-12 border border-gray-100">
              <h2 className="text-5xl md:text-6xl font-black text-center mb-16 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {t("lessons_title") || "سرفصل‌های دوره"} ({course.lessons.length} {t("lesson") || "درس"})
              </h2>
              <div className="space-y-6">
                {course.lessons.map((lesson, i) => (
                  <div
                    key={lesson.id}
                    className="group flex items-center justify-between p-8 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200 hover:shadow-xl hover:-translate-y-1 transition-all"
                  >
                    <div className="flex items-center gap-8">
                      <div className="text-5xl font-black text-indigo-600 group-hover:scale-110 transition">
                        {(i + 1).toString().padStart(2, "0")}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-800">{lesson.title}</h3>
                        {lesson.duration && (
                          <p className="text-gray-600 mt-2 flex items-center gap-2">
                            <Clock size={20} /> {lesson.duration} {t("minutes") || "دقیقه"}
                          </p>
                        )}
                      </div>
                    </div>
                    {lesson.isFree && (
                      <span className="bg-emerald-100 text-emerald-700 px-8 py-4 rounded-full font-bold text-lg animate-pulse">
                        {t("free_preview") || "پیش‌نمایش رایگان"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <ReviewSection
            reviews={course.reviews.map((r) => ({
              id: r.id,
              rating: r.rating,
              comment: r.comment,
              createdAt: r.createdAt,
              user: { name: r.user.name || "ناشناس", image: r.user.image ?? undefined },
            }))}
            averageRating={avgRating}
            totalReviews={course._count.reviews}
            entityId={course.id}
            entityType="course"
          />

          {relatedCourses.length > 0 && (
            <ItemsGrid title={t("related_courses") || "دوره‌های مشابه"} className="mt-32">
              {relatedCourses.map((c) => (
                <CourseCard
                  key={c.id}
                  id={c.id}
                  title={c.title}
                  image={c.image ?? undefined}
                  price={c.price as any}
                  // discountPercent حذف شد
                  reviewsCount={c._count.reviews}
                  students={c._count.enrollments}
                  isLiked={Array.isArray(c.likes) && c.likes.length > 0}
                  duration={c.duration || t("unknown") || "نامشخص"}
                  instructor={c.instructor.name}
                />
              ))}
            </ItemsGrid>
          )}

          <div className="text-center mt-32">
            <Link
              href="/courses"
              className="inline-flex items-center gap-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-20 py-10 rounded-full text-4xl font-black hover:scale-110 transition-all shadow-3xl"
            >
              <Package size={56} />
              {t("back_to_courses") || "بازگشت به همه دوره‌ها"}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}