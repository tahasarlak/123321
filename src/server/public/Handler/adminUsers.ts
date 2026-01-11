// src/server/public/Handler/adminUsers.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import {
  createUserByAdminSchema,
  updateUserByAdminSchema,
} from "@/lib/validations/adminUsers";
import type { AdminUsersResult } from "@/types/adminUsers";

const PAGE_SIZE = 12;

const CREATE_SUCCESS = "کاربر با موفقیت ایجاد شد.";
const UPDATE_SUCCESS = "تغییرات با موفقیت اعمال شد.";
const DELETE_SUCCESS = "کاربر با موفقیت حذف شد.";

async function hasAdminAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { role: true } } },
  });
  return user?.roles.some((r) => ["ADMIN", "SUPERADMIN"].includes(r.role)) ?? false;
}

// لیست کاربران + آمار نقش‌ها
export async function handleFetchUsers({
  search = "",
  page = 1,
  searchParams = {},
}: {
  search?: string;
  page?: number;
  searchParams?: Record<string, string | string[] | undefined>;
}): Promise<any> {
  const roleFilter = (searchParams?.role as string)?.toUpperCase();

  const where: any = {};
  if (roleFilter && roleFilter !== "ALL") {
    where.roles = { some: { role: roleFilter } };
  }

  if (search.trim()) {
    const trimmed = search.trim();
    where.OR = [
      { name: { contains: trimmed, mode: "insensitive" } },
      { email: { contains: trimmed, mode: "insensitive" } },
      { phone: { contains: trimmed, mode: "insensitive" } },
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
    }),
  ]);

  const items = usersRaw.map((user) => ({
    ...user,
    roles: user.roles.map((r) => r.role),
  }));

  const roleMap: Record<string, number> = {
    SUPERADMIN: 0,
    ADMIN: 0,
    INSTRUCTOR: 0,
    BLOG_AUTHOR: 0,
    USER: 0,
  };

  roleCounts.forEach(({ role, _count }) => {
    if (role in roleMap) roleMap[role] = _count.role;
  });

  const stats = Object.entries(roleMap).map(([key, count]) => ({ key, count }));

  return { items, totalItems, stats };
}

export async function handleFetchUserById(id: string) {
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
}

export async function handleCreateUser(data: unknown, adminUserId: string): Promise<AdminUsersResult> {
  if (!(await hasAdminAccess(adminUserId))) {
    return { success: false, message: "دسترسی ممنوع" };
  }

  const parsed = createUserByAdminSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, message: "اطلاعات ورودی نامعتبر است" };
  }

  const {
    name,
    email,
    phone,
    password,
    universityName,
    majorName,
    studentId,
    entranceYear,
    roles,
  } = parsed.data;

  let universityId: string | null = null;
  let majorId: string | null = null;

  if (universityName) {
    const university = await prisma.university.upsert({
      where: { name: universityName },
      update: {},
      create: { name: universityName },
    });
    universityId = university.id;

    if (majorName) {
      const major = await prisma.major.upsert({
        where: { name_universityId: { name: majorName, universityId: university.id } },
        update: {},
        create: { name: majorName, universityId: university.id },
      });
      majorId = major.id;
    }
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const newUser = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || null,
      password: hashedPassword,
      gender: "OTHER",
      studentId: studentId || null,
      entranceYear: entranceYear || null,
      universityId,
      majorId,
      roles: {
        createMany: {
          data: roles.map((role) => ({ role })),
          skipDuplicates: true,
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      roles: { select: { role: true } },
    },
  });

  return {
    success: true,
    message: CREATE_SUCCESS,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      createdAt: newUser.createdAt,
      roles: newUser.roles.map((r) => r.role),
    },
  };
}

export async function handleUpdateUser(
  data: unknown,
  adminUserId: string,
  targetUserId: string
): Promise<AdminUsersResult> {
  if (!(await hasAdminAccess(adminUserId))) {
    return { success: false, message: "دسترسی ممنوع" };
  }

  const parsed = updateUserByAdminSchema.safeParse(data);
  if (!parsed.success) {
    console.log("Validation errors:", parsed.error.format()); 
    return { success: false, message: "اطلاعات ورودی نامعتبر است" };
  }

  const {
    name,
    email,
    phone,
    password,
    universityName,
    majorName,
    studentId,
    entranceYear,
    roles,
  } = parsed.data;

  let universityId: string | null = null;
  let majorId: string | null = null;

  if (universityName) {
    const university = await prisma.university.upsert({
      where: { name: universityName },
      update: {},
      create: { name: universityName },
    });
    universityId = university.id;

    if (majorName) {
      const major = await prisma.major.upsert({
        where: { name_universityId: { name: majorName, universityId: university.id } },
        update: {},
        create: { name: majorName, universityId: university.id },
      });
      majorId = major.id;
    }
  }

  const updateData: any = {
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone: phone || null,
    studentId: studentId || null,
    entranceYear: entranceYear || null,
    universityId,
    majorId,
  };

  if (password) {
    updateData.password = await bcrypt.hash(password, 12);
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetUserId },
      data: updateData,
    });

    await tx.userRole.deleteMany({ where: { userId: targetUserId } });
    await tx.userRole.createMany({
      data: roles.map((role) => ({ userId: targetUserId, role })),
      skipDuplicates: true,
    });
  });

  return { success: true, message: UPDATE_SUCCESS };
}

export async function handleDeleteUser(adminUserId: string, targetUserId: string): Promise<AdminUsersResult> {
  if (!(await hasAdminAccess(adminUserId)) || adminUserId === targetUserId) {
    return { success: false, message: "دسترسی ممنوع" };
  }

  await prisma.user.delete({ where: { id: targetUserId } });

  return { success: true, message: DELETE_SUCCESS };
}

export async function handleBulkBanUsers(selectedIds: string[], action: "ban" | "unban"): Promise<any> {
  if (!selectedIds.length) {
    return { success: false, message: "هیچ کاربری انتخاب نشده است." };
  }

  const isBanned = action === "ban";

  await prisma.user.updateMany({
    where: { id: { in: selectedIds } },
    data: { isBanned },
  });

  return {
    success: true,
    message: isBanned
      ? `${selectedIds.length} کاربر مسدود شدند`
      : `${selectedIds.length} کاربر آزاد شدند`,
  };
}

export async function handleExportUsersCsv(): Promise<string> {
  const allUsers = await prisma.user.findMany({
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
}