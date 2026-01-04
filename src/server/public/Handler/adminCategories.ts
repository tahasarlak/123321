// src/server/public/Handler/adminCategories.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { createCategorySchema, editCategorySchema } from "@/lib/validations/adminCategories";
import { faAdminCategoriesMessages } from "@/lib/validations/adminCategories/messages";
import type { CategoryResult } from "@/types/adminCategories";

async function hasAdminAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { role: true } } },
  });
  return user?.roles.some((r) => ["ADMIN", "SUPERADMIN"].includes(r.role)) ?? false;
}

export async function handleCreateCategory(data: unknown, adminUserId: string): Promise<CategoryResult> {
  if (!(await hasAdminAccess(adminUserId))) return { success: false, error: faAdminCategoriesMessages.unauthorized };

  const parsed = createCategorySchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faAdminCategoriesMessages.name_required };

  const { name, honeypot } = parsed.data;
  if (honeypot && honeypot.length > 0) return { success: true };

  const baseSlug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  let slug = baseSlug;
  let counter = 1;
  while (await prisma.category.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  const category = await prisma.category.create({
    data: { name: name.trim(), slug },
    include: {
      _count: {
        select: { products: true, courses: true },
      },
    },
  });

  const formattedCategory = {
    id: category.id,
    name: category.name,
    slug: category.slug,
    productCount: category._count.products,
    courseCount: category._count.courses,
  };

  return { success: true, message: "دسته‌بندی با موفقیت ایجاد شد", category: formattedCategory };
}

export async function handleEditCategory(data: unknown, adminUserId: string): Promise<CategoryResult> {
  if (!(await hasAdminAccess(adminUserId))) return { success: false, error: faAdminCategoriesMessages.unauthorized };

  const parsed = editCategorySchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faAdminCategoriesMessages.name_required };

  const { id, name } = parsed.data;

  let slug = undefined;
  if (name) {
    const baseSlug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    let newSlug = baseSlug;
    let counter = 1;
    while (await prisma.category.findUnique({ where: { slug: newSlug, NOT: { id } } })) {
      newSlug = `${baseSlug}-${counter}`;
      counter++;
    }
    slug = newSlug;
  }

  const category = await prisma.category.update({
    where: { id },
    data: { name: name?.trim(), slug },
    include: {
      _count: {
        select: { products: true, courses: true },
      },
    },
  });

  const formattedCategory = {
    id: category.id,
    name: category.name,
    slug: category.slug,
    productCount: category._count.products,
    courseCount: category._count.courses,
  };

  return { success: true, message: "دسته‌بندی با موفقیت ویرایش شد", category: formattedCategory };
}

export async function handleDeleteCategory(categoryId: string, adminUserId: string): Promise<CategoryResult> {
  if (!(await hasAdminAccess(adminUserId))) return { success: false, error: faAdminCategoriesMessages.unauthorized };

  const usage = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { _count: { select: { products: true, courses: true } } },
  });

  if ((usage?._count?.products ?? 0) > 0 || (usage?._count?.courses ?? 0) > 0) {
    return { success: false, error: faAdminCategoriesMessages.in_use };
  }

  await prisma.category.delete({ where: { id: categoryId } });

  return { success: true, message: "دسته‌بندی با موفقیت حذف شد" };
}