"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const PAGE_SIZE = 12;

// چک نقش ادمین
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
const baseMethodSchema = z.object({
  title: z.string().min(1),
  type: z.enum(["POST", "COURIER", "TIPAX", "INTERNATIONAL", "PRESENTIAL", "FREE"]),
  cost: z.coerce.number().int().optional(),
  costPercent: z.coerce.number().optional(),
  freeAbove: z.coerce.number().int().optional(),
  estimatedDays: z.string().optional(),
  priority: z.coerce.number().int().default(0),
  isActive: z.coerce.boolean().default(true),
  description: z.string().optional(),
  zoneId: z.string().optional(),
  pickupId: z.string().optional(),
  // فقط برای PRESENTIAL
  address: z.string().optional(),
  phone: z.string().optional(),
  icon: z.string().optional(),
  locationDetails: z.string().optional(),
  honeypot: z.string().optional(),
});

const createMethodSchema = baseMethodSchema;
const editMethodSchema = baseMethodSchema.extend({
  id: z.string(),
});

/* ==================== لیست روش‌های ارسال (فقط ادمین) ==================== */
export async function fetchShippingMethods({
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

  const where: Prisma.ShippingMethodWhereInput = {};

  if (search.trim()) {
    const trimmed = search.trim();
    where.OR = [
      { title: { contains: trimmed, mode: "insensitive" } },
      { description: { contains: trimmed, mode: "insensitive" } },
      { type: { contains: trimmed, mode: "insensitive" } },
    ];
  }

  const [methods, total] = await Promise.all([
    prisma.shippingMethod.findMany({
      where,
      include: {
        zone: { select: { name: true } },
        pickup: { select: { title: true, city: { select: { name: true } } } },
      },
      orderBy: { priority: "desc", createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.shippingMethod.count({ where }),
  ]);

  const items = methods.map(m => ({
    id: m.id,
    title: m.title,
    type: m.type,
    typeLabel:
      m.type === "POST" ? "پست" :
      m.type === "COURIER" ? "پیک" :
      m.type === "TIPAX" ? "تیپاکس" :
      m.type === "INTERNATIONAL" ? "بین‌المللی" :
      m.type === "PRESENTIAL" ? "تحویل حضوری" : "رایگان",
    cost: m.cost || 0,
    costPercent: m.costPercent,
    freeAbove: m.freeAbove,
    estimatedDays: m.estimatedDays,
    priority: m.priority,
    isActive: m.isActive,
    description: m.description,
    zone: m.zone?.name || "-",
    pickup: m.pickup ? `${m.pickup.title} (${m.pickup.city?.name})` : "-",
    createdAt: m.createdAt.toISOString(),
  }));

  const active = methods.filter(m => m.isActive).length;
  const inactive = total - active;

  return {
    items,
    totalItems: total,
    stats: [
      { key: "total", count: total },
      { key: "active", count: active },
      { key: "inactive", count: inactive },
    ],
  };
}

/* ==================== ایجاد روش ارسال ==================== */
export async function createShippingMethodAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("common");

  if (!session?.user?.id || !(await isAdmin(session.user.id))) {
    return { success: false, error: "دسترسی ممنوع" };
  }

  const raw = Object.fromEntries(formData);
  const parsed = createMethodSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "داده‌های نامعتبر" };

  const data = parsed.data;
  if (data.honeypot && data.honeypot.length > 0) return { success: true };

  const methodData: any = {
    title: data.title,
    type: data.type,
    cost: data.cost ?? null,
    costPercent: data.costPercent ?? null,
    freeAbove: data.freeAbove ?? null,
    estimatedDays: data.estimatedDays ?? null,
    priority: data.priority,
    isActive: data.isActive,
    description: data.description ?? null,
    zone: data.zoneId ? { connect: { id: data.zoneId } } : undefined,
    pickup: data.pickupId ? { connect: { id: data.pickupId } } : undefined,
  };

  if (data.type === "PRESENTIAL") {
    methodData.address = data.address ?? null;
    methodData.phone = data.phone ?? null;
    methodData.icon = data.icon ?? null;
    methodData.locationDetails = data.locationDetails ?? null;
  }

  await prisma.shippingMethod.create({ data: methodData });

  revalidatePath("/dashboard/admin/shipping-methods");
  return { success: true, message: "روش ارسال با موفقیت ایجاد شد" };
}

/* ==================== ویرایش روش ارسال ==================== */
export async function editShippingMethodAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !(await isAdmin(session.user.id))) {
    return { success: false, error: "دسترسی ممنوع" };
  }

  const raw = Object.fromEntries(formData);
  const parsed = editMethodSchema.safeParse(raw);
  if (!parsed.success || !parsed.data.id) return { success: false, error: "داده نامعتبر" };

  const data = parsed.data;

  const existing = await prisma.shippingMethod.findUnique({ where: { id: data.id } });
  if (!existing) return { success: false, error: "روش ارسال یافت نشد" };

  const methodData: any = {
    title: data.title,
    type: data.type,
    cost: data.cost ?? null,
    costPercent: data.costPercent ?? null,
    freeAbove: data.freeAbove ?? null,
    estimatedDays: data.estimatedDays ?? null,
    priority: data.priority,
    isActive: data.isActive,
    description: data.description ?? null,
    zone: data.zoneId ? { connect: { id: data.zoneId } } : { disconnect: true },
    pickup: data.pickupId ? { connect: { id: data.pickupId } } : { disconnect: true },
  };

  if (data.type === "PRESENTIAL") {
    methodData.address = data.address ?? null;
    methodData.phone = data.phone ?? null;
    methodData.icon = data.icon ?? null;
    methodData.locationDetails = data.locationDetails ?? null;
  } else {
    methodData.address = null;
    methodData.phone = null;
    methodData.icon = null;
    methodData.locationDetails = null;
  }

  await prisma.shippingMethod.update({
    where: { id: data.id },
    data: methodData,
  });

  revalidatePath("/dashboard/admin/shipping-methods");
  return { success: true, message: "روش ارسال با موفقیت ویرایش شد" };
}

