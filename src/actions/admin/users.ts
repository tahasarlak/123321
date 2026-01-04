"use server";

import { prisma } from "@/lib/db/prisma";
import { Prisma, Gender } from "@prisma/client";
import { revalidatePath } from "next/cache";

const PAGE_SIZE = 12;

export async function fetchUsers({
  search = "",
  page = 1,
  searchParams = {},
}: {
  search?: string;
  page?: number;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const roleFilter = (searchParams?.role as string)?.toLowerCase();

  const where: Prisma.UserWhereInput = {};

  let prismaRole: string | undefined;

  if (roleFilter) {
    switch (roleFilter) {
      case "super_admin":
        prismaRole = "SUPER_ADMIN";
        break;
      case "admin":
        prismaRole = "ADMIN";
        break;
      case "instructor":
        prismaRole = "INSTRUCTOR";
        break;
      case "blog_author":
        prismaRole = "BLOG_AUTHOR";
        break;
      case "user":
        prismaRole = "USER";
        break;
      default:
        prismaRole = roleFilter.toUpperCase();
    }
    where.roles = { some: { role: prismaRole } };
  }

  if (search.trim()) {
    const trimmedSearch = search.trim();
    where.OR = [
      { name: { contains: trimmedSearch, mode: "insensitive" } },
      { email: { contains: trimmedSearch, mode: "insensitive" } },
      { phone: { contains: trimmedSearch, mode: "insensitive" } },
      { shortBio: { contains: trimmedSearch, mode: "insensitive" } },
      { instagram: { contains: trimmedSearch, mode: "insensitive" } },
    ];
  }

  const [usersRaw, totalItems, roleCounts] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        roles: { select: { role: true } },
        university: { select: { name: true } },
        major: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
    prisma.userRole.groupBy({
      by: ["role"],
      _count: { role: true },
      // اصلاح شده - شرط امن و ساده
      where: prismaRole ? { role: prismaRole } : undefined,
    }),
  ]);

  const items = usersRaw.map((user) => ({
    ...user,
    roles: user.roles.map((r) => r.role),
  }));

  const roleMap: Record<string, number> = {
    SUPER_ADMIN: 0,
    ADMIN: 0,
    INSTRUCTOR: 0,
    BLOG_AUTHOR: 0,
    USER: 0,
  };

  for (const { role, _count } of roleCounts) {
    if (role in roleMap) roleMap[role] = _count.role;
  }

  const stats = Object.entries(roleMap).map(([key, count]) => ({ key, count }));

  return { items, totalItems, stats };
}

export async function fetchUserById(id: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        roles: { select: { role: true } },
        university: { select: { id: true, name: true } },
        major: { select: { id: true, name: true } },
      },
    });

    if (!user) return null;

    return {
      ...user,
      roles: user.roles.map((r) => r.role),
    };
  } catch (error) {
    console.error(`Error fetching user ${id}:`, error);
    return null;
  }
}

