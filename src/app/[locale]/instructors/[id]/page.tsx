// src/app/[locale]/instructors/[id]/page.tsx
import { getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Star, Users, BookOpen, Instagram, Globe, Award, Plus } from "lucide-react";
import AddToCartButton from "@/components/common/AddToCartButton";
import LikeButton from "@/components/common/LikeButton";
import { cn } from "@/lib/utils/cn";

type Props = {
  params: { id: string; locale: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, locale } = params;
  const t = await getTranslations({ locale, namespace: "instructor" });

  const instructor = await prisma.user.findUnique({
    where: { id },
    select: { name: true, bio: true, image: true },
  });

  if (!instructor) {
    return { title: t("not_found") || "مدرس یافت نشد" };
  }

  return {
    title: `${instructor.name} | مدرس روم آکادمی`,
    description: instructor.bio || t("instructor_desc") || "مدرس تخصصی دندانپزشکی در روم آکادمی",
    openGraph: {
      title: instructor.name,
      description: instructor.bio || "",
      url: `https://rom.ir/${locale}/instructors/${id}`,
      images: [instructor.image || "/avatar.jpg"],
    },
    alternates: {
      canonical: `/instructors/${id}`,
      languages: {
        fa: `/fa/instructors/${id}`,
        en: `/en/instructors/${id}`,
        ru: `/ru/instructors/${id}`,
      },
    },
  };
}

