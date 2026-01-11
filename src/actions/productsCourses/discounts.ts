"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const PAGE_SIZE = 12;

// چک ادمین
async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { role: true } } },
  });
  return user?.roles.some(r => ["ADMIN", "SUPER_ADMIN"].includes(r.role)) || false;
}

// چک دسترسی مدرس به دوره‌ها
async function isInstructorOfCourses(userId: string, courseIds: string[]): Promise<boolean> {
  if (courseIds.length === 0) return true;
  const courses = await prisma.course.findMany({
    where: {
      id: { in: courseIds },
      OR: [
        { instructorId: userId },
        { coInstructors: { some: { id: userId } } },
      ],
    },
    select: { id: true },
  });
  return courses.length === courseIds.length;
}

// اسکیما مشترک (ادمین همه گزینه‌ها رو داره، مدرس محدودتر)
const baseDiscountSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(3).max(50),
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.coerce.number().int().positive(),
  minimumAmount: z.coerce.number().int().optional(),
  maximumAmount: z.coerce.number().int().optional(),
  usageLimitType: z.enum(["UNLIMITED", "TOTAL_LIMIT", "ONCE_PER_USER", "DAILY_LIMIT"]),
  usageLimit: z.coerce.number().int().optional(),
  dailyLimit: z.coerce.number().int().optional(),
  oncePerUser: z.coerce.boolean().default(true),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  isActive: z.coerce.boolean().default(true),
  honeypot: z.string().optional(),
});

// اسکیما برای ادمین (کامل)
const adminDiscountSchema = baseDiscountSchema.extend({
  scope: z.enum(["ALL", "SPECIFIC_COURSES", "SPECIFIC_PRODUCTS", "CATEGORIES", "FIRST_PURCHASE", "MINIMUM_AMOUNT"]),
  applyTo: z.enum(["COURSES_ONLY", "PRODUCTS_ONLY", "BOTH"]).default("BOTH"),
  courseIds: z.array(z.string()).optional(),
  productIds: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
});

// اسکیما برای مدرس (فقط دوره‌های خودش)
const instructorDiscountSchema = baseDiscountSchema.extend({
  scope: z.literal("SPECIFIC_COURSES"), // اجباری
  courseIds: z.array(z.string()).min(1, "حداقل یک دوره انتخاب کنید"),
});

/* ==================== بخش ادمین ==================== */

