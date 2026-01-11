// src/server/public/Handler/adminRoles.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

async function hasAdminAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { role: true } } },
  });
  return user?.roles.some((r) => ["ADMIN", "SUPERADMIN"].includes(r.role)) ?? false;
}

function getRoleDescription(role: string): string {
  const descMap: Record<string, string> = {
    SUPERADMIN: "دسترسی کامل به تمام بخش‌های سیستم (سوپر ادمین)",
    ADMIN: "مدیریت کاربران، محتوا، تنظیمات و بخش‌های اداری",
    INSTRUCTOR: "ایجاد و مدیریت دوره‌های آموزشی و محتوای آموزشی",
    BLOG_AUTHOR: "نوشتن، ویرایش و انتشار مقالات بلاگ",
    USER: "کاربر عادی با دسترسی محدود به امکانات سایت",
  };
  return descMap[role] || "بدون توضیح";
}

// لیست نقش‌ها با تعداد کاربران و توضیحات
export async function handleFetchRoles(): Promise<{
  items: {
    id: string;
    name: string;
    description: string;
    userCount: number;
  }[];
  totalItems: number;
  stats: Record<string, { count: number }>;
}> {
  try {
    const userRoles = await prisma.userRole.groupBy({
      by: ["role"],
      _count: { role: true },
    });

    const roles = userRoles.map((ur) => ({
      id: ur.role,
      name: ur.role,
      description: getRoleDescription(ur.role),
      userCount: ur._count.role,
    }));

    // اضافه کردن نقش‌هایی که هیچ کاربری ندارند
    const allPossibleRoles = ["SUPERADMIN", "ADMIN", "INSTRUCTOR", "BLOG_AUTHOR", "USER"];
    const existingRoles = roles.map((r) => r.name);

    allPossibleRoles.forEach((roleName) => {
      if (!existingRoles.includes(roleName)) {
        roles.push({
          id: roleName,
          name: roleName,
          description: getRoleDescription(roleName),
          userCount: 0,
        });
      }
    });

    // مرتب‌سازی ثابت (برای نمایش یکسان)
    roles.sort((a, b) => allPossibleRoles.indexOf(a.name) - allPossibleRoles.indexOf(b.name));

    const stats = userRoles.reduce((acc, ur) => {
      acc[ur.role] = { count: ur._count.role };
      return acc;
    }, {} as Record<string, { count: number }>);

    return {
      items: roles,
      totalItems: roles.length,
      stats,
    };
  } catch (error) {
    console.error("خطا در دریافت نقش‌ها:", error);
    return {
      items: [],
      totalItems: 0,
      stats: {},
    };
  }
}

// عملیات گروهی اضافه/حذف نقش
export async function handleBulkRoleAction(
  selectedIds: string[],
  action: "add" | "remove",
  roleName: string
): Promise<{ success: boolean; message: string }> {
  if (selectedIds.length === 0) {
    return { success: false, message: "هیچ کاربری انتخاب نشده است." };
  }

  const allowedRoles = ["ADMIN", "INSTRUCTOR", "BLOG_AUTHOR"] as const;
  if (!allowedRoles.includes(roleName as any)) {
    return {
      success: false,
      message: "نقش انتخاب‌شده مجاز نیست. فقط می‌توانید نقش‌های ADMIN، INSTRUCTOR یا BLOG_AUTHOR را تغییر دهید.",
    };
  }

  try {
    if (action === "add") {
      await prisma.userRole.createMany({
        data: selectedIds.map((userId) => ({
          userId,
          role: roleName,
        })),
        skipDuplicates: true,
      });

      revalidatePath("/dashboard/admin/users");
      revalidatePath("/dashboard/admin/roles");

      return {
        success: true,
        message: `${selectedIds.length} کاربر به نقش "${roleName}" اضافه شدند.`,
      };
    }

    if (action === "remove") {
      const result = await prisma.userRole.deleteMany({
        where: {
          userId: { in: selectedIds },
          role: roleName,
        },
      });

      revalidatePath("/dashboard/admin/users");
      revalidatePath("/dashboard/admin/roles");

      return {
        success: true,
        message: `${result.count} مورد از نقش "${roleName}" حذف شد.`,
      };
    }
  } catch (error) {
    console.error("خطا در عملیات گروهی نقش:", error);
    return { success: false, message: "خطایی در انجام عملیات رخ داد." };
  }

  return { success: false, message: "عملیات نامعتبر است." };
}

// خروجی CSV کاربران و نقش‌هایشان
export async function handleExportRolesCsv(): Promise<string> {
  try {
    const users = await prisma.user.findMany({
      include: {
        roles: { select: { role: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const headers = ["نام کاربر", "ایمیل", "نقش‌ها", "تاریخ ثبت‌نام"];

    const rows = users.map((user) => {
      const roleNames = user.roles.map((ur) => ur.role).join("، ") || "USER";
      return [
        user.name || "-",
        user.email,
        roleNames,
        new Date(user.createdAt).toLocaleDateString("fa-IR"),
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    return `\uFEFF${csvContent}`;
  } catch (error) {
    console.error("خطا در تولید CSV نقش‌ها:", error);
    throw new Error("خطا در تولید فایل CSV نقش‌ها");
  }
}