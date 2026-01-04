// src/components/dashboard/UserDashboardContent.tsx

import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, ShoppingCart, DollarSign, ArrowRight } from "lucide-react";
import type { Session } from "next-auth";
import { getTranslations } from "next-intl/server";

type UserDashboardContentProps = {
  session: Session;
  locale?: string;
};

export default async function UserDashboardContent({
  session,
  locale: propLocale,
}: UserDashboardContentProps) {
  const t = await getTranslations("dashboard");

  const userId = session.user.id as string;
  const fallbackLocale = propLocale || "fa";
  const numberLocale = fallbackLocale === "fa" ? "fa-IR" : "en-US";

  // مقادیر پیش‌فرض
  let enrolledCount = 0;
  let cartCount = 0;
  let totalSpent = 0;
  let recentEnrollments: any[] = [];

  try {
    const [enrolledRes, cartRes, paymentAgg, enrollmentsRes] = await Promise.all([
      prisma.enrollment.count({ where: { userId } }),
      prisma.cartItem.count({ where: { cart: { userId } } }),
      prisma.payment.aggregate({
        where: { order: { user: { id: userId } }, status: "PAID" },
        _sum: { amount: true },
      }),
      prisma.enrollment.findMany({
        where: { userId },
        include: {
          course: {
            select: {
              title: true,
              image: true,
              slug: true,
              instructor: { select: { name: true } },
            },
          },
        },
        orderBy: { enrolledAt: "desc" },
        take: 6,
      }),
    ]);

    enrolledCount = enrolledRes;
    cartCount = cartRes;
    totalSpent = paymentAgg._sum.amount ?? 0; // ← اینجا درست شد: null → 0
    recentEnrollments = enrollmentsRes;
  } catch (error) {
    console.error("خطا در بارگذاری داده‌های داشبورد کاربر:", error);
    // مقادیر پیش‌فرض از قبل تنظیم شدن
  }

  return (
    <div
      className="container mx-auto px-6 py-32 max-w-7xl"
      dir={fallbackLocale === "fa" ? "rtl" : "ltr"}
    >
      {/* خوش‌آمدگویی */}
      <div className="text-center mb-32">
        <div className="inline-flex items-center justify-center w-48 h-48 rounded-full bg-gradient-to-br from-primary to-secondary p-2 shadow-3xl mb-12">
          <Image
            src={session.user.image || "/avatar.jpg"}
            alt={session.user.name || "پروفایل"}
            width={192}
            height={192}
            priority
            className="rounded-full ring-8 ring-white/50 object-cover"
          />
        </div>
        <h1 className="text-8xl md:text-9xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-6">
          {t("common.welcome", { name: session.user.name || "دانشجو" })}
        </h1>
        <p className="text-5xl font-bold text-foreground/70">
          {t("user.studentGreeting")}
        </p>
      </div>

      {/* کارت‌های آمار */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
        <div className="group rounded-4xl bg-card/90 backdrop-blur-2xl shadow-3xl border-4 border-primary/20 hover:border-primary p-12 text-center transition-all">
          <BookOpen size={80} className="mx-auto mb-8 text-primary group-hover:scale-110 transition-transform" />
          <p className="text-4xl font-black mb-4">{t("user.enrolledCourses")}</p>
          <p className="text-8xl font-black text-primary">
            {enrolledCount.toLocaleString(numberLocale)}
          </p>
        </div>

        <div className="group rounded-4xl bg-card/90 backdrop-blur-2xl shadow-3xl border-4 border-secondary/20 hover:border-secondary p-12 text-center transition-all">
          <ShoppingCart size={80} className="mx-auto mb-8 text-secondary group-hover:scale-110 transition-transform" />
          <p className="text-4xl font-black mb-4">{t("user.cart")}</p>
          <p className="text-8xl font-black text-secondary">
            {cartCount.toLocaleString(numberLocale)}
          </p>
        </div>

        <div className="group rounded-4xl bg-card/90 backdrop-blur-2xl shadow-3xl border-4 border-success/20 hover:border-success p-12 text-center transition-all">
          <DollarSign size={80} className="mx-auto mb-8 text-success group-hover:scale-110 transition-transform" />
          <p className="text-4xl font-black mb-4">{t("user.totalSpent")}</p>
          <p className="text-7xl font-black text-success">
            {totalSpent.toLocaleString(numberLocale)} {t("common.toman")}
          </p>
        </div>
      </div>

      {/* آخرین دوره‌ها */}
      {recentEnrollments.length > 0 && (
        <div className="mb-20">
          <h2 className="text-7xl font-black text-center mb-16 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {t("user.recentCourses")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {recentEnrollments.map((enrollment) => (
              <Link
                key={enrollment.id}
                href={`/courses/${enrollment.course.slug}`}
                className="block rounded-3xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all bg-card/80 backdrop-blur-xl border border-primary/10 hover:border-primary/50 group"
              >
                {enrollment.course.image && (
                  <div className="relative h-64 overflow-hidden">
                    <Image
                      src={enrollment.course.image}
                      alt={enrollment.course.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                <div className="p-8">
                  <h3 className="text-4xl font-bold mb-4 line-clamp-2">
                    {enrollment.course.title}
                  </h3>
                  <p className="text-3xl text-muted-foreground mb-6">
                    {t("user.instructor", {
                      name: enrollment.course.instructor?.name || t("user.unknownInstructor"),
                    })}
                  </p>
                  <div className="bg-primary/10 rounded-2xl p-4 text-center group-hover:bg-primary/20 transition-colors">
                    <p className="text-2xl font-bold text-primary flex items-center justify-center gap-2">
                      {t("user.continueLearning")}
                      <ArrowRight size={28} className="group-hover:translate-x-2 transition-transform" />
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* دسترسی سریع */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
        <Link
          href="/courses"
          className="flex flex-col items-center justify-center p-12 rounded-4xl bg-gradient-to-r from-primary to-secondary text-white shadow-2xl hover:shadow-3xl transition-all hover:scale-105 group"
        >
          <BookOpen size={80} className="group-hover:scale-110 transition-transform" />
          <span className="mt-6 text-4xl font-bold">{t("user.browseCourses")}</span>
        </Link>

        <Link
          href="/cart"
          className="flex flex-col items-center justify-center p-12 rounded-4xl bg-gradient-to-r from-secondary to-pink-600 text-white shadow-2xl hover:shadow-3xl transition-all hover:scale-105 group"
        >
          <ShoppingCart size={80} className="group-hover:scale-110 transition-transform" />
          <span className="mt-6 text-4xl font-bold">{t("user.viewCart")}</span>
        </Link>
      </div>
    </div>
  );
}