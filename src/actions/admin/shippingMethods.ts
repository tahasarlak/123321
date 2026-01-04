// src/actions/admin/shippingMethods.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

const PAGE_SIZE = 12;

/**
 * دریافت داده‌های روش‌های ارسال برای نمایش در لیست
 */
export async function fetchShippingMethods({
  search = "",
  page = 1,
  searchParams = {},
}: {
  search?: string;
  page?: number;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const where: Prisma.ShippingMethodWhereInput = {};

  if (search.trim()) {
    const trimmedSearch = search.trim();
    where.OR = [
      { title: { contains: trimmedSearch, mode: "insensitive" } },
      { description: { contains: trimmedSearch, mode: "insensitive" } },
    ];
  }

  const [methodsRaw, totalMethods] = await Promise.all([
    prisma.shippingMethod.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { priority: "desc" },
    }),
    prisma.shippingMethod.count({ where }),
  ]);

  const items = methodsRaw;

  // آمار وضعیت
  const active = methodsRaw.filter(m => m.isActive).length;
  const inactive = totalMethods - active;

  const stats = [
    { key: "active", count: active },
    { key: "inactive", count: inactive },
  ];

  return { items, totalItems: totalMethods, stats };
}

/**
 * تغییر وضعیت روش ارسال (فعال/غیرفعال)
 */
export async function toggleMethod(id: string, current: boolean) {
  try {
    await prisma.shippingMethod.update({
      where: { id },
      data: { isActive: !current },
    });

    revalidatePath("/dashboard/admin/shipping-methods");
    return { success: true };
  } catch (error) {
    console.error("Error toggling shipping method:", error);
    return { success: false, error: "خطا در تغییر وضعیت روش ارسال" };
  }
}

/**
 * حذف روش ارسال
 */
export async function deleteMethod(id: string) {
  try {
    await prisma.shippingMethod.delete({
      where: { id },
    });

    revalidatePath("/dashboard/admin/shipping-methods");
    return { success: true };
  } catch (error) {
    console.error("Error deleting shipping method:", error);
    return { success: false, error: "خطا در حذف روش ارسال" };
  }
}

/**
 * خروجی CSV از روش‌های ارسال
 */
export async function exportShippingMethodsCsv(where: Prisma.ShippingMethodWhereInput = {}) {
  try {
    const methods = await prisma.shippingMethod.findMany({
      where,
      orderBy: { priority: "desc" },
    });

    const headers = [
      "عنوان",
      "توضیحات",
      "هزینه (تومان)",
      "وضعیت",
      "اولویت",
      "تاریخ ایجاد",
    ];

    const rows = methods.map((m) => [
      m.title,
      m.description || "-",
      m.cost.toLocaleString("fa-IR"),
      m.isActive ? "فعال" : "غیرفعال",
      m.priority.toString(),
      new Date(m.createdAt).toLocaleDateString("fa-IR"),
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
    console.error("خطا در خروجی CSV روش‌های ارسال:", error);
    throw new Error("خطایی در تولید فایل CSV رخ داد.");
  }
}