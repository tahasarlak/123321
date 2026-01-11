"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { Prisma } from "@prisma/client";

const PAGE_SIZE = 12;

// چک نقش‌ها
async function getUserRoles(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { role: true } } },
  });
  return user?.roles.map(r => r.role) || [];
}

async function isAdmin(userId: string): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");
}

async function isInstructor(userId: string): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roles.includes("INSTRUCTOR");
}

/* ==================== لیست سفارشات ==================== */
export async function fetchOrders({
  search = "",
  page = 1,
  userId,
}: {
  search?: string;
  page?: number;
  userId: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.id !== userId) {
    return { items: [], totalItems: 0, stats: [] };
  }

  const currentUserId = session.user.id as string;
  const userIsAdmin = await isAdmin(currentUserId);
  const userIsInstructor = await isInstructor(currentUserId);

  const where: Prisma.OrderWhereInput = {};

  // ادمین: همه سفارشات
  if (!userIsAdmin) {
    if (userIsInstructor) {
      // مدرس: فقط سفارشاتی که شامل دوره‌های خودش باشه
      where.items = {
        some: {
          course: {
            OR: [
              { instructorId: currentUserId },
              { coInstructors: { some: { id: currentUserId } } },
            ],
          },
        },
      };
    } else {
      // کاربر عادی: فقط سفارشات خودش
      where.userId = currentUserId;
    }
  }

  // جستجو
  if (search.trim()) {
    const trimmed = search.trim();
    where.OR = [
      { id: { contains: trimmed } },
      { user: { name: { contains: trimmed, mode: "insensitive" } } },
      { user: { email: { contains: trimmed, mode: "insensitive" } } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        items: {
          include: {
            product: { select: { title: true } },
            course: { select: { title: true, instructor: { select: { name: true } } } },
          },
        },
        payment: { select: { method: true, status: true, amount: true } },
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.order.count({ where }),
  ]);

  const items = orders.map(o => ({
    id: o.id,
    user: o.user ? { name: o.user.name, email: o.user.email, phone: o.user.phone } : null,
    status: o.status,
    finalAmount: o.finalAmount,
    currency: o.currency,
    itemsCount: o.items.length,
    items: o.items.map(item => ({
      type: item.courseId ? "course" : "product",
      title: item.course?.title || item.product?.title || "-",
      instructor: item.course?.instructor?.name,
    })),
    paymentMethod: o.payment?.method || "-",
    paymentStatus: o.payment?.status || "-",
    createdAt: o.createdAt.toISOString(),
  }));

  // آمار وضعیت (فقط برای ادمین و مدرس — کاربر عادی نیازی نداره)
  let stats: { key: string; count: number }[] = [];
  if (userIsAdmin || userIsInstructor) {
    const statusCounts = await prisma.order.groupBy({
      by: ["status"],
      where,
      _count: { status: true },
    });

    const statusMap: Record<string, number> = {
      PENDING: 0,
      PAID: 0,
      PROCESSING: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
      REFUNDED: 0,
    };

    statusCounts.forEach(({ status, _count }) => {
      if (status in statusMap) statusMap[status] = _count.status;
    });

    stats = Object.entries(statusMap).map(([key, count]) => ({
      key: key.toLowerCase(),
      count,
    }));
  }

  return { items, totalItems: total, stats };
}

/* ==================== عملیات گروهی تغییر وضعیت (فقط ادمین) ==================== */
export async function bulkOrderStatusAction(
  selectedIds: string[],
  newStatus: "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED"
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !(await isAdmin(session.user.id))) {
    return { success: false, message: "دسترسی ممنوع — فقط ادمین" };
  }

  if (selectedIds.length === 0) {
    return { success: false, message: "هیچ سفارشی انتخاب نشده است." };
  }

  try {
    await prisma.order.updateMany({
      where: { id: { in: selectedIds } },
      data: { status: newStatus },
    });

    revalidatePath("/dashboard/admin/orders");
    return {
      success: true,
      message: `${selectedIds.length} سفارش به وضعیت "${newStatus}" تغییر یافت.`,
    };
  } catch (error) {
    console.error("خطا در تغییر وضعیت گروهی:", error);
    return { success: false, message: "خطایی رخ داد." };
  }
}

/* ==================== خروجی CSV (فقط ادمین) ==================== */
export async function exportOrdersCsv() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !(await isAdmin(session.user.id))) {
    throw new Error("دسترسی ممنوع — فقط ادمین");
  }

  const orders = await prisma.order.findMany({
    include: {
      user: { select: { name: true, email: true, phone: true } },
      items: {
        include: {
          product: { select: { title: true } },
          course: { select: { title: true } },
        },
      },
      payment: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "شماره سفارش",
    "نام کاربر",
    "ایمیل",
    "تلفن",
    "وضعیت سفارش",
    "روش پرداخت",
    "مبلغ نهایی (تومان)",
    "تعداد آیتم",
    "تاریخ سفارش",
  ];

  const rows = orders.map(o => [
    o.id,
    o.user?.name || "-",
    o.user?.email || "-",
    o.user?.phone || "-",
    o.status,
    o.payment?.method || "-",
    o.finalAmount.toLocaleString("fa-IR"),
    o.items.length.toString(),
    new Date(o.createdAt).toLocaleDateString("fa-IR"),
  ]);

  const csvLines = [
    headers.join(","),
    ...rows.map(row =>
      row
        .map(cell => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ].join("\n");

  return `\uFEFF${csvLines}`;
}

/* ==================== جزئیات یک سفارش (برای همه نقش‌های مجاز) ==================== */
export async function fetchOrderById(orderId: string, userId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.id !== userId) {
    return null;
  }

  const currentUserId = session.user.id as string;
  const userIsAdmin = await isAdmin(currentUserId);
  const userIsInstructor = await isInstructor(currentUserId);

  const where: Prisma.OrderWhereInput = { id: orderId };

  if (!userIsAdmin) {
    if (userIsInstructor) {
      where.items = {
        some: {
          course: {
            OR: [
              { instructorId: currentUserId },
              { coInstructors: { some: { id: currentUserId } } },
            ],
          },
        },
      };
    } else {
      where.userId = currentUserId;
    }
  }

  const order = await prisma.order.findFirst({
    where,
    include: {
      user: { select: { name: true, email: true, phone: true } },
      items: {
        include: {
          product: { select: { title: true, price: true } },
          course: { select: { title: true, price: true } },
        },
      },
      payment: true,
    },
  });

  if (!order) return null;

  return {
    ...order,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map(item => ({
      type: item.courseId ? "course" : "product",
      title: item.course?.title || item.product?.title,
      price: item.price,
    })),
  };
}