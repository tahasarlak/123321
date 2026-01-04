// src/server/public/Handler/adminProducts.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import fs from "fs/promises";
import path from "path";
import { createProductSchema, editProductSchema } from "@/lib/validations/adminProducts";
import { faAdminProductsMessages } from "@/lib/validations/adminProducts/messages";
import type { ProductResult } from "@/types/adminProducts";

async function hasAdminAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { role: true } } },
  });
  return user?.roles.some((r) => ["ADMIN", "SUPERADMIN"].includes(r.role)) ?? false;
}

export async function handleCreateProduct(data: unknown, adminUserId: string): Promise<ProductResult> {
  if (!(await hasAdminAccess(adminUserId))) return { success: false, error: faAdminProductsMessages.unauthorized };

  const parsed = createProductSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faAdminProductsMessages.server_error };

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
      freeShippingAbove,
      shippingCountries: [], // اجباری در Prisma
      isActive: true,
      isVisible: true,
      category: { connect: { id: categoryId } },
      shippingMethods: shippingMethodIds?.length ? { connect: shippingMethodIds.map(id => ({ id })) } : undefined,
      paymentAccounts: paymentAccountIds?.length ? { connect: paymentAccountIds.map(id => ({ id })) } : undefined,
    },
  });

  return { success: true, message: "محصول با موفقیت ایجاد شد" };
}

export async function handleEditProduct(data: unknown, adminUserId: string): Promise<ProductResult> {
  if (!(await hasAdminAccess(adminUserId))) return { success: false, error: faAdminProductsMessages.unauthorized };

  const parsed = editProductSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faAdminProductsMessages.server_error };

  const { id, ...updateData } = parsed.data;

  await prisma.product.update({
    where: { id },
    data: updateData as any,
  });

  return { success: true, message: "محصول با موفقیت ویرایش شد" };
}

export async function handleToggleProduct(productId: string, adminUserId: string): Promise<ProductResult> {
  if (!(await hasAdminAccess(adminUserId))) return { success: false, error: faAdminProductsMessages.unauthorized };

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return { success: false, error: faAdminProductsMessages.product_not_found };

  await prisma.product.update({
    where: { id: productId },
    data: { isActive: !product.isActive },
  });

  return { success: true, message: `محصول ${!product.isActive ? "فعال" : "غیرفعال"} شد` };
}

export async function handleDeleteProduct(productId: string, adminUserId: string): Promise<ProductResult> {
  if (!(await hasAdminAccess(adminUserId))) return { success: false, error: faAdminProductsMessages.unauthorized };

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { image: true, gallery: true },
  });

  if (!product) return { success: false, error: faAdminProductsMessages.product_not_found };

  const deleteFile = async (filePath: string) => {
    if (!filePath || filePath.startsWith("/placeholder")) return;
    const fullPath = path.join(process.cwd(), "public", filePath);
    try {
      await fs.unlink(fullPath);
    } catch (err) {
      console.warn("فایل حذف نشد:", fullPath);
    }
  };

  if (product.image) await deleteFile(product.image);

  // gallery Json هست — چک type
  if (Array.isArray(product.gallery)) {
    for (const img of product.gallery) {
      if (typeof img === "string") await deleteFile(img);
    }
  }

  await prisma.product.delete({ where: { id: productId } });

  return { success: true, message: "محصول با موفقیت حذف شد" };
}