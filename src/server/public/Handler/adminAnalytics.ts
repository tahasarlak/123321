// src/server/public/Handler/adminAnalytics.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import type { AnalyticsStats, AnalyticsResult } from "@/types/adminAnalytics";

async function hasAdminAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { role: true } } },
  });
  return user?.roles.some((r) => ["ADMIN", "SUPERADMIN"].includes(r.role)) ?? false;
}

export async function handleGetAnalyticsStats(adminUserId: string): Promise<AnalyticsResult> {
  if (!(await hasAdminAccess(adminUserId))) return { success: false, error: "دسترسی ممنوع" };

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);

  const [
    totalRevenueResult,
    todayRevenueResult,
    monthRevenueResult,
    yearRevenueResult,
    totalPaidOrders,
    todayPaidOrders,
    revenueGroup,
    courses,
    products,
    totalUsers,
    totalCourses,
    totalProducts,
    avgOrderValueResult,
  ] = await Promise.all([
    prisma.order.aggregate({ where: { status: "PAID" }, _sum: { finalAmount: true } }),
    prisma.order.aggregate({ where: { status: "PAID", createdAt: { gte: startOfDay } }, _sum: { finalAmount: true } }),
    prisma.order.aggregate({ where: { status: "PAID", createdAt: { gte: startOfMonth } }, _sum: { finalAmount: true } }),
    prisma.order.aggregate({ where: { status: "PAID", createdAt: { gte: startOfYear } }, _sum: { finalAmount: true } }),
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.order.count({ where: { status: "PAID", createdAt: { gte: startOfDay } } }),
    prisma.order.groupBy({
      by: ["createdAt"],
      where: { status: "PAID", createdAt: { gte: sevenDaysAgo } },
      _sum: { finalAmount: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.course.findMany({
      where: { status: "PUBLISHED" },
      select: {
        id: true,
        title: true,
        orderItems: { select: { price: true } },
      },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        orderItems: { select: { price: true } },
      },
    }),
    prisma.user.count(),
    prisma.course.count({ where: { status: "PUBLISHED" } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.order.aggregate({
      where: { status: "PAID" },
      _avg: { finalAmount: true },
    }),
  ]);

  const revenueByDay = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - i));
    const dayStr = date.toISOString().split("T")[0];
    const dayData = revenueGroup.find(g => g.createdAt.toISOString().split("T")[0] === dayStr);
    const revenue = dayData?._sum.finalAmount ?? 0;
    return {
      label: new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "short" }).format(date),
      date: dayStr,
      revenue,
      formatted: new Intl.NumberFormat("fa-IR").format(revenue),
    };
  });

  const totalWeekRevenue = revenueByDay.reduce((sum, d) => sum + d.revenue, 0);

  const prevWeekStart = new Date(sevenDaysAgo);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekEnd = new Date(sevenDaysAgo);
  prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
  const prevWeekRevenueResult = await prisma.order.aggregate({
    where: { status: "PAID", createdAt: { gte: prevWeekStart, lte: prevWeekEnd } },
    _sum: { finalAmount: true },
  });
  const growthPercent = prevWeekRevenueResult._sum.finalAmount
    ? ((totalWeekRevenue - (prevWeekRevenueResult._sum.finalAmount ?? 0)) / (prevWeekRevenueResult._sum.finalAmount ?? 1)) * 100
    : 0;

  const topCourses = courses.map(c => ({
    id: c.id,
    title: c.title,
    students: c.orderItems.length,
    revenue: c.orderItems.reduce((sum, oi) => sum + oi.price, 0),
  })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  const topProducts = products.map(p => ({
    id: p.id,
    title: p.title,
    sales: p.orderItems.length,
    revenue: p.orderItems.reduce((sum, oi) => sum + oi.price, 0),
  })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  const stats: AnalyticsStats = {
    revenueByDay,
    totalWeekRevenue,
    growthPercent,
    totalRevenue: totalRevenueResult._sum.finalAmount || 0,
    todayRevenue: todayRevenueResult._sum.finalAmount || 0,
    monthRevenue: monthRevenueResult._sum.finalAmount || 0,
    yearRevenue: yearRevenueResult._sum.finalAmount || 0,
    totalOrders: totalPaidOrders,
    todayPaidOrders,
    totalUsers,
    totalCourses,
    totalProducts,
    avgOrderValue: avgOrderValueResult._avg.finalAmount || 0,
    topCourses,
    topProducts,
  };

  return { success: true, data: stats };
}