// لیست همه تخفیف‌ها (فقط ادمین)
export async function fetchDiscounts({
  search = "",
  page = 1,
  userId,
}: {
  search?: string;
  page?: number;
  userId: string;
}) {
  if (!(await isAdmin(userId))) return { items: [], totalItems: 0, stats: [] };

  const where: Prisma.DiscountWhereInput = search
    ? {
        OR: [
          { code: { contains: search, mode: "insensitive" } },
          { title: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const [discounts, total] = await Promise.all([
    prisma.discount.findMany({
      where,
      include: {
        courses: { select: { title: true } },
        products: { select: { title: true } },
        categories: { select: { name: true } },
        createdBy: { select: { name: true } },
        _count: { select: { usages: true } },
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.discount.count({ where }),
  ]);

  const active = discounts.filter(d => d.isActive).length;

  return {
    items: discounts,
    totalItems: total,
    stats: [
      { key: "total", count: total },
      { key: "active", count: active },
      { key: "inactive", count: total - active },
    ],
  };
}

// ایجاد توسط ادمین
export async function createDiscountAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("common");

  if (!session?.user?.id || !(await isAdmin(session.user.id))) {
    return { success: false, error: "دسترسی ممنوع" };
  }

  const raw = Object.fromEntries(formData);
  const parsed = adminDiscountSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "داده‌های نامعتبر" };

  const data = parsed.data;
  if (data.honeypot && data.honeypot.length > 0) return { success: true };

  const existing = await prisma.discount.findUnique({ where: { code: data.code.toUpperCase() } });
  if (existing) return { success: false, error: "این کد قبلاً استفاده شده" };

  const discount = await prisma.discount.create({
    data: {
      code: data.code.toUpperCase(),
      title: data.title,
      description: data.description,
      type: data.type,
      value: data.value,
      scope: data.scope,
      applyTo: data.applyTo,
      minimumAmount: data.minimumAmount,
      maximumAmount: data.maximumAmount,
      usageLimitType: data.usageLimitType,
      usageLimit: data.usageLimit,
      dailyLimit: data.dailyLimit,
      oncePerUser: data.oncePerUser,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      isActive: data.isActive,
      createdById: session.user.id as string,
      courses: data.courseIds ? { connect: data.courseIds.map(id => ({ id })) } : undefined,
      products: data.productIds ? { connect: data.productIds.map(id => ({ id })) } : undefined,
      categories: data.categoryIds ? { connect: data.categoryIds.map(id => ({ id })) } : undefined,
    },
  });

  revalidatePath("/dashboard/admin/discounts");
  return { success: true, message: "کد تخفیف ایجاد شد", discount };
}

// ویرایش توسط ادمین
export async function editDiscountAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !(await isAdmin(session.user.id))) {
    return { success: false, error: "دسترسی ممنوع" };
  }

  const raw = Object.fromEntries(formData);
  const parsed = adminDiscountSchema.safeParse(raw);
  if (!parsed.success || !parsed.data.id) return { success: false, error: "داده نامعتبر" };

  const data = parsed.data;
  if (data.honeypot && data.honeypot.length > 0) return { success: true };

  const codeCheck = await prisma.discount.findFirst({
    where: { code: data.code.toUpperCase(), NOT: { id: data.id } },
  });
  if (codeCheck) return { success: false, error: "این کد قبلاً استفاده شده" };

  const discount = await prisma.discount.update({
    where: { id: data.id },
    data: {
      code: data.code.toUpperCase(),
      title: data.title,
      description: data.description,
      type: data.type,
      value: data.value,
      scope: data.scope,
      applyTo: data.applyTo,
      minimumAmount: data.minimumAmount,
      maximumAmount: data.maximumAmount,
      usageLimitType: data.usageLimitType,
      usageLimit: data.usageLimit,
      dailyLimit: data.dailyLimit,
      oncePerUser: data.oncePerUser,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      isActive: data.isActive,
      courses: data.courseIds ? { set: [], connect: data.courseIds.map(id => ({ id })) } : { set: [] },
      products: data.productIds ? { set: [], connect: data.productIds.map(id => ({ id })) } : { set: [] },
      categories: data.categoryIds ? { set: [], connect: data.categoryIds.map(id => ({ id })) } : { set: [] },
    },
  });

  revalidatePath("/dashboard/admin/discounts");
  return { success: true, message: "کد تخفیف ویرایش شد", discount };
}

/* ==================== بخش مدرس ==================== */

// لیست تخفیف‌های خود مدرس
export async function fetchInstructorDiscounts({
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

  const where: Prisma.DiscountWhereInput = {
    createdById: userId,
    scope: "SPECIFIC_COURSES",
    ...(search && {
      OR: [
        { code: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [discounts, total] = await Promise.all([
    prisma.discount.findMany({
      where,
      include: {
        courses: { select: { title: true } },
        _count: { select: { usages: true } },
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.discount.count({ where }),
  ]);

  const active = discounts.filter(d => d.isActive).length;

  return {
    items: discounts,
    totalItems: total,
    stats: [
      { key: "total", count: total },
      { key: "active", count: active },
      { key: "inactive", count: total - active },
    ],
  };
}

// ایجاد توسط مدرس
export async function createInstructorDiscountAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "لطفاً وارد شوید" };

  const instructorId = session.user.id as string;

  const raw = Object.fromEntries(formData);
  const parsed = instructorDiscountSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "داده‌های نامعتبر" };

  const data = parsed.data;
  if (data.honeypot && data.honeypot.length > 0) return { success: true };

  if (!(await isInstructorOfCourses(instructorId, data.courseIds))) {
    return { success: false, error: "دسترسی به برخی دوره‌ها ممنوع است" };
  }

  const existing = await prisma.discount.findUnique({ where: { code: data.code.toUpperCase() } });
  if (existing) return { success: false, error: "این کد قبلاً استفاده شده" };

  const discount = await prisma.discount.create({
    data: {
      code: data.code.toUpperCase(),
      title: data.title,
      description: data.description,
      type: data.type,
      value: data.value,
      scope: "SPECIFIC_COURSES",
      applyTo: "COURSES_ONLY",
      minimumAmount: data.minimumAmount,
      maximumAmount: data.maximumAmount,
      usageLimitType: data.usageLimitType,
      usageLimit: data.usageLimit,
      dailyLimit: data.dailyLimit,
      oncePerUser: data.oncePerUser,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      isActive: data.isActive,
      createdById: instructorId,
      courses: { connect: data.courseIds.map(id => ({ id })) },
    },
  });

  revalidatePath("/dashboard/instructor/discounts");
  return { success: true, message: "کد تخفیف ایجاد شد", discount };
}

// ویرایش توسط مدرس
export async function editInstructorDiscountAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "لطفاً وارد شوید" };

  const instructorId = session.user.id as string;

  const raw = Object.fromEntries(formData);
  const parsed = instructorDiscountSchema.safeParse(raw);
  if (!parsed.success || !parsed.data.id) return { success: false, error: "داده نامعتبر" };

  const data = parsed.data;

  const existing = await prisma.discount.findUnique({ where: { id: data.id } });
  if (!existing || existing.createdById !== instructorId) {
    return { success: false, error: "دسترسی ممنوع" };
  }

  if (!(await isInstructorOfCourses(instructorId, data.courseIds))) {
    return { success: false, error: "دسترسی به برخی دوره‌ها ممنوع است" };
  }

  const codeCheck = await prisma.discount.findFirst({
    where: { code: data.code.toUpperCase(), NOT: { id: data.id } },
  });
  if (codeCheck) return { success: false, error: "این کد قبلاً استفاده شده" };

  const discount = await prisma.discount.update({
    where: { id: data.id },
    data: {
      code: data.code.toUpperCase(),
      title: data.title,
      description: data.description,
      type: data.type,
      value: data.value,
      minimumAmount: data.minimumAmount,
      maximumAmount: data.maximumAmount,
      usageLimitType: data.usageLimitType,
      usageLimit: data.usageLimit,
      dailyLimit: data.dailyLimit,
      oncePerUser: data.oncePerUser,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      isActive: data.isActive,
      courses: { set: [], connect: data.courseIds.map(id => ({ id })) },
    },
  });

  revalidatePath("/dashboard/instructor/discounts");
  return { success: true, message: "کد تخفیف ویرایش شد", discount };
}

/* ==================== عملیات مشترک (حذف و گروهی) ==================== */

export async function deleteDiscountAction(id: string, userId: string) {
  const isUserAdmin = await isAdmin(userId);
  const discount = await prisma.discount.findUnique({ where: { id } });

  if (!discount || (!isUserAdmin && discount.createdById !== userId)) {
    return { success: false, error: "دسترسی ممنوع" };
  }

  await prisma.discount.delete({ where: { id } });

  const path = isUserAdmin ? "/dashboard/admin/discounts" : "/dashboard/instructor/discounts";
  revalidatePath(path);
  return { success: true, message: "کد تخفیف حذف شد" };
}

export async function bulkDiscountAction(selectedIds: string[], action: "activate" | "deactivate" | "delete", userId: string) {
  const isUserAdmin = await isAdmin(userId);

  const discounts = await prisma.discount.findMany({
    where: isUserAdmin ? { id: { in: selectedIds } } : { id: { in: selectedIds }, createdById: userId },
  });

  if (discounts.length !== selectedIds.length) {
    return { success: false, message: "دسترسی به برخی کدها ممنوع است" };
  }

  if (action === "delete") {
    await prisma.discount.deleteMany({ where: { id: { in: selectedIds } } });
  } else {
    await prisma.discount.updateMany({
      where: { id: { in: selectedIds } },
      data: { isActive: action === "activate" },
    });
  }

  const path = isUserAdmin ? "/dashboard/admin/discounts" : "/dashboard/instructor/discounts";
  revalidatePath(path);
  return { success: true, message: `${selectedIds.length} کد با موفقیت ${action === "delete" ? "حذف" : action === "activate" ? "فعال" : "غیرفعال"} شدند` };
}

// خروجی CSV (فقط ادمین)
export async function exportDiscountsCsv(userId: string) {
  if (!(await isAdmin(userId))) throw new Error("دسترسی ممنوع");

  const discounts = await prisma.discount.findMany({
    include: {
      courses: { select: { title: true } },
      products: { select: { title: true } },
      categories: { select: { name: true } },
      _count: { select: { usages: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const headers = ["کد", "عنوان", "نوع", "مقدار", "حداقل خرید", "شروع", "پایان", "وضعیت", "تعداد استفاده", "محدود به"];
  const rows = discounts.map(d => [
    d.code,
    d.title,
    d.type === "PERCENT" ? "درصدی" : "مقداری",
    d.type === "PERCENT" ? `${d.value}%` : `${d.value.toLocaleString("fa-IR")} تومان`,
    d.minimumAmount?.toLocaleString("fa-IR") || "-",
    d.startsAt ? new Date(d.startsAt).toLocaleDateString("fa-IR") : "-",
    d.endsAt ? new Date(d.endsAt).toLocaleDateString("fa-IR") : "-",
    d.isActive ? "فعال" : "غیرفعال",
    d._count.usages.toString(),
    d.scope === "ALL" ? "همه" : d.scope === "FIRST_PURCHASE" ? "اولین خرید" : "محدود",
  ]);

  const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
  return `\uFEFF${csv}`;
}