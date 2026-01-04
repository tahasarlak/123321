// src/actions/admin/products.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

const PAGE_SIZE = 12;

/**
 * دریافت داده‌های محصولات برای نمایش در لیست
 */
export async function fetchProducts({
  search = "",
  page = 1,
  searchParams = {},
}: {
  search?: string;
  page?: number;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const where: Prisma.ProductWhereInput = {};

  if (search.trim()) {
    const trimmedSearch = search.trim();
    where.OR = [
      { title: { contains: trimmedSearch, mode: "insensitive" } },
      { brand: { contains: trimmedSearch, mode: "insensitive" } },
      { sku: { contains: trimmedSearch, mode: "insensitive" } },
      { category: { name: { contains: trimmedSearch, mode: "insensitive" } } },
      { tags: { some: { name: { contains: trimmedSearch, mode: "insensitive" } } } },
    ];
  }

  const [productsRaw, totalProducts] = await Promise.all([
    prisma.product.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        category: { select: { name: true } },
        tags: { select: { name: true } },
        _count: { select: { orderItems: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.count({ where }),
  ]);

  const items = productsRaw.map((p) => ({
    ...p,
    price: Number(p.price?.IRR || 0),
  }));

  // آمار موجودی
  const inStock = productsRaw.filter(p => p.stock > 0).length;
  const outOfStock = totalProducts - inStock;

  const stats = [
    { key: "inStock", count: inStock },
    { key: "outOfStock", count: outOfStock },
  ];

  return { items, totalItems: totalProducts, stats };
}

/**
 * عملیات گروهی فعال/غیرفعال/حذف محصولات
 */
export async function bulkProductAction(
  selectedIds: string[],
  action: "activate" | "deactivate" | "delete"
) {
  if (selectedIds.length === 0) {
    return {
      success: false,
      message: "هیچ محصولی انتخاب نشده است.",
    };
  }

  try {
    if (action === "delete") {
      await prisma.product.deleteMany({
        where: { id: { in: selectedIds } },
      });
      return {
        success: true,
        message: `${selectedIds.length} محصول با موفقیت حذف شدند.`,
      };
    }

    const isActive = action === "activate";

    await prisma.product.updateMany({
      where: { id: { in: selectedIds } },
      data: { isActive },
    });

    return {
      success: true,
      message: `${selectedIds.length} محصول با موفقیت ${isActive ? "فعال" : "غیرفعال"} شدند.`,
    };
  } catch (error) {
    console.error("خطا در عملیات گروهی محصولات:", error);
    return {
      success: false,
      message: "خطایی در انجام عملیات گروهی رخ داد.",
    };
  }
}

/**
 * خروجی CSV از محصولات
 */
export async function exportProductsCsv(where: Prisma.ProductWhereInput = {}) {
  try {
    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        tags: true,
        _count: { select: { orderItems: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "عنوان",
      "برند",
      "دسته‌بندی",
      "قیمت (تومان)",
      "موجودی",
      "وضعیت",
      "تخفیف (%)",
      "تعداد فروش",
      "درآمد (تومان)",
      "تاریخ ایجاد",
    ];

    const rows = products.map((p) => {
      const price = Number(p.price?.IRR || 0);
      const sales = p._count.orderItems;
      const revenue = price * sales;
      return [
        p.title || "-",
        p.brand || "-",
        p.category?.name || "-",
        price.toLocaleString("fa-IR"),
        p.stock.toLocaleString("fa-IR"),
        p.isActive ? "فعال" : "غیرفعال",
        p.discountPercent || 0,
        sales.toLocaleString("fa-IR"),
        revenue.toLocaleString("fa-IR"),
        new Date(p.createdAt).toLocaleDateString("fa-IR"),
      ];
    });

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
    console.error("خطا در خروجی CSV محصولات:", error);
    throw new Error("خطایی در تولید فایل CSV رخ داد.");
  }
}