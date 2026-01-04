// src/app/api/user/dashboard/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { ipRateLimit } from "@/lib/redis/rate-limit";
import { headers } from "next/headers"; // ← همچنان ایمپورت می‌کنیم
import type { UserDashboardStats } from "@/types/userDashboard";

const fakeDelay = () =>
  new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 200) + 100)); // 100-300ms

const uniformResponse = async (stats: UserDashboardStats) => {
  await fakeDelay();
  return NextResponse.json({ stats }, { status: 200 });
};

export async function GET() {
  try {
    const headersList = await headers(); 

    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip")?.trim() ||
      headersList.get("cf-connecting-ip")?.trim() ||
      headersList.get("x-vercel-forwarded-for")?.trim() ||
      headersList.get("true-client-ip")?.trim() ||
      "unknown";

    // === Rate Limit بر اساس IP ===
    const { success: rateLimitSuccess } = await ipRateLimit.limit(ip);
    if (!rateLimitSuccess) {
      return await uniformResponse(getEmptyStats());
    }

    // === چک جلسه ===
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return await uniformResponse(getEmptyStats());
    }

    const userId = session.user.id;

    // === جمع‌آوری آمار با Promise.all ===
    const [
      totalOrders,
      totalSpentResult,
      purchasedCourses,
      purchasedProducts,
      recentOrders,
      recentNotifications,
    ] = await Promise.all([
      prisma.order.count({ where: { userId } }),

      prisma.order.aggregate({
        where: { userId, status: "PAID" },
        _sum: { finalAmount: true },
      }),

      prisma.course.count({
        where: { buyers: { some: { id: userId } } },
      }),

      prisma.product.count({
        where: { buyers: { some: { id: userId } } },
      }),

      prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          status: true,
          finalAmount: true,
          createdAt: true,
          items: {
            select: { quantity: true },
          },
        },
      }),

      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          message: true,
          type: true,
          isRead: true,
          createdAt: true,
          link: true,
        },
      }),
    ]);

    // فرمت کردن سفارش‌های اخیر
    const formattedRecentOrders = recentOrders.map(order => ({
      id: order.id,
      status: order.status,
      finalAmount: order.finalAmount,
      createdAt: order.createdAt,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    }));

    const stats: UserDashboardStats = {
      totalOrders,
      totalSpent: totalSpentResult._sum.finalAmount || 0,
      purchasedCourses,
      purchasedProducts,
      recentOrders: formattedRecentOrders,
      recentNotifications,
    };

    return await uniformResponse(stats);
  } catch (err) {
    console.error("[USER DASHBOARD] خطای غیرمنتظره:", err);
    return await uniformResponse(getEmptyStats());
  }
}

// آمار خالی برای حالات غیرعادی
function getEmptyStats(): UserDashboardStats {
  return {
    totalOrders: 0,
    totalSpent: 0,
    purchasedCourses: 0,
    purchasedProducts: 0,
    recentOrders: [],
    recentNotifications: [],
  };
}