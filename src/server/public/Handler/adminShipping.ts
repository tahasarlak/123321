// src/server/public/Handler/adminShipping.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  createMethodSchema,
  editMethodSchema,
} from "@/lib/validations/adminShipping";
import { faAdminShippingMessages } from "@/lib/validations/adminShipping/messages";
import type { ShippingResult } from "@/types/adminShipping";

const PAGE_SIZE = 12;

async function hasAdminAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { role: true } } },
  });
  return user?.roles.some((r) => ["ADMIN", "SUPERADMIN"].includes(r.role)) ?? false;
}

// دریافت لیست روش‌های ارسال + آمار
export async function handleFetchShippingMethods({
  search = "",
  page = 1,
}: {
  search?: string;
  page?: number;
}): Promise<{
  items: any[];
  totalItems: number;
  stats: { key: string; count: number }[];
}> {
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
      include: {
        zone: { select: { name: true } },
        pickup: { select: { title: true } },
      },
    }),
    prisma.shippingMethod.count({ where }),
  ]);

  const active = methodsRaw.filter((m) => m.isActive).length;
  const inactive = totalMethods - active;

  const stats = [
    { key: "active", count: active },
    { key: "inactive", count: inactive },
    { key: "total", count: totalMethods },
  ];

  return { items: methodsRaw, totalItems: totalMethods, stats };
}

// تغییر وضعیت فعال/غیرفعال
export async function handleToggleMethod(id: string, current: boolean): Promise<{ success: boolean; error?: string }> {
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

// حذف روش ارسال
export async function handleDeleteMethod(methodId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const usage = await prisma.shippingMethod.findUnique({
      where: { id: methodId },
      select: { _count: { select: { products: true } } },
    });

    if ((usage?._count.products ?? 0) > 0) {
      return { success: false, error: faAdminShippingMessages.in_use };
    }

    await prisma.shippingMethod.delete({ where: { id: methodId } });
    revalidatePath("/dashboard/admin/shipping-methods");
    return { success: true };
  } catch (error) {
    console.error("Error deleting shipping method:", error);
    return { success: false, error: "خطا در حذف روش ارسال" };
  }
}

// خروجی CSV
export async function handleExportShippingMethodsCsv(
  where: Prisma.ShippingMethodWhereInput = {}
): Promise<string> {
  try {
    const methods = await prisma.shippingMethod.findMany({
      where,
      orderBy: { priority: "desc" },
      include: {
        zone: { select: { name: true } },
        pickup: { select: { title: true } },
      },
    });

    const headers = [
      "عنوان",
      "نوع",
      "توضیحات",
      "هزینه (تومان)",
      "درصد هزینه",
      "رایگان بالای",
      "روز تخمینی",
      "وضعیت",
      "اولویت",
      "زون",
      "مکان تحویل",
      "تاریخ ایجاد",
    ];

    const rows = methods.map((m) => [
      m.title,
      m.type,
      m.description ?? "-",
      m.cost?.toLocaleString("fa-IR") ?? "0",
      m.costPercent ? `${m.costPercent}%` : "-",
      m.freeAbove ? m.freeAbove.toLocaleString("fa-IR") : "-",
      m.estimatedDays ? `${m.estimatedDays} روز` : "-",
      m.isActive ? "فعال" : "غیرفعال",
      m.priority.toString(),
      m.zone?.name ?? "-",
      m.pickup?.title ?? "-",
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

// ایجاد روش ارسال
export async function handleCreateMethod(
  data: unknown,
  adminUserId: string
): Promise<ShippingResult> {
  if (!(await hasAdminAccess(adminUserId))) {
    return { success: false, error: faAdminShippingMessages.unauthorized };
  }

  const parsed = createMethodSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: faAdminShippingMessages.server_error };
  }

  const {
    title,
    type,
    cost,
    costPercent,
    freeAbove,
    estimatedDays,
    priority,
    isActive,
    description,
    address,
    phone,
    icon,
    locationDetails,
    zoneId,
    pickupId,
    honeypot,
  } = parsed.data;

  if (honeypot && honeypot.length > 0) return { success: true };

  const methodData: any = {
    title,
    type,
    cost: cost ?? 0,
    costPercent: costPercent ?? null,
    freeAbove: freeAbove ?? null,
    estimatedDays: estimatedDays ?? null,
    priority,
    isActive,
    description: description ?? null,
    zone: zoneId ? { connect: { id: zoneId } } : undefined,
    pickup: pickupId ? { connect: { id: pickupId } } : undefined,
  };

  if (type === "PRESENTIAL") {
    methodData.address = address;
    methodData.phone = phone;
    methodData.icon = icon;
    methodData.locationDetails = locationDetails;
  }

  const method = await prisma.shippingMethod.create({
    data: methodData,
  });

  revalidatePath("/dashboard/admin/shipping-methods");
  return { success: true, message: "روش ارسال با موفقیت ایجاد شد", item: method };
}

// ویرایش روش ارسال
export async function handleEditMethod(
  data: unknown,
  adminUserId: string
): Promise<ShippingResult> {
  if (!(await hasAdminAccess(adminUserId))) {
    return { success: false, error: faAdminShippingMessages.unauthorized };
  }

  const parsed = editMethodSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: faAdminShippingMessages.server_error };
  }

  const {
    id,
    type,
    address,
    phone,
    icon,
    locationDetails,
    zoneId,
    pickupId,
    ...updateData
  } = parsed.data;

  const methodData: any = {
    ...updateData,
    zone: zoneId ? { connect: { id: zoneId } } : { disconnect: true },
    pickup: pickupId ? { connect: { id: pickupId } } : { disconnect: true },
  };

  if (type === "PRESENTIAL") {
    methodData.address = address;
    methodData.phone = phone;
    methodData.icon = icon;
    methodData.locationDetails = locationDetails;
  } else {
    methodData.address = null;
    methodData.phone = null;
    methodData.icon = null;
    methodData.locationDetails = null;
  }

  const method = await prisma.shippingMethod.update({
    where: { id },
    data: methodData,
  });

  revalidatePath("/dashboard/admin/shipping-methods");
  return { success: true, message: "روش ارسال با موفقیت ویرایش شد", item: method };
}