export default async function InstructorDetailPage({ params }: Props) {
  const { id, locale } = params;
  const t = await getTranslations({ locale, namespace: "instructor" });
  const isRTL = locale === "fa";

  const session = await getServerSession(authOptions);

  const instructor = await prisma.user.findUnique({
    where: { id },
    include: {
      taughtCourses: {
        where: { status: "PUBLISHED", isVisible: true, isSaleEnabled: true },
        include: {
          _count: { select: { enrollments: true, reviews: true, likes: true } },
          reviews: { select: { rating: true } },
          likes: session?.user?.id
            ? { where: { userId: session.user.id }, select: { id: true } }
            : false,
        },
        orderBy: { createdAt: "desc" },
      },
      roles: true,
    },
  });

  // چک نقش INSTRUCTOR — درست: r.role
  if (!instructor || !instructor.roles.some((r) => r.role === "INSTRUCTOR")) {
    notFound();
  }

  const totalCourses = instructor.taughtCourses.length;
  const totalStudents = instructor.taughtCourses.reduce((sum, c) => sum + c._count.enrollments, 0);
  const totalReviews = instructor.taughtCourses.reduce((sum, c) => sum + c._count.reviews, 0);
  const avgRating =
    totalReviews > 0
      ? Number(
          (instructor.taughtCourses.reduce(
            (sum, c) =>
              sum +
              (c.reviews.reduce((rSum, r) => rSum + r.rating, 0) / (c.reviews.length || 1)),
            0
          ) / totalCourses).toFixed(1)
        )
      : 0;

  // چک مجوز ادمین — درست: r.role
  const isAuthorized =
    session?.user?.id === instructor.id ||
    session?.user?.roles?.some((r) => ["ADMIN", "SUPERADMIN"].includes(r.role));

  return (
    <>
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary via-secondary to-pink-900 text-white py-32 overflow-hidden">
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative max-w-7xl mx-auto px-8 text-center">
          <div className="mb-12">
            <Image
              src={instructor.image || "/avatar.jpg"}
              alt={instructor.name || "مدرس"}
              width={280}
              height={280}
              className="mx-auto rounded-full ring-8 ring-white/30 shadow-2xl"
              priority
            />
          </div>
          <h1 className="text-6xl md:text-8xl font-black mb-6">{instructor.name}</h1>
          <p className="text-3xl md:text-5xl mb-8 opacity-90">{t("specialty") || "مدرس تخصصی دندانپزشکی"}</p>
          <div className="flex items-center justify-center gap-12 text-2xl md:text-3xl">
            <div className="flex items-center gap-4">
              <Star className="text-yellow-400" size={48} />
              <div>
                <p className="font-black">{avgRating}</p>
                <p className="text-white/80">{t("rating") || "امتیاز"}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Users className="text-emerald-400" size={48} />
              <div>
                <p className="font-black">{totalStudents.toLocaleString("fa-IR")}</p>
                <p className="text-white/80">{t("students") || "دانشجو"}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <BookOpen className="text-pink-400" size={48} />
              <div>
                <p className="font-black">{totalCourses}</p>
                <p className="text-white/80">{t("courses") || "دوره"}</p>
              </div>
            </div>
          </div>
          {instructor.instagram && (
            <a
              href={`https://instagram.com/${instructor.instagram.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-4 mt-12 bg-white/20 backdrop-blur-xl px-12 py-6 rounded-full text-3xl font-black hover:bg-white/30 transition"
            >
              <Instagram size={48} />
              @{instructor.instagram.replace("@", "")}
            </a>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-20">
        {/* بیوگرافی */}
        {instructor.bio && (
          <div className="bg-card rounded-3xl shadow-2xl p-16 mb-20 border border-border/50">
            <h2 className="text-5xl font-black mb-12 text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {t("bio") || "بیوگرافی"}
            </h2>
            <div className="prose prose-xl max-w-none text-foreground leading-relaxed text-center text-2xl">
              <p>{instructor.bio}</p>
            </div>
          </div>
        )}

        {/* دوره‌های استاد */}
        <div className="mb-20">
          <div className="flex items-center justify-between mb-16">
            <h2 className="text-5xl md:text-7xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {t("courses_by") || "دوره‌های"} {instructor.name}
            </h2>
            {isAuthorized && (
              <Link
                href={`/admin/courses/create?instructorId=${instructor.id}`}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-10 py-6 rounded-full text-3xl font-black hover:scale-110 transition shadow-2xl flex items-center gap-4"
              >
                <Plus size={40} />
                {t("add_course") || "افزودن دوره جدید"}
              </Link>
            )}
          </div>

          {totalCourses === 0 ? (
            <div className="text-center py-32 bg-card/80 rounded-3xl border border-border/50">
              <Award size={120} className="mx-auto mb-8 text-muted-foreground" />
              <p className="text-4xl text-muted-foreground">{t("no_courses") || "هنوز دوره‌ای منتشر نشده است"}</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
              {instructor.taughtCourses.map((course) => {
                const isLiked = Array.isArray(course.likes) && course.likes.length > 0;
                const courseAvgRating =
                  course.reviews.length > 0
                    ? (course.reviews.reduce((s, r) => s + r.rating, 0) / course.reviews.length).toFixed(1)
                    : "0.0";

                return (
                  <div
                    key={course.id}
                    className="group bg-card rounded-3xl shadow-xl overflow-hidden hover:shadow-3xl transition-all duration-500 border border-border/50 hover:border-primary"
                  >
                    <div className="relative aspect-video overflow-hidden">
                      <Image
                        src={course.image || "/placeholder.jpg"}
                        alt={course.title}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
                      <div className={cn("absolute top-6 z-10", isRTL ? "left-6" : "right-6", "opacity-0 group-hover:opacity-100 transition")}>
                        <LikeButton id={course.id} type="course" initialLiked={isLiked} />
                      </div>
                      {course.type === "LIVE" && (
                        <div className={cn("absolute top-6 z-10", isRTL ? "right-6" : "left-6")}>
                          <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-6 py-3 rounded-full text-xl font-black animate-pulse flex items-center gap-3 shadow-2xl">
                            <span className="w-3 h-3 bg-white rounded-full animate-ping" />
                            {t("live") || "لایو"}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-10 space-y-6">
                      <h3 className="text-3xl font-black mb-6 line-clamp-2">{course.title}</h3>
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                          <Users className="text-primary" size={32} />
                          <span className="text-2xl font-bold">
                            {course._count.enrollments.toLocaleString("fa-IR")} {t("students") || "دانشجو"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Star className="text-yellow-500" size={32} />
                          <span className="text-2xl font-bold">{courseAvgRating}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-4xl font-black text-success">
                          {(course.price as any)?.IRR?.toLocaleString("fa-IR") || 0} {t("toman") || "تومان"}
                        </p>
                        <AddToCartButton courseId={course.id} className="px-8 py-4 text-xl" />
                      </div>
                      <Link
                        href={`/courses/${course.id}`}
                        className="block mt-8 text-center bg-muted text-foreground px-10 py-6 rounded-full text-2xl font-black hover:bg-accent transition"
                      >
                        {t("view_course") || "مشاهده دوره"}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* دکمه بازگشت */}
        <div className="text-center mt-20">
          <Link
            href="/instructors"
            className="inline-flex items-center gap-6 bg-gradient-to-r from-primary to-secondary text-white px-16 py-8 rounded-full text-3xl font-black hover:scale-110 transition shadow-2xl"
          >
            <Globe size={48} />
            {t("back_to_instructors") || "بازگشت به لیست اساتید"}
          </Link>
        </div>
      </div>
    </>
  );
}