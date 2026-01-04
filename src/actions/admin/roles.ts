// src/actions/admin/roles.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

/**
 * دریافت لیست نقش‌ها با تعداد کاربران
 */
export async function fetchRoles() {
  try {
    // گروه‌بندی کاربران بر اساس نقش
    const userRoles = await prisma.userRole.groupBy({
      by: ["role"],
      _count: {
        role: true,
      },
    });

    // تبدیل به فرمت مورد نیاز
    const roles = userRoles.map((ur) => ({
      id: ur.role,
      name: ur.role,
      description: getRoleDescription(ur.role),
      userCount: ur._count.role,
    }));

    // نقش‌هایی که هیچ کاربری ندارن رو هم اضافه کن (اختیاری)
    const allRoles = ["SUPER_ADMIN", "ADMIN", "INSTRUCTOR", "BLOG_AUTHOR", "USER"];
    const existingRoleNames = roles.map(r => r.name);

    allRoles.forEach(roleName => {
      if (!existingRoleNames.includes(roleName)) {
        roles.push({
          id: roleName,
          name: roleName,
          description: getRoleDescription(roleName),
          userCount: 0,
        });
      }
    });

    return {
      items: roles,
      totalItems: roles.length,
      stats: userRoles.reduce((acc, ur) => {
        acc[ur.role] = { count: ur._count.role };
        return acc;
      }, {} as Record<string, { count: number }>),
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

function getRoleDescription(role: string): string {
  const descMap: Record<string, string> = {
    SUPER_ADMIN: "دسترسی کامل به تمام بخش‌های سیستم",
    ADMIN: "مدیریت کاربران، محتوا و تنظیمات",
    INSTRUCTOR: "ایجاد و مدیریت دوره‌های آموزشی",
    BLOG_AUTHOR: "نوشتن و انتشار مقالات",
    USER: "کاربر عادی سایت",
  };
  return descMap[role] || "بدون توضیح";
}

/**
 * عملیات گروهی افزودن/حذف نقش
 */
export async function bulkRoleAction(
  selectedIds: string[],
  action: "add" | "remove",
  roleName: string
) {
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
        data: selectedIds.map(userId => ({
          userId,
          role: roleName,
        })),
        skipDuplicates: true,
      });

      revalidatePath("/dashboard/admin/users");
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
      return {
        success: true,
        message: `${result.count} مورد نقش "${roleName}" حذف شد.`,
      };
    }
  } catch (error) {
    console.error("خطا در عملیات گروهی نقش:", error);
    return { success: false, message: "خطایی رخ داد." };
  }

  return { success: false, message: "عملیات نامعتبر." };
}

/**
 * خروجی CSV نقش‌ها
 */
export async function exportRolesCsv() {
  try {
    const users = await prisma.user.findMany({
      include: {
        roles: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const headers = ["نام کاربر", "ایمیل", "نقش‌ها", "تاریخ ثبت‌نام"];
    const rows = users.map(user => {
      const roleNames = user.roles.map(ur => ur.role).join("، ") || "کاربر عادی";
      return [
        user.name || "-",
        user.email,
        roleNames,
        new Date(user.createdAt).toLocaleDateString("fa-IR"),
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return `\uFEFF${csvContent}`;
  } catch (error) {
    console.error("خطا در CSV نقش‌ها:", error);
    throw new Error("خطا در تولید CSV");
  }
}