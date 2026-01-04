// src/actions/admin/discounts.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

const PAGE_SIZE = 12;

/**
 * دریافت داده‌های کدهای تخفیف برای نمایش در لیست
 */
export async function fetchDiscounts({
  search = "",
  page = 1,
  searchParams = {},
}: {
  search?: string;
  page?: number;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const where: Prisma.DiscountWhereInput = {};

  if (search.trim()) {
    const trimmedSearch = search.trim();
    where.OR = [
      { code: { contains: trimmedSearch, mode: "insensitive" } },
      { title: { contains: trimmedSearch, mode: "insensitive" } },
    ];
  }

  const [discountsRaw, totalDiscounts] = await Promise.all([
    prisma.discount.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        products: { select: { title: true } },
        _count: { select: { usages: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.discount.count({ where }),
  ]);

  const items = discountsRaw;

  // آمار ساده: فعال / غیرفعال
  const active = discountsRaw.filter(d => d.isActive).length;
  const inactive = totalDiscounts - active;

  const stats = [
    { key: "active", count: active },
    { key: "inactive", count: inactive },
  ];

  return { items, totalItems: totalDiscounts, stats };
}

/**
 * عملیات گروهی فعال/غیرفعال/حذف کدهای تخفیف
 */
export async function bulkDiscountAction(
  selectedIds: string[],
  action: "activate" | "deactivate" | "delete"
) {
  if (selectedIds.length === 0) {
    return {
      success: false,
      message: "هیچ کد تخفیفی انتخاب نشده است.",
    };
  }

  try {
    if (action === "delete") {
      await prisma.discount.deleteMany({
        where: { id: { in: selectedIds } },
      });
      return {
        success: true,
        message: `${selectedIds.length} کد تخفیف با موفقیت حذف شدند.`,
      };
    }

    const isActive = action === "activate";

    await prisma.discount.updateMany({
      where: { id: { in: selectedIds } },
      data: { isActive },
    });

    return {
      success: true,
      message: `${selectedIds.length} کد تخفیف با موفقیت ${isActive ? "فعال" : "غیرفعال"} شدند.`,
    };
  } catch (error) {
    console.error("خطا در عملیات گروهی کدهای تخفیف:", error);
    return {
      success: false,
      message: "خطایی در انجام عملیات گروهی رخ داد.",
    };
  }
}

/**
 * خروجی CSV از کدهای تخفیف
 */
export async function exportDiscountsCsv(where: Prisma.DiscountWhereInput = {}) {
  try {
    const discounts = await prisma.discount.findMany({
      where,
      include: {
        products: { select: { title: true } },
        _count: { select: { usages: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "کد",
      "عنوان",
      "نوع",
      "مقدار",
      "حداقل خرید",
      "شروع",
      "پایان",
      "وضعیت",
      "تعداد استفاده",
    ];

    const rows = discounts.map((d) => [
      d.code,
      d.title || "-",
      d.type === "PERCENT" ? "درصدی" : "مقداری",
      d.type === "PERCENT" ? `${d.value}%` : `${d.value.toLocaleString("fa-IR")} تومان`,
      d.minimumAmount?.toLocaleString("fa-IR") || "-",
      d.startsAt ? new Date(d.startsAt).toLocaleDateString("fa-IR") : "-",
      d.endsAt ? new Date(d.endsAt).toLocaleDateString("fa-IR") : "-",
      d.isActive ? "فعال" : "غیرفعال",
      d._count.usages.toLocaleString("fa-IR"),
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
    console.error("خطا در خروجی CSV کدهای تخفیف:", error);
    throw new Error("خطایی در تولید فایل CSV رخ داد.");
  }
}