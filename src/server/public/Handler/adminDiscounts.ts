// src/server/public/Handler/adminDiscounts.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { createDiscountSchema } from "@/lib/validations/adminDiscounts";
import { faAdminDiscountsMessages } from "@/lib/validations/adminDiscounts/messages";
import type { DiscountResult } from "@/types/adminDiscounts";

async function hasAdminAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { role: true } } },
  });
  return user?.roles.some((r) => ["ADMIN", "SUPERADMIN"].includes(r.role)) ?? false;
}

export async function handleCreateDiscount(data: unknown, adminUserId: string): Promise<DiscountResult> {
  if (!(await hasAdminAccess(adminUserId))) return { success: false, error: faAdminDiscountsMessages.unauthorized };

  const parsed = createDiscountSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faAdminDiscountsMessages.required_fields };

  const {
    title,
    code,
    description,
    type,
    value,
    minimumAmount,
    maxDiscountAmount,
    startsAt,
    endsAt,
    isActive,
    productIds,
    categoryIds,
    honeypot,
  } = parsed.data;

  if (honeypot && honeypot.length > 0) return { success: true };

  const existing = await prisma.discount.findUnique({ where: { code } });
  if (existing) return { success: false, error: faAdminDiscountsMessages.code_duplicate };

  const discount = await prisma.discount.create({
    data: {
      title,
      code,
      description,
      type,
      value,
      minimumAmount,
      maxDiscountAmount,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      isActive,
      products: productIds?.length ? { connect: productIds.map(id => ({ id })) } : undefined,
      categories: categoryIds?.length ? { connect: categoryIds.map(id => ({ id })) } : undefined,
    },
  });

  return { success: true, message: "کد تخفیف با موفقیت ایجاد شد", discount };
}

export async function handleGetDiscounts(): Promise<DiscountResult> {
  const discounts = await prisma.discount.findMany({
    select: {
      id: true,
      code: true,
      title: true,
      description: true,
      type: true,
      value: true,
      minimumAmount: true,
      maxDiscountAmount: true,
      startsAt: true,
      endsAt: true,
      isActive: true,
      createdAt: true,
      products: { select: { title: true } },
      _count: { select: { usages: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const activeDiscounts = discounts.filter(d => d.isActive).length;
  const totalUsed = discounts.reduce((sum, d) => sum + d._count.usages, 0);

  return { success: true, discounts, stats: { activeDiscounts, totalDiscounts: discounts.length, totalUsed } };
}