export async function createUser(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string; // در عمل باید hash شود
    const phone = formData.get("phone") as string | null;
    const genderRaw = formData.get("gender") as string | null;
    const roles = formData.getAll("roles") as string[];
    const image = formData.get("image") as string | null;
    const bio = formData.get("bio") as string | null;
    const instagram = formData.get("instagram") as string | null;
    const studentId = formData.get("studentId") as string | null;
    const entranceYearRaw = formData.get("entranceYear");
    const entranceYear = entranceYearRaw ? Number(entranceYearRaw) : null;
    const emailVerifiedChecked = formData.get("emailVerified") === "on";
    const isActive = formData.get("isActive") === "on";

    // تبدیل gender به نوع معتبر enum یا undefined
    const gender = genderRaw && ["MALE", "FEMALE", "OTHER"].includes(genderRaw)
      ? (genderRaw as Gender)
      : undefined;

    // emailVerified در مدل DateTime? است → تبدیل boolean به تاریخ یا null
    const emailVerified = emailVerifiedChecked ? new Date() : null;

    // هش کردن پسورد (در عمل از bcrypt استفاده کنید)
    const hashedPassword = password; // ← اینجا باید هش واقعی انجام شود!

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        gender,
        image,
        bio,
        instagram,
        studentId,
        entranceYear,
        emailVerified,
        isActive,
        roles: {
          create: roles.map((role) => ({
            role: role as any, // بهتر است نوع Role enum داشته باشید
          })),
        },
      },
    });

    revalidatePath("/dashboard/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Error creating user:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function updateUser(id: string, formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string | null;
    const genderRaw = formData.get("gender") as string | null;
    const roles = formData.getAll("roles") as string[];
    const image = formData.get("image") as string | null;
    const bio = formData.get("bio") as string | null;
    const instagram = formData.get("instagram") as string | null;
    const studentId = formData.get("studentId") as string | null;
    const entranceYearRaw = formData.get("entranceYear");
    const entranceYear = entranceYearRaw ? Number(entranceYearRaw) : null;
    const emailVerifiedChecked = formData.get("emailVerified") === "on";
    const isActive = formData.get("isActive") === "on";

    const gender = genderRaw && ["MALE", "FEMALE", "OTHER"].includes(genderRaw)
      ? (genderRaw as Gender)
      : undefined;

    const emailVerified = emailVerifiedChecked ? new Date() : null;

    await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        gender,               // اگر undefined باشد، فیلد آپدیت نمی‌شود
        image,
        bio,
        instagram,
        studentId,
        entranceYear,
        emailVerified,
        isActive,
        roles: {
          deleteMany: {},
          create: roles.map((role) => ({
            role: role as any,
          })),
        },
      },
    });

    revalidatePath("/dashboard/admin/users");
    revalidatePath(`/dashboard/admin/users/edit/${id}`);

    return { success: true };
  } catch (error) {
    console.error("Error updating user:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteUser(id: string) {
  try {
    await prisma.user.delete({ where: { id } });
    revalidatePath("/dashboard/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function bulkBanUsers(selectedIds: string[], action: "ban" | "unban") {
  if (!selectedIds.length) {
    return { success: false, message: "هیچ کاربری انتخاب نشده است." };
  }

  const isBanned = action === "ban";

  try {
    await prisma.user.updateMany({
      where: { id: { in: selectedIds } },
      data: { isBanned },
    });

    revalidatePath("/dashboard/admin/users");
    return {
      success: true,
      message: isBanned
        ? `${selectedIds.length} کاربر مسدود شدند`
        : `${selectedIds.length} کاربر آزاد شدند`,
    };
  } catch (error) {
    console.error("Bulk ban/unban error:", error);
    return { success: false, message: "خطا در عملیات گروهی" };
  }
}
// انتهای فایل users.ts (بعد از بقیه توابع)

// ... بقیه کد ...

/**
 * خروجی CSV کاربران
 */
export async function exportUsersCsv(baseWhere: Prisma.UserWhereInput = { isBanned: false }) {
  try {
    const allUsers = await prisma.user.findMany({
      where: baseWhere,
      include: {
        roles: { select: { role: true } },
        university: true,
        major: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "نام",
      "ایمیل",
      "شماره دانشجویی",
      "نقش‌ها",
      "دانشگاه",
      "رشته",
      "وضعیت حساب",
      "تاریخ ثبت‌نام",
    ];

    const rows = allUsers.map((u) => {
      const roles = u.roles.map((r) => r.role).join("، ");
      return [
        u.name || "-",
        u.email,
        u.studentId || "-",
        roles || "-",
        u.university?.name || "-",
        u.major?.name || "-",
        u.isBanned ? "مسدود" : "فعال",
        new Date(u.createdAt).toLocaleDateString("fa-IR"),
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
    console.error("خطا در خروجی CSV کاربران:", error);
    throw new Error("خطایی در تولید فایل CSV رخ داد.");
  }
}