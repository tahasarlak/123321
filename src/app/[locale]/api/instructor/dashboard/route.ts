// src/app/api/instructor/dashboard/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { InstructorDashboardStats } from "@/types/instructorDashboard";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const [coursesCount, totalStudents, totalRevenueResult, recentNotifications] = await Promise.all([
    prisma.course.count({ where: { instructorId: userId } }),
    prisma.enrollment.count({ where: { course: { instructorId: userId }, status: "APPROVED" } }),
    prisma.orderItem.aggregate({
      where: { course: { instructorId: userId }, order: { status: "PAID" } },
      _sum: { price: true },
    }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const stats: InstructorDashboardStats = {
    coursesCount,
    totalStudents,
    totalRevenue: totalRevenueResult._sum.price || 0,
    recentNotifications,
  };

  return NextResponse.json({ success: true, stats });
}