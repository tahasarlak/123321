// src/components/dashboard/AdminDashboardContent.tsx

import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import {
  Users,
  Package,
  BookOpen,
  ShoppingCart,
  Clock,
  DollarSign,
  TrendingUp,
  Activity,
  UserPlus,
  GraduationCap,
  PenTool,
  Plus,
  Percent,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import RevenueChart from "@/components/admin/RevenueChart";
import type { Session } from "next-auth";
import { getTranslations } from "next-intl/server";

const formatter = new Intl.NumberFormat("fa-IR", {
  style: "currency",
  currency: "IRR",
  minimumFractionDigits: 0,
});

function StatCard({
  icon: Icon,
  title,
  value,
  gradient,
  badge,
  currency,
  numberLocale,
}: {
  icon: any;
  title: string;
  value: number;
  gradient: string;
  badge?: boolean;
  currency?: boolean;
  numberLocale: string;
}) {
  return (
    <div className={`relative group bg-gradient-to-br ${gradient} text-white rounded-3xl p-10 shadow-2xl overflow-hidden transition-all duration-500 hover:scale-105 hover:shadow-3xl`}>
      <div className="absolute inset-0 bg-white/10 group-hover:bg-white/20 transition" />
      <div className="relative z-10">
        <Icon size={64} className="mb-8 opacity-90 group-hover:scale-110 transition-transform" />
        <p className="text-5xl md:text-6xl font-black mb-4">
          {currency ? formatter.format(value) : value.toLocaleString(numberLocale)}
        </p>
        <p className="text-2xl font-bold opacity-90">{title}</p>
        {badge && value > 0 && (
          <span className="absolute top-6 right-6 bg-destructive px-6 py-3 rounded-full text-xl font-black animate-pulse shadow-2xl">
            جدید
          </span>
        )}
      </div>
    </div>
  );
}

type AdminDashboardContentProps = {
  session: Session;
  locale?: string;
};

export default async function AdminDashboardContent({
  session,
   locale = "en",
}: AdminDashboardContentProps) {
  const t = await getTranslations("dashboard");
  const tc = await getTranslations("common"); 
  try {
    const userId = session.user.id;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalUsers,
      activeProducts,
      publishedCourses,
      totalPaidOrders,
      pendingCourses,
      pendingOrders,
      newUsersToday,
      todayRevenueRes,
      totalRevenueRes,
      totalInstructors,
      totalBlogAuthors,
      totalBlogPosts,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.course.count({ where: { status: "PUBLISHED" } }),
      prisma.order.count({ where: { status: "PAID" } }),
      prisma.course.count({ where: { status: "PENDING_REVIEW" } }),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.order.aggregate({
        where: { status: "PAID", createdAt: { gte: today } },
        _sum: { finalAmount: true },
      }),
      prisma.order.aggregate({
        where: { status: "PAID" },
        _sum: { finalAmount: true },
      }),
      prisma.user.count({ where: { roles: { some: { role: "INSTRUCTOR" } } } }),
      prisma.user.count({ where: { roles: { some: { role: "BLOG_AUTHOR" } } } }),
      prisma.post.count(),
    ]);

    const todayRevenue = todayRevenueRes._sum.finalAmount || 0;
    const totalRevenue = totalRevenueRes._sum.finalAmount || 0;

    // نمودار درآمد ۳۰ روز اخیر
    let revenueChartData: { date: string; درآمد: number }[] = [];
    try {
      const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const dailyRevenue = await prisma.order.groupBy({
        by: ["createdAt"],
        where: { status: "PAID", createdAt: { gte: startDate } },
        _sum: { finalAmount: true },
        orderBy: { createdAt: "asc" },
      });

      revenueChartData = dailyRevenue.map((item) => ({
        date: new Date(item.createdAt).toLocaleDateString(locale === "fa" ? "fa-IR" : "en-US", {
          day: "numeric",
          month: "short",
        }),
        درآمد: item._sum.finalAmount || 0,
      }));
    } catch (err) {
      console.error("خطا در بارگذاری نمودار درآمد:", err);
    }

    // لیست‌های اخیر
    const [
      recentOrders,
      pendingCoursesList,
      recentUsers,
      recentReviews,
      recentLogs,
    ] = await Promise.all([
      prisma.order.findMany({
        where: { status: "PAID" },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { user: { select: { name: true } } },
      }),
      prisma.course.findMany({
        where: { status: "PENDING_REVIEW" },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { instructor: { select: { name: true } } },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          roles: { select: { role: true } },
        },
      }),
      prisma.review.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          user: { select: { name: true } },
          course: { select: { title: true } },
        },
      }),
      prisma.activityLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { user: { select: { name: true } } },
      }),
    ]);

    const numberLocale = locale === "fa" ? "fa-IR" : "en-US";

    return (
      <div className="container mx-auto px-6 py-20 max-w-7xl space-y-20" dir={locale === "fa" ? "rtl" : "ltr"}>
        {/* خوش‌آمدگویی */}
      <div className="text-center">
  <h1 className="text-6xl md:text-8xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-8 animate-gradient">
    {t("admin.greeting", { name: session.user.name || "ادمین" })}
  </h1>
  <p className="text-2xl md:text-3xl font-bold text-foreground/70">
    {tc("todayDateTime", {
      date: new Date().toLocaleDateString(numberLocale),
      time: new Date().toLocaleTimeString(numberLocale, { hour: "2-digit", minute: "2-digit" }),
    })}
  </p>
</div>

        {/* دسترسی سریع */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <Link href="/dashboard/courses/create" className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-3xl p-10 text-center hover:scale-105 transition shadow-2xl group">
            <Plus size={64} className="mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <p className="text-2xl font-black">{t("admin.createCourse")}</p>
          </Link>
          <Link href="/dashboard/products/create" className="bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-3xl p-10 text-center hover:scale-105 transition shadow-2xl group">
            <Package size={64} className="mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <p className="text-2xl font-black">{t("admin.addProduct")}</p>
          </Link>
          <Link href="/dashboard/discounts/create" className="bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-3xl p-10 text-center hover:scale-105 transition shadow-2xl group">
            <Percent size={64} className="mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <p className="text-2xl font-black">{t("admin.createDiscount")}</p>
          </Link>
          <Link href="/dashboard/courses/pending" className="bg-gradient-to-r from-destructive to-rose-600 text-white rounded-3xl p-10 text-center hover:scale-105 transition shadow-2xl group">
            <Clock size={64} className="mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <p className="text-2xl font-black">
              {t("admin.pendingCourses")} ({pendingCourses})
            </p>
          </Link>
        </div>

        {/* آمارهای اصلی */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
          <StatCard icon={Users} title={t("admin.totalUsers")} value={totalUsers} gradient="from-teal-500 to-primary" numberLocale={numberLocale} />
          <StatCard icon={GraduationCap} title={t("admin.instructors")} value={totalInstructors} gradient="from-emerald-500 to-teal-600" numberLocale={numberLocale} />
          <StatCard icon={PenTool} title={t("admin.blogAuthors")} value={totalBlogAuthors} gradient="from-purple-500 to-indigo-600" numberLocale={numberLocale} />
          <StatCard icon={BookOpen} title={t("admin.publishedCourses")} value={publishedCourses} gradient="from-green-500 to-emerald-600" numberLocale={numberLocale} />
          <StatCard icon={Package} title={t("admin.activeProducts")} value={activeProducts} gradient="from-purple-500 to-secondary" numberLocale={numberLocale} />
          <StatCard icon={DollarSign} title={t("admin.totalRevenue")} value={totalRevenue} gradient="from-emerald-500 to-teal-600" currency numberLocale={numberLocale} />
          <StatCard icon={TrendingUp} title={t("admin.todayRevenue")} value={todayRevenue} gradient="from-cyan-500 to-primary" currency numberLocale={numberLocale} />
          <StatCard icon={UserPlus} title={t("admin.newUsersToday")} value={newUsersToday} gradient="from-pink-500 to-rose-600" numberLocale={numberLocale} />
          <StatCard icon={Clock} title={t("admin.pendingCoursesCount")} value={pendingCourses} gradient="from-red-500 to-rose-600" badge numberLocale={numberLocale} />
          <StatCard icon={Activity} title={t("admin.pendingOrdersCount")} value={pendingOrders} gradient="from-orange-500 to-amber-600" badge numberLocale={numberLocale} />
        </div>

        {/* نمودار درآمد */}
        <div className="bg-card rounded-3xl shadow-2xl p-10 border border-border/50">
          <h2 className="text-4xl font-black mb-10 flex items-center gap-4 text-foreground">
            <TrendingUp size={48} className="text-success" />
            {t("admin.revenueTrend")}
          </h2>
          <RevenueChart data={revenueChartData} />
        </div>

        {/* سه ستون اصلی */}
        <div className="grid lg:grid-cols-3 gap-12">
          {/* آخرین سفارشات موفق */}
          <div className="bg-card rounded-3xl shadow-2xl p-10 border border-border/50">
            <h2 className="text-4xl font-black mb-10 flex items-center gap-4 text-foreground">
              <ShoppingCart size={48} className="text-primary" />
              {t("admin.recentOrders")}
            </h2>
            <div className="space-y-6">
              {recentOrders.length === 0 ? (
                <p className="text-center text-muted-foreground text-xl py-16">{t("admin.noOrders")}</p>
              ) : (
                recentOrders.map((order: any) => (
                  <div
                    key={order.id}
                    className="flex justify-between items-center p-8 bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl hover:shadow-xl transition group"
                  >
                    <div>
                      <p className="font-bold text-2xl text-foreground">{order.user.name}</p>
                      <p className="text-muted-foreground mt-1">
                        {new Date(order.createdAt).toLocaleString(numberLocale)}
                      </p>
                    </div>
                    <p className="text-3xl font-black text-primary flex items-center gap-2">
                      {formatter.format(order.finalAmount)}
                      <ArrowRight size={28} className="opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all" />
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* دوره‌های در انتظار تأیید */}
          <div className="bg-card rounded-3xl shadow-2xl p-10 border border-border/50">
            <h2 className="text-4xl font-black mb-10 flex items-center gap-4 text-foreground">
              <Clock size={48} className="text-destructive" />
              {t("admin.pendingCoursesTitle")}
            </h2>
            <div className="space-y-6">
              {pendingCoursesList.length === 0 ? (
                <p className="text-center text-muted-foreground text-xl py-16">{t("admin.noPendingCourses")}</p>
              ) : (
                pendingCoursesList.map((course: any) => (
                  <Link
                    href={`/dashboard/courses/pending/${course.id}`}
                    key={course.id}
                    className="block p-8 bg-gradient-to-r from-destructive/5 to-rose-500/10 rounded-2xl hover:shadow-xl transition group"
                  >
                    <p className="font-bold text-2xl text-foreground">{course.title}</p>
                    <p className="text-muted-foreground mt-3">مدرس: {course.instructor.name}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {new Date(course.createdAt).toLocaleDateString(numberLocale)}
                    </p>
                    <ArrowRight size={32} className="mt-4 opacity-0 group-hover:opacity-100 translate-x-[-20px] group-hover:translate-x-0 transition-all text-destructive" />
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* آخرین کاربران ثبت‌نام شده */}
          <div className="bg-card rounded-3xl shadow-2xl p-10 border border-border/50">
            <h2 className="text-4xl font-black mb-10 flex items-center gap-4 text-foreground">
              <UserPlus size={48} className="text-success" />
              {t("admin.recentUsersTitle")}
            </h2>
            <div className="space-y-6">
              {recentUsers.map((user: any) => {
                const priorityRole = user.roles.find((r: any) =>
                  ["SUPERADMIN", "ADMIN", "INSTRUCTOR", "BLOG_AUTHOR"].includes(r.role)
                );
                const roleKey = priorityRole?.role ?? "USER";
                const displayRole =
                  roleKey === "SUPERADMIN" || roleKey === "ADMIN"
                    ? t("admin.admin")
                    : roleKey === "INSTRUCTOR"
                    ? t("admin.instructor")
                    : roleKey === "BLOG_AUTHOR"
                    ? t("admin.blogAuthor")
                    : t("admin.student");

                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-8 bg-gradient-to-r from-success/5 to-emerald-500/10 rounded-2xl hover:shadow-xl transition"
                  >
                    <div>
                      <p className="font-bold text-2xl text-foreground">{user.name}</p>
                      <p className="text-muted-foreground">{user.email}</p>
                    </div>
                    <span
                      className={`px-5 py-2 rounded-full text-sm font-bold ${
                        roleKey === "ADMIN" || roleKey === "SUPERADMIN"
                          ? "bg-secondary text-secondary-foreground"
                          : roleKey === "INSTRUCTOR"
                          ? "bg-primary/20 text-primary"
                          : roleKey === "BLOG_AUTHOR"
                          ? "bg-purple-600 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {displayRole}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* آخرین نظرات کاربران */}
        <div className="bg-card rounded-3xl shadow-2xl p-10 border border-border/50">
          <h2 className="text-4xl font-black mb-10 flex items-center gap-4 text-foreground">
            <MessageSquare size={48} className="text-primary" />
            {t("admin.recentReviews")}
          </h2>
          <div className="space-y-6">
            {recentReviews.length === 0 ? (
              <p className="text-center text-muted-foreground text-xl py-16">{t("admin.noReviews")}</p>
            ) : (
              recentReviews.map((review: any) => (
                <div key={review.id} className="p-8 bg-gradient-to-r from-primary/5 to-secondary/10 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-bold text-2xl text-foreground">{review.user.name}</p>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={i < review.rating ? "text-yellow-500" : "text-muted"}>
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-foreground/80">{review.comment || "بدون نظر"}</p>
                  <p className="text-sm text-muted-foreground mt-3">
                    دوره: {review.course?.title || "نامشخص"} —{" "}
                    {new Date(review.createdAt).toLocaleDateString(numberLocale)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* آخرین فعالیت‌های سیستم */}
        <div className="bg-card rounded-3xl shadow-2xl p-10 border border-border/50">
          <h2 className="text-4xl font-black mb-10 flex items-center gap-4 text-foreground">
            <Activity size={48} className="text-primary" />
            {t("admin.recentActivity")}
          </h2>
          <div className="space-y-6">
            {recentLogs.length === 0 ? (
              <p className="text-center text-muted-foreground text-xl py-16">{t("admin.noActivity")}</p>
            ) : (
              recentLogs.map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-8 bg-gradient-to-r from-primary/5 to-secondary/10 rounded-2xl hover:shadow-xl transition group"
                >
                  <div>
                    <p className="font-bold text-2xl text-foreground">{log.user.name}</p>
                    <p className="text-foreground/80">
                      {log.action} — {log.entity} {log.entityId}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString(numberLocale)}
                    </p>
                    <ArrowRight size={24} className="opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all text-primary" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("خطای کلی در داشبورد ادمین:", error);
    return (
      <div className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-6xl font-black text-destructive mb-8">{t("common.errorTitle")}</h1>
        <p className="text-2xl text-muted-foreground">{t("common.errorMessage")}</p>
      </div>
    );
  }
}