/* ==================== تغییر وضعیت فعال/غیرفعال ==================== */
export async function toggleShippingMethodAction(id: string, current: boolean, userId: string) {
  if (!(await isAdmin(userId))) return { success: false, error: "دسترسی ممنوع" };

  await prisma.shippingMethod.update({
    where: { id },
    data: { isActive: !current },
  });

  revalidatePath("/dashboard/admin/shipping-methods");
  return { success: true };
}

/* ==================== حذف روش ارسال ==================== */
export async function deleteShippingMethodAction(id: string, userId: string) {
  if (!(await isAdmin(userId))) return { success: false, error: "دسترسی ممنوع" };

  const usage = await prisma.shippingMethod.findUnique({
    where: { id },
    select: { _count: { select: { products: true } } },
  });

  if ((usage?._count.products ?? 0) > 0) {
    return { success: false, error: "این روش ارسال در محصولات استفاده شده و قابل حذف نیست" };
  }

  await prisma.shippingMethod.delete({ where: { id } });

  revalidatePath("/dashboard/admin/shipping-methods");
  return { success: true, message: "روش ارسال با موفقیت حذف شد" };
}

/* ==================== خروجی CSV ==================== */
export async function exportShippingMethodsCsv(userId: string) {
  if (!(await isAdmin(userId))) throw new Error("دسترسی ممنوع");

  const methods = await prisma.shippingMethod.findMany({
    include: {
      zone: { select: { name: true } },
      pickup: { select: { title: true, city: { select: { name: true } } } },
    },
    orderBy: { priority: "desc" },
  });

  const headers = ["عنوان", "نوع", "هزینه", "درصد هزینه", "رایگان بالای", "روز تخمینی", "وضعیت", "اولویت", "زون", "مکان تحویل", "تاریخ ایجاد"];
  const rows = methods.map(m => [
    m.title,
    m.type === "POST" ? "پست" :
    m.type === "COURIER" ? "پیک" :
    m.type === "TIPAX" ? "تیپاکس" :
    m.type === "INTERNATIONAL" ? "بین‌المللی" :
    m.type === "PRESENTIAL" ? "تحویل حضوری" : "رایگان",
    m.cost?.toLocaleString("fa-IR") || "0",
    m.costPercent ? `${m.costPercent}%` : "-",
    m.freeAbove?.toLocaleString("fa-IR") || "-",
    m.estimatedDays || "-",
    m.isActive ? "فعال" : "غیرفعال",
    m.priority.toString(),
    m.zone?.name || "-",
    m.pickup ? `${m.pickup.title} (${m.pickup.city?.name})` : "-",
    new Date(m.createdAt).toLocaleDateString("fa-IR"),
  ]);

  const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
  return `\uFEFF${csv}`;
}