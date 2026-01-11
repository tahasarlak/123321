// src/server/public/Handler/adminProducts.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import fs from "fs/promises";
import path from "path";
import {
  createProductSchema,
  editProductSchema,
} from "@/lib/validations/adminProducts";
import { faAdminProductsMessages } from "@/lib/validations/adminProducts/messages";
import type { ProductResult } from "@/types/adminProducts";

const PAGE_SIZE = 12;

async function hasAdminAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { role: true } } },
  });
  return user?.roles.some((r) => ["ADMIN", "SUPERADMIN"].includes(r.role)) ?? false;
}

// دریافت لیست محصولات + آمار موجودی
export async function handleFetchProducts({
  search = "",
  page = 1,
  searchParams = {},
}: {
  search?: string;
  page?: number;
  searchParams?: Record<string, string | string[] | undefined>;
}): Promise<{
  items: any[];
  totalItems: number;
  stats: { key: string; count: number }[];
}> {
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

  const inStock = productsRaw.filter((p) => p.stock > 0).length;
  const outOfStock = totalProducts - inStock;

  const stats = [
    { key: "inStock", count: inStock },
    { key: "outOfStock", count: outOfStock },
    { key: "total", count: totalProducts },
  ];

  return { items, totalItems: totalProducts, stats };
}

// عملیات گروهی
export async function handleBulkProductAction(
  selectedIds: string[],
  action: "activate" | "deactivate" | "delete"
): Promise<{ success: boolean; message: string }> {
  if (selectedIds.length === 0) {
    return { success: false, message: "هیچ محصولی انتخاب نشده است." };
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
    return { success: false, message: "خطایی در انجام عملیات گروهی رخ داد." };
  }
}

// خروجی CSV
export async function handleExportProductsCsv(
  where: Prisma.ProductWhereInput = {}
): Promise<string> {
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
      "تگ‌ها",
      "قیمت (تومان)",
      "موجودی",
      "وضعیت",
      "تخفیف (%)",
      "تعداد فروش",
      "درآمد کل (تومان)",
      "تاریخ ایجاد",
    ];

    const rows = products.map((p) => {
      const price = Number(p.price?.IRR || 0);
      const sales = p._count.orderItems;
      const revenue = price * sales;
      const tags = p.tags.map((t) => t.name).join("، ") || "-";

      return [
        p.title || "-",
        p.brand || "-",
        p.category?.name || "-",
        tags,
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
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return `\uFEFF${csvLines}`;
  } catch (error) {
    console.error("خطا در خروجی CSV محصولات:", error);
    throw new Error("خطایی در تولید فایل CSV رخ داد.");
  }
}

// ایجاد محصول
export async function handleCreateProduct(
  data: unknown,
  adminUserId: string
): Promise<ProductResult> {
  if (!(await hasAdminAccess(adminUserId))) {
    return { success: false, error: faAdminProductsMessages.unauthorized };
  }

  const parsed = createProductSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: faAdminProductsMessages.server_error };
  }

  const {
    title,
    slug,
    categoryId,
    price,
    description,
    brand,
    stock,
    discountPercent,
    image,
    gallery,
    freeShippingAbove,
    shippingMethodIds,
    paymentAccountIds,
    honeypot,
  } = parsed.data;

  if (honeypot && honeypot.length > 0) return { success: true };

  await prisma.product.create({
    data: {
      title,
      slug,
      description: description || null,
      brand: brand || null,
      price,
      stock,
      discountPercent: discountPercent || null,
      image: image || "/placeholder-product.jpg",
      gallery: gallery || [],
      freeShippingAbove: freeShippingAbove || null,
      shippingCountries: [], // اگر فیلد اجباریه
      isActive: true,
      isVisible: true,
      category: { connect: { id: categoryId } },
      shippingMethods: shippingMethodIds?.length
        ? { connect: shippingMethodIds.map((id) => ({ id })) }
        : undefined,
      paymentAccounts: paymentAccountIds?.length
        ? { connect: paymentAccountIds.map((id) => ({ id })) }
        : undefined,
    },
  });

  return { success: true, message: "محصول با موفقیت ایجاد شد" };
}

// ویرایش محصول
export async function handleEditProduct(
  data: unknown,
  adminUserId: string
): Promise<ProductResult> {
  if (!(await hasAdminAccess(adminUserId))) {
    return { success: false, error: faAdminProductsMessages.unauthorized };
  }

  const parsed = editProductSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: faAdminProductsMessages.server_error };
  }

  const { id, ...updateData } = parsed.data;

  // مدیریت اتصال/قطع روابط
  const connectShipping = updateData.shippingMethodIds?.map((id: string) => ({ id }));
  const connectPayment = updateData.paymentAccountIds?.map((id: string) => ({ id }));

  const finalData: any = {
    ...updateData,
    shippingMethods: connectShipping ? { set: [], connect: connectShipping } : undefined,
    paymentAccounts: connectPayment ? { set: [], connect: connectPayment } : undefined,
  };

  await prisma.product.update({
    where: { id },
    data: finalData,
  });

  return { success: true, message: "محصول با موفقیت ویرایش شد" };
}

// تغییر وضعیت تک محصول
export async function handleToggleProduct(
  productId: string,
  adminUserId: string
): Promise<ProductResult> {
  if (!(await hasAdminAccess(adminUserId))) {
    return { success: false, error: faAdminProductsMessages.unauthorized };
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return { success: false, error: faAdminProductsMessages.product_not_found };

  await prisma.product.update({
    where: { id: productId },
    data: { isActive: !product.isActive },
  });

  return {
    success: true,
    message: `محصول اکنون ${!product.isActive ? "فعال" : "غیرفعال"} است.`,
  };
}

// حذف تک محصول + حذف فایل‌های تصویر
export async function handleDeleteProduct(
  productId: string,
  adminUserId: string
): Promise<ProductResult> {
  if (!(await hasAdminAccess(adminUserId))) {
    return { success: false, error: faAdminProductsMessages.unauthorized };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { image: true, gallery: true },
  });

  if (!product) return { success: false, error: faAdminProductsMessages.product_not_found };

  const deleteFile = async (filePath: string) => {
    if (!filePath || filePath.startsWith("/placeholder") || filePath.startsWith("http")) return;
    const fullPath = path.join(process.cwd(), "public", filePath);
    try {
      await fs.unlink(fullPath);
    } catch (err) {
      console.warn("فایل حذف نشد:", fullPath);
    }
  };

  if (product.image) await deleteFile(product.image);

  if (Array.isArray(product.gallery)) {
    for (const img of product.gallery) {
      if (typeof img === "string") await deleteFile(img);
    }
  }

  await prisma.product.delete({ where: { id: productId } });

  return { success: true, message: "محصول با موفقیت حذف شد" };
}