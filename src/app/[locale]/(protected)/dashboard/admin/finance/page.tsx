// src/app/[locale]/(protected)/dashboard/admin/finance/page.tsx
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { LoadingSkeleton } from "@/components/dashboard/LoadingSkeleton";
import Link from "next/link";
import Image from "next/image";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  ShoppingCart,
  Users,
} from "lucide-react";

type FinanceData = {
  totalRevenue: number;
  todayRevenue: number;
  monthRevenue: number;
  yearRevenue: number;
  totalPaidOrders: number;
  todayPaidOrders: number;
  instructorsEarnings: {
    instructorId: string;
    instructorName: string | null;
    instructorImage: string | null;
    totalCourses: number;
    totalStudents: number;
    totalRevenue: number;
  }[];
};

async function FinanceContent() {
  const session = await getServerSession(authOptions);
  const userRoles: string[] = (session?.user?.roles || []) as string[];
  const hasAdminAccess = userRoles.includes("ADMIN") || userRoles.includes("SUPER_ADMIN");

  if (!session || !hasAdminAccess) {
    redirect("/auth");
  }

  let t;
  try {
    t = await getTranslations("admin.finance");
  } catch {
    t = (key: string) => {
      const map: Record<string, string> = {
        pageTitle: "مدیریت مالی و تسویه | روم آکادمی",
        pageDescription: "آمار مالی و درآمد اساتید در یک نگاه",
        totalRevenue: "درآمد کل",
        todayRevenue: "درآمد امروز",
        monthRevenue: "درآمد این ماه",
        totalOrders: "سفارشات موفق",
        instructorsEarningsTitle: "درآمد اساتید از فروش دوره‌ها",
        noEarnings: "هنوز هیچ درآمدی برای اساتید ثبت نشده",
        coursesCount: "دوره",
        studentsCount: "دانشجو",
        viewDetails: "مشاهده جزئیات",
        autoSettlement: "سیستم تسویه خودکار در حال توسعه است",
        autoSettlementDesc: "به زودی امکان درخواست تسویه توسط اساتید و تأیید خودکار توسط سیستم اضافه می‌شود",
      };
      return map[key] || key;
    };
  }

  // محاسبه تاریخ‌ها
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [
    totalRevenueAgg,
    todayRevenueAgg,
    monthRevenueAgg,
    yearRevenueAgg,
    totalPaidOrders,
    todayPaidOrders,
    instructorsRaw,
  ] = await Promise.all([
    prisma.order.aggregate({
      _sum: { finalAmount: true },
      where: { status: { in: ["PAID", "DELIVERED"] } },
    }),
    prisma.order.aggregate({
      _sum: { finalAmount: true },
      where: {
        createdAt: { gte: startOfDay },
        status: { in: ["PAID", "DELIVERED"] },
      },
    }),
    prisma.order.aggregate({
      _sum: { finalAmount: true },
      where: {
        createdAt: { gte: startOfMonth },
        status: { in: ["PAID", "DELIVERED"] },
      },
    }),
    prisma.order.aggregate({
      _sum: { finalAmount: true },
      where: {
        createdAt: { gte: startOfYear },
        status: { in: ["PAID", "DELIVERED"] },
      },
    }),
    prisma.order.count({ where: { status: { in: ["PAID", "DELIVERED"] } } }),
    prisma.order.count({
      where: {
        createdAt: { gte: startOfDay },
        status: { in: ["PAID", "DELIVERED"] },
      },
    }),
    // درست: استفاده از taughtCourses به جای courses
    prisma.user.findMany({
      where: {
        roles: { some: { role: "INSTRUCTOR" } },
      },
      select: {
        id: true,
        name: true,
        image: true,
        taughtCourses: {
          // این رابطه در schema تعریف شده: taughtCourses Course[] @relation("InstructorCourses")
          select: {
            id: true,
            price: true,
            buyers: {
              // تعداد خریداران هر دوره
              select: {
                id: true,
              },
            },
          },
        },
      },
    }),
  ]);

  // محاسبه درآمد هر استاد
  const instructorsEarnings = instructorsRaw.map((inst) => {
    const totalCourses = inst.taughtCourses.length;
    const totalStudents = inst.taughtCourses.reduce((sum, course) => sum + course.buyers.length, 0);
    const totalRevenue = inst.taughtCourses.reduce((sum, course) => {
      const coursePrice = Number(course.price?.IRR || 0); 
      return sum + coursePrice * course.buyers.length;
    }, 0);

    return {
      instructorId: inst.id,
      instructorName: inst.name,
      instructorImage: inst.image,
      totalCourses,
      totalStudents,
      totalRevenue,
    };
  });

  const data: FinanceData = {
    totalRevenue: totalRevenueAgg._sum?.finalAmount || 0,
    todayRevenue: todayRevenueAgg._sum?.finalAmount || 0,
    monthRevenue: monthRevenueAgg._sum?.finalAmount || 0,
    yearRevenue: yearRevenueAgg._sum?.finalAmount || 0,
    totalPaidOrders,
    todayPaidOrders,
    instructorsEarnings,
  };

  const formatter = new Intl.NumberFormat("fa-IR");

  return (
    <div className="container mx-auto px-6 py-20 max-w-7xl space-y-24">
      {/* عنوان صفحه */}
      <div className="text-center">
        <h1 className="text-7xl md:text-9xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-8 animate-gradient">
          {t("pageTitle") || "مدیریت مالی و تسویه"}
        </h1>
        <p className="text-3xl md:text-4xl font-bold text-foreground/70">
          {t("pageDescription") || "آمار مالی و درآمد اساتید در یک نگاه"}
        </p>
      </div>

      {/* کارت‌های آمار مالی */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        <StatCard
          icon={DollarSign}
          title={t("totalRevenue") || "درآمد کل"}
          value={formatter.format(data.totalRevenue)}
          unit="تومان"
          gradient="from-primary to-secondary"
        />
        <StatCard
          icon={TrendingUp}
          title={t("todayRevenue") || "درآمد امروز"}
          value={formatter.format(data.todayRevenue)}
          unit="تومان"
          gradient="from-emerald-500 to-teal-600"
        />
        <StatCard
          icon={Calendar}
          title={t("monthRevenue") || "درآمد این ماه"}
          value={formatter.format(data.monthRevenue)}
          unit="تومان"
          gradient="from-orange-500 to-red-600"
        />
        <StatCard
          icon={ShoppingCart}
          title={t("totalOrders") || "سفارشات موفق"}
          value={formatter.format(data.totalPaidOrders)}
          gradient="from-pink-500 to-rose-600"
        />
      </div>

      {/* درآمد اساتید */}
      <section className="bg-card rounded-3xl shadow-3xl p-12 lg:p-20 border border-border/50">
        <h2 className="text-5xl md:text-6xl font-black text-center mb-16 text-foreground">
          {t("instructorsEarningsTitle") || "درآمد اساتید از فروش دوره‌ها"}
        </h2>

        {data.instructorsEarnings.length === 0 ? (
          <div className="text-center py-32">
            <Users className="w-32 h-32 mx-auto text-muted-foreground mb-12" />
            <p className="text-4xl md:text-5xl text-muted-foreground">
              {t("noEarnings") || "هنوز هیچ درآمدی برای اساتید ثبت نشده"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {data.instructorsEarnings.map((item) => (
              <div
                key={item.instructorId}
                className="bg-gradient-to-br from-primary/5 to-secondary/10 rounded-3xl p-10 hover:shadow-3xl transition-all duration-500 group border border-border/30"
              >
                <div className="flex items-center gap-8 mb-10">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-3xl shadow-2xl overflow-hidden ring-4 ring-primary/20">
                      <Image
                        src={item.instructorImage || "/avatar.jpg"}
                        alt={item.instructorName || "استاد"}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="absolute -bottom-4 -right-4 bg-success text-white w-16 h-16 rounded-full flex items-center justify-center text-3xl font-black shadow-2xl">
                      {item.totalCourses}
                    </div>
                  </div>
                  <div>
                    <p className="text-3xl md:text-4xl font-black text-foreground">
                      {item.instructorName || "نامشخص"}
                    </p>
                    <p className="text-xl md:text-2xl text-muted-foreground mt-2">
                      {item.totalStudents.toLocaleString("fa-IR")} دانشجو
                    </p>
                  </div>
                </div>

                <div className="pt-10 border-t border-border/30 space-y-8">
                  <div className="flex justify-between items-end">
                    <span className="text-2xl text-muted-foreground">درآمد کل</span>
                    <span className="text-5xl md:text-6xl font-black text-success">
                      {formatter.format(item.totalRevenue)} تومان
                    </span>
                  </div>
                  <Link
                    href={`/dashboard/admin/instructors/${item.instructorId}`}
                    className="block text-center bg-gradient-to-r from-primary to-secondary text-white py-6 rounded-2xl text-2xl md:text-3xl font-black hover:shadow-2xl transition-all group-hover:scale-105"
                  >
                    {t("viewDetails") || "مشاهده جزئیات"}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* پیام نهایی */}
      <div className="bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 text-white rounded-3xl shadow-3xl py-24 px-12 text-center">
        <h2 className="text-6xl md:text-7xl font-black mb-10">
          {t("autoSettlement") || "سیستم تسویه خودکار در حال توسعه است"}
        </h2>
        <p className="text-3xl md:text-4xl opacity-90 max-w-4xl mx-auto">
          {t("autoSettlementDesc") || "به زودی امکان درخواست تسویه توسط اساتید و تأیید خودکار توسط سیستم اضافه می‌شود"}
        </p>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
  unit,
  gradient,
}: {
  icon: any;
  title: string;
  value: string | number;
  unit?: string;
  gradient: string;
}) {
  return (
    <div
      className={`bg-gradient-to-br ${gradient} text-white rounded-3xl p-12 shadow-2xl overflow-hidden transition-all duration-500 hover:scale-105 hover:shadow-3xl group`}
    >
      <div className="relative z-10">
        <Icon className="w-20 h-20 mb-8 opacity-90" />
        <p className="text-6xl md:text-7xl font-black">
          {value}
          {unit && <span className="text-4xl ml-4">{unit}</span>}
        </p>
        <p className="text-2xl md:text-3xl mt-6 opacity-90">{title}</p>
      </div>
    </div>
  );
}

export default function FinancePage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<LoadingSkeleton />}>
        <FinanceContent />
      </Suspense>
    </div>
  );
}