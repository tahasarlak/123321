// src/app/[locale]/profile/page.tsx
import { getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns-jalali";
import {
  BookOpen,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Calendar,
  Award,
  Clock,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  PlayCircle,
  Users,
  Download,
  Edit3,
  Eye,
  Star,
} from "lucide-react";

type Props = {
  params: { locale: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "profile" });

  return {
    title: t("profile_title") || "پروفایل | روم آکادمی",
    description: t("profile_desc") || "پروفایل شخصی و فعالیت‌های شما در روم آکادمی",
  };
}

export default async function ProfilePage({ params }: Props) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "profile" });
  const isRTL = locale === "fa";

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth");
  }

  const userId = session.user.id;

  const userRoles = session.user.roles || [];
  const isInstructor = userRoles.some((r: any) => r.role === "INSTRUCTOR");
  const isAdmin = userRoles.some((r: any) => ["ADMIN", "SUPERADMIN"].includes(r.role));

  const [
    user,
    enrolledCount,
    cartCount,
    totalSpentAgg,
    instructorRevenueAgg,
    certCount,
    recentEnrollments,
    taughtCourses,
    certificates,
    activities,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        phone: true,
        city: true,
        createdAt: true,
        gender: true,
      },
    }),
    prisma.enrollment.count({ where: { userId } }),
    prisma.cartItem.count({ where: { cart: { userId } } }),
    prisma.payment.aggregate({
      where: { order: { userId }, status: "PAID" },
      _sum: { amount: true },
    }),
    isInstructor
      ? prisma.payment.aggregate({
          where: {
            order: {
              items: { some: { course: { instructorId: userId } } },
              status: "PAID",
            },
          },
          _sum: { amount: true },
        })
      : { _sum: { amount: 0 } },
    prisma.certificate.count({ where: { userId } }),
    prisma.enrollment.findMany({
      where: { userId },
      select: {
        id: true,
        progress: true,
        enrolledAt: true,
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            image: true,
            duration: true,
            instructor: { select: { name: true } },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
      take: 8,
    }),
    isInstructor
      ? prisma.course.findMany({
          where: { instructorId: userId },
          select: {
            id: true,
            title: true,
            slug: true,
            image: true,
            _count: { select: { enrollments: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 6,
        })
      : [],
    prisma.certificate.findMany({
      where: { userId },
      include: { course: { select: { title: true, image: true } } },
      orderBy: { issuedAt: "desc" },
    }),
    prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  if (!user) redirect("/auth");

  const totalSpent = totalSpentAgg?._sum?.amount || 0;
  const instructorRevenue = instructorRevenueAgg?._sum?.amount || 0;

  return (
    <div className="container mx-auto px-6 py-32 max-w-7xl">
      {/* هدر لوکس پروفایل */}
      <div className="relative overflow-hidden rounded-4xl shadow-5xl mb-32 bg-gradient-to-br from-primary/20 via-secondary/20 to-pink-600/20">
        <div className="absolute inset-0 backdrop-blur-3xl bg-white/70 dark:bg-black/70" />
        <div className="relative p-20 md:p-32 text-center">
          <div className="inline-block relative mb-16">
            <Image
              src={user.image || "/avatar.jpg"}
              alt={user.name || "کاربر"}
              width={360}
              height={360}
              className="rounded-full ring-16 ring-white/60 shadow-4xl object-cover border-8 border-white/30"
              priority
            />
            <div className="absolute bottom-0 right-0 bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-8 rounded-full shadow-3xl animate-pulse">
              <CheckCircle size={64} />
            </div>
          </div>
          <h1 className="text-8xl md:text-9xl font-black bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent mb-8">
            {user.name || "کاربر عزیز"}
          </h1>
          <div className="flex items-center justify-center gap-8 text-5xl font-bold text-foreground/80 mb-12">
            <span className="px-12 py-6 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-full">
              {isAdmin ? t("admin") || "مدیر سیستم" : isInstructor ? t("instructor") || "استاد برجسته" : t("student") || "دانشجوی فعال"}
            </span>
          </div>
          {user.bio && (
            <p className="text-5xl md:text-6xl text-foreground/70 italic max-w-5xl mx-auto leading-relaxed px-16">
              “{user.bio}”
            </p>
          )}
        </div>
      </div>

      {/* کارت‌های آماری */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-12 mb-32">
        <div className="bg-card/90 backdrop-blur-2xl rounded-4xl shadow-3xl p-12 text-center border border-primary/20">
          <BookOpen size={80} className="mx-auto mb-8 text-primary" />
          <p className="text-4xl font-black text-foreground mb-4">{t("courses") || "دوره‌ها"}</p>
          <p className="text-8xl font-black text-primary">{enrolledCount}</p>
        </div>
        <div className="bg-card/90 backdrop-blur-2xl rounded-4xl shadow-3xl p-12 text-center border border-secondary/20">
          <ShoppingCart size={80} className="mx-auto mb-8 text-secondary" />
          <p className="text-4xl font-black text-foreground mb-4">{t("cart") || "سبد خرید"}</p>
          <p className="text-8xl font-black text-secondary">{cartCount}</p>
        </div>
        <div className="bg-card/90 backdrop-blur-2xl rounded-4xl shadow-3xl p-12 text-center border border-success/20">
          <DollarSign size={80} className="mx-auto mb-8 text-success" />
          <p className="text-4xl font-black text-foreground mb-4">{t("spent") || "مبلغ پرداختی"}</p>
          <p className="text-7xl font-black text-success">{totalSpent.toLocaleString("fa-IR")}</p>
          <p className="text-3xl text-muted-foreground mt-2">{t("toman") || "تومان"}</p>
        </div>
        {isInstructor && (
          <div className="bg-card/90 backdrop-blur-2xl rounded-4xl shadow-3xl p-12 text-center border border-orange-500/20">
            <TrendingUp size={80} className="mx-auto mb-8 text-orange-600" />
            <p className="text-4xl font-black text-foreground mb-4">{t("revenue") || "درآمد"}</p>
            <p className="text-7xl font-black text-orange-600">{instructorRevenue.toLocaleString("fa-IR")}</p>
            <p className="text-3xl text-muted-foreground mt-2">{t("toman") || "تومان"}</p>
          </div>
        )}
        <div className="bg-card/90 backdrop-blur-2xl rounded-4xl shadow-3xl p-12 text-center border border-teal-500/20">
          <Award size={80} className="mx-auto mb-8 text-teal-600" />
          <p className="text-4xl font-black text-foreground mb-4">{t("certificates") || "گواهی"}</p>
          <p className="text-8xl font-black text-teal-600">{certCount}</p>
        </div>
        <div className="bg-card/90 backdrop-blur-2xl rounded-4xl shadow-3xl p-12 text-center border border-pink-500/20">
          <Calendar size={80} className="mx-auto mb-8 text-pink-600" />
          <p className="text-4xl font-black text-foreground mb-4">{t("member_since") || "عضو از"}</p>
          <p className="text-6xl font-black text-pink-600">
            {user.createdAt ? format(new Date(user.createdAt), "yyyy/MM/dd") : "-"}
          </p>
        </div>
      </div>

      {/* دوره‌های در حال مطالعه */}
      <div className="grid lg:grid-cols-2 gap-20 mb-32">
        <div className="bg-card/90 backdrop-blur-2xl rounded-4xl p-20 shadow-4xl border border-primary/20">
          <h3 className="text-7xl font-black mb-16 flex items-center gap-12 text-foreground">
            <PlayCircle size={80} className="text-primary" />
            {t("my_courses") || "دوره‌های در حال مطالعه"}
          </h3>
          {recentEnrollments.length > 0 ? (
            <div className="space-y-12">
              {recentEnrollments.map((enrollment) => (
                <Link
                  key={enrollment.id}
                  href={`/my-courses/${enrollment.course.slug || enrollment.course.id}`}
                  className="flex items-center gap-12 bg-gradient-to-r from-primary/10 to-secondary/10 p-12 rounded-3xl hover:scale-105 transition-all shadow-lg group"
                >
                  <Image
                    src={enrollment.course.image || "/course-placeholder.jpg"}
                    alt={enrollment.course.title}
                    width={140}
                    height={140}
                    className="rounded-2xl shadow-xl group-hover:scale-110 transition"
                  />
                  <div className="flex-1">
                    <h4 className="text-4xl font-black text-foreground">{enrollment.course.title}</h4>
                    <p className="text-3xl text-muted-foreground mt-6 mb-4">
                      {t("instructor") || "مدرس"}: {enrollment.course.instructor.name}
                    </p>
                    <div className="flex items-center gap-8">
                      <div className="text-3xl font-bold text-primary">
                        {t("progress") || "پیشرفت"}: {enrollment.progress || 0}%
                      </div>
                      {enrollment.progress === 100 && <CheckCircle className="text-success" size={48} />}
                    </div>
                    <div className="mt-4 bg-muted/30 rounded-full h-8 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-1000"
                        style={{ width: `${enrollment.progress || 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-primary to-secondary text-white px-12 py-6 rounded-2xl font-black text-3xl hover:scale-110 transition shadow-2xl">
                    {t("continue") || "ادامه"}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-5xl text-muted-foreground text-center py-20">{t("no_enrollments") || "هنوز دوره‌ای ثبت‌نام نکرده‌اید"}</p>
          )}
        </div>

        {/* دوره‌های تدریس شده (فقط استاد) */}
        {isInstructor && taughtCourses.length > 0 && (
          <div className="bg-card/90 backdrop-blur-2xl rounded-4xl p-20 shadow-4xl border border-orange-500/20">
            <h3 className="text-7xl font-black mb-16 flex items-center gap-12 text-foreground">
              <Users size={80} className="text-orange-600" />
              {t("taught_courses") || "دوره‌های تدریس شده"}
            </h3>
            <div className="space-y-12">
              {taughtCourses.map((course) => (
                <div key={course.id} className="flex items-center justify-between bg-gradient-to-r from-orange-50 to-pink-50 p-12 rounded-3xl shadow-lg">
                  <div className="flex items-center gap-12">
                    <Image
                      src={course.image || "/course-placeholder.jpg"}
                      alt={course.title}
                      width={120}
                      height={120}
                      className="rounded-2xl"
                    />
                    <div>
                      <h4 className="text-4xl font-black text-foreground">{course.title}</h4>
                      <p className="text-3xl text-muted-foreground">{course._count.enrollments} {t("students") || "دانشجو"}</p>
                    </div>
                  </div>
                  <Link href={`/instructor/courses/${course.slug}`} className="text-orange-600 hover:text-orange-700">
                    <Eye size={48} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* گواهی‌ها + اطلاعات تماس */}
      <div className="grid lg:grid-cols-2 gap-20 mb-32">
        {/* اطلاعات تماس */}
        <div className="bg-card/90 backdrop-blur-2xl rounded-4xl p-20 shadow-4xl border border-primary/20">
          <h3 className="text-7xl font-black mb-16 flex items-center gap-12 text-foreground">
            <Mail size={80} className="text-primary" />
            {t("contact_info") || "اطلاعات تماس"}
          </h3>
          <div className="space-y-12 text-5xl text-foreground/80">
            <div className="flex items-center gap-12">
              <Mail />
              {user.email}
            </div>
            {user.phone && (
              <div className="flex items-center gap-12">
                <Phone />
                {user.phone}
              </div>
            )}
            {user.city && (
              <div className="flex items-center gap-12">
                <MapPin />
                {user.city}
              </div>
            )}
            <div className="flex items-center gap-12">
              <Calendar />
              {t("member_since") || "عضو از"} {user.createdAt ? format(new Date(user.createdAt), "dd MMMM yyyy") : "-"}
            </div>
          </div>
        </div>

        {/* گواهی‌ها */}
        <div className="bg-card/90 backdrop-blur-2xl rounded-4xl p-20 shadow-4xl border border-success/20">
          <h3 className="text-7xl font-black mb-16 flex items-center gap-12 text-foreground">
            <Award size={80} className="text-success" />
            {t("certificates") || "گواهی‌های دریافت شده"}
          </h3>
          {certificates.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
              {certificates.map((cert) => (
                <Link
                  key={cert.id}
                  href={`/certificate/${cert.id}`}
                  className="group relative bg-gradient-to-br from-success/10 to-emerald-50/80 rounded-3xl overflow-hidden shadow-2xl hover:shadow-3xl hover:-translate-y-4 transition-all"
                >
                  <div className="p-12 text-center">
                    <Image
                      src={cert.course.image || "/certificate-placeholder.jpg"}
                      alt={cert.course.title}
                      width={300}
                      height={200}
                      className="rounded-2xl mx-auto mb-10 shadow-xl group-hover:scale-105 transition"
                    />
                    <h4 className="text-4xl font-black text-foreground mb-6 line-clamp-2">
                      {cert.course.title}
                    </h4>
                    <p className="text-2xl text-muted-foreground mb-8">
                      {t("issued_on") || "صادر شده در"} {format(new Date(cert.issuedAt), "dd MMMM yyyy")}
                    </p>
                    <div className="inline-flex items-center gap-6 bg-success text-white px-12 py-8 rounded-3xl font-black text-3xl hover:bg-emerald-700 shadow-xl">
                      <Download size={48} />
                      {t("download") || "دانلود"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-32">
              <Award size={120} className="mx-auto text-muted-foreground mb-12" />
              <p className="text-6xl font-bold text-muted-foreground">{t("no_certificates") || "هنوز گواهی دریافت نکرده‌اید"}</p>
            </div>
          )}
        </div>
      </div>

      {/* فعالیت‌های اخیر */}
      <div className="bg-card/90 backdrop-blur-2xl rounded-4xl p-20 shadow-4xl border border-pink-500/20 mb-32">
        <h3 className="text-7xl font-black mb-16 flex items-center gap-12 text-foreground">
          <Clock size={80} className="text-pink-600" />
          {t("recent_activity") || "آخرین فعالیت‌ها"}
        </h3>
        {activities.length > 0 ? (
          <div className="space-y-12">
            {activities.map((act, i) => (
              <div key={i} className="flex items-center gap-16 p-12 bg-gradient-to-r from-pink-50 to-purple-50 rounded-3xl shadow-lg">
                <div className="bg-white p-8 rounded-full shadow-xl">
                  {act.action.includes("دوره") ? (
                    <BookOpen className="text-primary" size={60} />
                  ) : act.action.includes("پرداخت") ? (
                    <DollarSign className="text-success" size={60} />
                  ) : (
                    <Star className="text-yellow-600" size={60} />
                  )}
                </div>
                <div>
                  <p className="text-4xl font-black text-foreground">{act.action}</p>
                  <p className="text-3xl text-muted-foreground">{format(new Date(act.createdAt), "dd MMMM yyyy - HH:mm")}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-5xl text-muted-foreground text-center py-20">{t("no_activity") || "فعالیتی ثبت نشده است"}</p>
        )}
      </div>

      {/* دکمه ویرایش پروفایل */}
      <div className="text-center">
        <Link
          href="/profile/edit"
          className="inline-flex items-center gap-20 bg-gradient-to-r from-primary via-secondary to-primary text-white px-64 py-28 rounded-4xl text-8xl font-black shadow-5xl hover:shadow-primary/60 hover:scale-105 active:scale-95 transition-all duration-500 animate-pulse hover:animate-none"
        >
          <Edit3 size={100} />
          {t("edit_profile") || "ویرایش پروفایل و تنظیمات"}
        </Link>
      </div>
    </div>
  );
}