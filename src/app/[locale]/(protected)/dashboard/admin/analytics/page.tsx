// src/app/[locale]/(protected)/dashboard/admin/analytics/page.tsx
import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { LoadingSkeleton } from "@/components/dashboard/LoadingSkeleton";
import AnalyticsClient from "./AnalyticsClient";

type AnalyticsData = {
  revenueByDay: { label: string; revenue: number; formatted: string }[];
  totalWeekRevenue: number;
  growthPercent: number;
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  totalCourses: number;
  totalProducts: number;
  avgOrderValue: number;
  topCourses: { title: string; students: number; revenue: number }[];
  topProducts: { title: string; sales: number; revenue: number }[];
};

async function AnalyticsContent() {
  const session = await getServerSession(authOptions);
  const userRoles: string[] = (session?.user?.roles || []) as string[];
  const hasAdminAccess = userRoles.includes("ADMIN") || userRoles.includes("SUPER_ADMIN");

  if (!session || !hasAdminAccess) {
    redirect("/auth");
  }

  // فقط داده‌های خام رو جمع‌آوری می‌کنیم
  const [
    totalRevenue,
    totalOrders,
    totalUsers,
    totalCourses,
    totalProducts,
    recentOrders,
    lastWeekRevenue,
    topCoursesRaw,
    topProductsRaw,
  ] = await Promise.all([
    prisma.order.aggregate({ _sum: { finalAmount: true }, where: { status: { in: ["PAID", "DELIVERED"] } } }),
    prisma.order.count({ where: { status: { in: ["PAID", "DELIVERED"] } } }),
    prisma.user.count(),
    prisma.course.count({ where: { status: "PUBLISHED" } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.order.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      select: { createdAt: true, finalAmount: true },
    }),
    prisma.order.aggregate({
      _sum: { finalAmount: true },
      where: {
        createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        status: { in: ["PAID", "DELIVERED"] },
      },
    }),
    prisma.course.findMany({
      where: { status: "PUBLISHED" },
      select: {
        title: true,
        price: true,
        buyers: { select: { id: true } },
      },
      orderBy: { buyers: { _count: "desc" } },
      take: 5,
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: {
        title: true,
        price: true,
        orderItems: { select: { id: true } },
      },
      orderBy: { orderItems: { _count: "desc" } },
      take: 5,
    }),
  ]);

  // محاسبات
  const revenueByDayMap = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const label = date.toLocaleDateString("fa-IR", { weekday: "short" });
    revenueByDayMap.set(label, 0);
  }
  recentOrders.forEach((order) => {
    const date = new Date(order.createdAt);
    const label = date.toLocaleDateString("fa-IR", { weekday: "short" });
    revenueByDayMap.set(label, (revenueByDayMap.get(label) || 0) + order.finalAmount);
  });

  const revenueByDay = Array.from(revenueByDayMap.entries()).map(([label, revenue]) => ({
    label,
    revenue,
    formatted: new Intl.NumberFormat("fa-IR").format(revenue),
  }));

  const totalWeekRevenue = revenueByDay.reduce((sum, day) => sum + day.revenue, 0);
  const growthPercent = lastWeekRevenue._sum?.finalAmount
    ? ((totalWeekRevenue - (lastWeekRevenue._sum.finalAmount || 0)) / (lastWeekRevenue._sum.finalAmount || 1)) * 100
    : 0;

  const avgOrderValue = totalOrders > 0 ? (totalRevenue._sum?.finalAmount || 0) / totalOrders : 0;

  const topCourses = topCoursesRaw.map((c) => ({
    title: c.title,
    students: c.buyers.length,
    revenue: Number(c.price?.IRR || 0) * c.buyers.length,
  }));

  const topProducts = topProductsRaw.map((p) => ({
    title: p.title,
    sales: p.orderItems.length,
    revenue: Number(p.price?.IRR || 0) * p.orderItems.length,
  }));

  const data: AnalyticsData = {
    revenueByDay,
    totalWeekRevenue,
    growthPercent,
    totalRevenue: totalRevenue._sum?.finalAmount || 0,
    totalOrders,
    totalUsers,
    totalCourses,
    totalProducts,
    avgOrderValue,
    topCourses,
    topProducts,
  };

  // فقط داده رو پاس می‌دیم — هیچ تابع یا ترجمه‌ای نه!
  return <AnalyticsClient data={data} />;
}

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<LoadingSkeleton />}>
        <AnalyticsContent />
      </Suspense>
    </div>
  );
}