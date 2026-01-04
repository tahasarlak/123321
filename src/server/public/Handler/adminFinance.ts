// src/server/public/Handler/adminFinance.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import type { FinanceStats, FinanceResult, InstructorEarnings } from "@/types/adminFinance";

async function hasAdminAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { role: true } } },
  });
  return user?.roles.some((r) => ["ADMIN", "SUPERADMIN"].includes(r.role)) ?? false;
}

export async function handleGetFinanceStats(adminUserId: string): Promise<FinanceResult> {
  if (!(await hasAdminAccess(adminUserId))) return { success: false, error: "دسترسی ممنوع" };

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [
    totalRevenue,
    todayRevenue,
    monthRevenue,
    yearRevenue,
    totalPaidOrders,
    todayPaidOrders,
    courses,
  ] = await Promise.all([
    prisma.order.aggregate({ where: { status: "PAID" }, _sum: { finalAmount: true } }),
    prisma.order.aggregate({ where: { status: "PAID", createdAt: { gte: startOfDay } }, _sum: { finalAmount: true } }),
    prisma.order.aggregate({ where: { status: "PAID", createdAt: { gte: startOfMonth } }, _sum: { finalAmount: true } }),
    prisma.order.aggregate({ where: { status: "PAID", createdAt: { gte: startOfYear } }, _sum: { finalAmount: true } }),
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.order.count({ where: { status: "PAID", createdAt: { gte: startOfDay } } }),
    prisma.course.findMany({
      where: { status: "PUBLISHED" },
      select: {
        price: true,
        instructor: { select: { id: true, name: true, image: true } },
        buyers: { select: { id: true } },
      },
    }),
  ]);

  const earningsByInstructor = courses.reduce<Record<string, InstructorEarnings>>((acc, course) => {
    const priceIRR = (course.price as any)?.IRR || 0;
    const revenue = Number(priceIRR) * course.buyers.length;
    const instructorId = course.instructor.id;

    if (!acc[instructorId]) {
      acc[instructorId] = {
        instructorId,
        instructorName: course.instructor.name,
        instructorImage: course.instructor.image,
        totalCourses: 0,
        totalStudents: 0,
        totalRevenue: 0,
      };
    }

    acc[instructorId].totalCourses += 1;
    acc[instructorId].totalStudents += course.buyers.length;
    acc[instructorId].totalRevenue += revenue;

    return acc;
  }, {});

  const instructorsEarnings = Object.values(earningsByInstructor);

  const stats: FinanceStats = {
    totalRevenue: totalRevenue._sum.finalAmount || 0,
    todayRevenue: todayRevenue._sum.finalAmount || 0,
    monthRevenue: monthRevenue._sum.finalAmount || 0,
    yearRevenue: yearRevenue._sum.finalAmount || 0,
    totalPaidOrders,
    todayPaidOrders,
    instructorsEarnings,
  };

  return { success: true, data: stats };
}