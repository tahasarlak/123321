"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

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

/* ==================== اسکیماها ==================== */
const baseProductSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  brand: z.string().optional(),
  price: z.object({ IRR: z.coerce.number().positive() }),
  stock: z.coerce.number().int().min(0),
  discountPercent: z.coerce.number().int().min(0).max(100).optional(),
  categoryId: z.string().optional(),
  freeShippingAbove: z.coerce.number().int().optional(),
  shippingMethodIds: z.array(z.string()).optional(),
  paymentAccountIds: z.array(z.string()).optional(),
  image: z.any().optional(), // File یا string
  gallery: z.array(z.any()).optional(), // آرایه فایل‌ها
  honeypot: z.string().optional(),
});

const createProductSchema = baseProductSchema;
const editProductSchema = baseProductSchema.extend({
  id: z.string(),
});

/* ==================== لیست محصولات (فقط ادمین) ==================== */
export async function fetchProducts({
  search = "",
  page = 1,
  userId,
}: {
  search?: string;
  page?: number;
  userId: string;
}) {
  if (!(await isAdmin(userId))) {
    return { items: [], totalItems: 0, stats: [] };
  }

  const where: Prisma.ProductWhereInput = {};

  if (search.trim()) {
    const trimmed = search.trim();
    where.OR = [
      { title: { contains: trimmed, mode: "insensitive" } },
      { brand: { contains: trimmed, mode: "insensitive" } },
      { slug: { contains: trimmed heads, mode: "insensitive" } },
      { category: { name: { contains: trimmed, mode: "insensitive" } } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: { select: { name: true } },
        tags: { select: { name: true } },
        _count: { select: { orderItems: true } },
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.product.count({ where }),
  ]);

  const items = products.map(p => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    brand: p.brand,
    price: Number(p.price?.IRR || 0),
    stock: p.stock,
    discountPercent: p.discountPercent,
    image: p.image,
    category: p.category?.name,
    tags: p.tags.map(t => t.name),
    salesCount: p._count.orderItems,
    isActive: p.isActive,
    isVisible: p.isVisible,
    createdAt: p.createdAt.toISOString(),
  }));

  const inStock = products.filter(p => p.stock > 0).length;
  const outOfStock = total - inStock;

  return {
    items,
    totalItems: total,
    stats: [
      { key: "total", count: total },
      { key: "inStock", count: inStock },
      { key: "outOfStock", count: outOfStock },
    ],
  };
}

/* ==================== ایجاد محصول (ادمین) ==================== */
export async function createProductAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("common");

  if (!session?.user?.id || !(await isAdmin(session.user.id))) {
    return { success: false, error: "دسترسی ممنوع" };
  }

  const raw = Object.fromEntries(formData);
  const parsed = createProductSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "داده‌های نامعتبر" };

  const data = parsed.data;
  if (data.honeypot && data.honeypot.length > 0) return { success: true };

  // پردازش تصویر اصلی
  let imageUrl = "/placeholder-product.jpg";
  if (data.image && typeof data.image === "object" && data.image.size > 0) {
    const file = data.image as File;
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `product-${Date.now()}.webp`;
    const filepath = path.join(process.cwd(), "public/uploads/products", filename);
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await sharp(buffer).resize(800, 800, { fit: "cover" }).webp({ quality: 80 }).toFile(filepath);
    imageUrl = `/uploads/products/${filename}`;
  }

  // پردازش گالری
  const galleryUrls: string[] = [];
  if (data.gallery && Array.isArray(data.gallery)) {
    for (const file of data.gallery) {
      if (file && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = `gallery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.webp`;
        const filepath = path.join(process.cwd(), "public/uploads/products", filename);
        await sharp(buffer).resize(1200, 1200, { fit: "inside" }).webp({ quality: 85 }).toFile(filepath);
        galleryUrls.push(`/uploads/products/${filename}`);
      }
    }
  }

  await prisma.product.create({
    data: {
      title: data.title,
      slug: data.slug,
      description: data.description || null,
      brand: data.brand || null,
      price: data.price,
      stock: data.stock,
      discountPercent: data.discountPercent || null,
      image: imageUrl,
      gallery: galleryUrls.length > 0 ? galleryUrls : undefined,
      freeShippingAbove: data.freeShippingAbove || null,
      isActive: true,
      isVisible: true,
      category: data.categoryId ? { connect: { id: data.categoryId } } : undefined,
      shippingMethods: data.shippingMethodIds?.length
        ? { connect: data.shippingMethodIds.map(id => ({ id })) }
        : undefined,
      paymentAccounts: data.paymentAccountIds?.length
        ? { connect: data.paymentAccountIds.map(id => ({ id })) }
        : undefined,
    },
  });

  revalidatePath("/dashboard/admin/products");
  return { success: true, message: "محصول با موفقیت ایجاد شد" };
}

