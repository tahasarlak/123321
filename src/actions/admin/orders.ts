// src/actions/admin/orders.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

const PAGE_SIZE = 12;

/**
 * دریافت داده‌های سفارشات برای نمایش در لیست
 */
export async function fetchOrders({
  search = "",
  page = 1,
  searchParams = {},
}: {
  search?: string;
  page?: number;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const where: Prisma.OrderWhereInput = {};

  if (search.trim()) {
    const trimmedSearch = search.trim();
    where.OR = [
      { id: { contains: trimmedSearch } },
      { user: { email: { contains: trimmedSearch, mode: "insensitive" } } },
      { user: { name: { contains: trimmedSearch, mode: "insensitive" } } },
    ];
  }

  // اگر فیلتر وضعیت داشته باشی، بعداً اضافه کن
  // const status = searchParams.status as string | undefined;
  // if (status) where.status = status;

  const [ordersRaw, totalOrders] = await Promise.all([
    prisma.order.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { name: true, email: true } },
        items: {
          include: {
            product: { select: { title: true } },
            course: { select: { title: true } },
          },
        },
        payment: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.count({ where }),
  ]);

  const items = ordersRaw;

  // آمار وضعیت سفارشات
  const statusCounts = await prisma.order.groupBy({
    by: ["status"],
    _count: { status: true },
  });

  const statusMap: Record<string, number> = {
    PAID: 0,
    PROCESSING: 0,
    SHIPPED: 0,
    DELIVERED: 0,
    CANCELLED: 0,
    REFUNDED: 0,
  };

  for (const { status, _count } of statusCounts) {
    if (status in statusMap) statusMap[status] = _count.status;
  }

  const stats = Object.entries(statusMap).map(([key, count]) => ({ key: key.toLowerCase(), count }));

  return { items, totalItems: totalOrders, stats };
}

/**
 * عملیات گروهی تغییر وضعیت سفارشات
 */
export async function bulkOrderStatus(
  selectedIds: string[],
  newStatus: "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED"
) {
  if (selectedIds.length === 0) {
    return {
      success: false,
      message: "هیچ سفارشی انتخاب نشده است.",
    };
  }

  try {
    await prisma.order.updateMany({
      where: { id: { in: selectedIds } },
      data: { status: newStatus },
    });

    return {
      success: true,
      message: `${selectedIds.length} سفارش با موفقیت به وضعیت "${newStatus}" تغییر یافت.`,
    };
  } catch (error) {
    console.error("خطا در تغییر وضعیت گروهی سفارشات:", error);
    return {
      success: false,
      message: "خطایی در انجام عملیات گروهی رخ داد.",
    };
  }
}

/**
 * خروجی CSV از سفارشات
 */
export async function exportOrdersCsv(where: Prisma.OrderWhereInput = {}) {
  try {
    const orders = await prisma.order.findMany({
      where,
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
      "کاربر",
      "ایمیل",
      "تلفن",
      "وضعیت",
      "روش پرداخت",
      "مبلغ نهایی (تومان)",
      "تعداد آیتم",
      "تاریخ ایجاد",
    ];

    const rows = orders.map((o) => [
      o.id,
      o.user?.name || "-",
      o.user?.email || "-",
      o.user?.phone || "-",
      o.status,
      o.payment?.method || "-",
      o.finalAmount.toLocaleString("fa-IR"),
      o.items.length.toLocaleString("fa-IR"),
      new Date(o.createdAt).toLocaleDateString("fa-IR"),
    ]);

    const csvLines = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    return `\uFEFF${csvLines}`;
  } catch (error) {
    console.error("خطا در خروجی CSV سفارشات:", error);
    throw new Error("خطایی در تولید فایل CSV رخ داد.");
  }
}