/* ==================== ویرایش محصول (ادمین) ==================== */
export async function editProductAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !(await isAdmin(session.user.id))) {
    return { success: false, error: "دسترسی ممنوع" };
  }

  const raw = Object.fromEntries(formData);
  const parsed = editProductSchema.safeParse(raw);
  if (!parsed.success || !parsed.data.id) return { success: false, error: "داده نامعتبر" };

  const data = parsed.data;
  if (data.honeypot && data.honeypot.length > 0) return { success: true };

  const existing = await prisma.product.findUnique({ where: { id: data.id } });
  if (!existing) return { success: false, error: "محصول یافت نشد" };

  // پردازش تصویر جدید (اگر آپلود شده)
  let imageUrl = existing.image;
  if (data.image && typeof data.image === "object" && data.image.size > 0) {
    // حذف تصویر قبلی اگر محلی باشه
    if (imageUrl && imageUrl.startsWith("/uploads/products/")) {
      try { await fs.unlink(path.join(process.cwd(), "public", imageUrl)); } catch {}
    }
    const file = data.image as File;
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `product-${Date.now()}.webp`;
    const filepath = path.join(process.cwd(), "public/uploads/products", filename);
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await sharp(buffer).resize(800, 800, { fit: "cover" }).webp({ quality: 80 }).toFile(filepath);
    imageUrl = `/uploads/products/${filename}`;
  }

  // گالری (در این نسخه ساده، فقط جایگزین می‌شه — می‌تونی بعداً پیشرفته‌تر کنی)
  const galleryUrls: string[] = existing.gallery as string[] || [];
  // اگر بخوای گالری جدید جایگزین بشه، منطق اضافه کن

  const updateData: any = {
    title: data.title,
    slug: data.slug,
    description: data.description || null,
    brand: data.brand || null,
    price: data.price,
    stock: data.stock,
    discountPercent: data.discountPercent || null,
    image: imageUrl,
    gallery: galleryUrls,
    freeShippingAbove: data.freeShippingAbove || null,
    category: data.categoryId ? { connect: { id: data.categoryId } } : { disconnect: true },
    shippingMethods: data.shippingMethodIds
      ? { set: [], connect: data.shippingMethodIds.map(id => ({ id })) }
      : { set: [] },
    paymentAccounts: data.paymentAccountIds
      ? { set: [], connect: data.paymentAccountIds.map(id => ({ id })) }
      : { set: [] },
  };

  await prisma.product.update({
    where: { id: data.id },
    data: updateData,
  });

  revalidatePath("/dashboard/admin/products");
  return { success: true, message: "محصول با موفقیت ویرایش شد" };
}

/* ==================== عملیات گروهی ==================== */
export async function bulkProductAction(
  selectedIds: string[],
  action: "activate" | "deactivate" | "delete",
  userId: string
) {
  if (!(await isAdmin(userId))) return { success: false, message: "دسترسی ممنوع" };

  if (selectedIds.length === 0) return { success: false, message: "هیچ محصولی انتخاب نشده" };

  if (action === "delete") {
    await prisma.product.deleteMany({ where: { id: { in: selectedIds } } });
  } else {
    await prisma.product.updateMany({
      where: { id: { in: selectedIds } },
      data: { isActive: action === "activate" },
    });
  }

  revalidatePath("/dashboard/admin/products");
  return { success: true, message: `${selectedIds.length} محصول با موفقیت ${action === "delete" ? "حذف" : action === "activate" ? "فعال" : "غیرفعال"} شدند` };
}

/* ==================== تغییر وضعیت تک محصول ==================== */
export async function toggleProductAction(productId: string, userId: string) {
  if (!(await isAdmin(userId))) return { success: false, error: "دسترسی ممنوع" };

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return { success: false, error: "محصول یافت نشد" };

  await prisma.product.update({
    where: { id: productId },
    data: { isActive: !product.isActive },
  });

  revalidatePath("/dashboard/admin/products");
  return { success: true, message: `محصول اکنون ${!product.isActive ? "فعال" : "غیرفعال"} شد` };
}

/* ==================== حذف تک محصول ==================== */
export async function deleteProductAction(productId: string, userId: string) {
  if (!(await isAdmin(userId))) return { success: false, error: "دسترسی ممنوع" };

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { image: true, gallery: true },
  });
  if (!product) return { success: false, error: "محصول یافت نشد" };

  const deleteFile = async (filePath: string) => {
    if (!filePath || filePath.startsWith("/placeholder") || filePath.startsWith("http")) return;
    const fullPath = path.join(process.cwd(), "public", filePath);
    try { await fs.unlink(fullPath); } catch (err) { console.warn("فایل حذف نشد:", fullPath); }
  };

  if (product.image) await deleteFile(product.image);
  if (Array.isArray(product.gallery)) {
    for (const img of product.gallery) {
      if (typeof img === "string") await deleteFile(img);
    }
  }

  await prisma.product.delete({ where: { id: productId } });
  revalidatePath("/dashboard/admin/products");
  return { success: true, message: "محصول با موفقیت حذف شد" };
}

/* ==================== خروجی CSV ==================== */
export async function exportProductsCsv(userId: string) {
  if (!(await isAdmin(userId))) throw new Error("دسترسی ممنوع");

  const products = await prisma.product.findMany({
    include: {
      category: true,
      tags: true,
      _count: { select: { orderItems: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const headers = ["عنوان", "برند", "دسته‌بندی", "قیمت (تومان)", "موجودی", "تخفیف (%)", "فروش", "وضعیت", "تاریخ ایجاد"];
  const rows = products.map(p => {
    const price = Number(p.price?.IRR || 0);
    const sales = p._count.orderItems;
    return [
      p.title,
      p.brand || "-",
      p.category?.name || "-",
      price.toLocaleString("fa-IR"),
      p.stock.toLocaleString("fa-IR"),
      p.discountPercent || "0",
      sales.toLocaleString("fa-IR"),
      p.isActive ? "فعال" : "غیرفعال",
      new Date(p.createdAt).toLocaleDateString("fa-IR"),
    ];
  });

  const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
  return `\uFEFF${csv}`;
}