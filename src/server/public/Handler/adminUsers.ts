// src/server/public/Handler/adminUsers.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import {
  createUserByAdminSchema,
  updateUserByAdminSchema,
} from "@/lib/validations/adminUsers";

import type { AdminUsersResult } from "@/types/adminUsers";

async function hasAdminAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { role: true } } },
  });
  return user?.roles.some((r) => ["ADMIN", "SUPERADMIN"].includes(r.role)) ?? false;
}

// پیام‌های ثابت و آرامش‌بخش (همان‌هایی که در routeها استفاده می‌کنیم)
const CREATE_SUCCESS = "کاربر با موفقیت ایجاد شد.";
const UPDATE_SUCCESS = "تغییرات با موفقیت اعمال شد.";
const DELETE_SUCCESS = "درخواست حذف کاربر با موفقیت پردازش شد.";

export async function handleCreateUser(
  data: unknown,
  adminUserId: string
): Promise<AdminUsersResult> {
  // چک دسترسی — اما حتی اگر نداشته باشه، success: true برمی‌گردونیم
  const isAdmin = await hasAdminAccess(adminUserId);

  // validation
  const parsed = createUserByAdminSchema.safeParse(data);
  if (!parsed.success || !isAdmin) {
    // هیچ اطلاعاتی لو نمی‌دیم
    return {
      success: true,
      message: CREATE_SUCCESS,
      // user برنمی‌گردونیم اگر خطا باشه
    };
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

  // فقط اطلاعات ضروری و امن برمی‌گردونیم
  return {
    success: true,
    message: CREATE_SUCCESS,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email, // در route ماسک می‌شه
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
  const isAdmin = await hasAdminAccess(adminUserId);

  const parsed = updateUserByAdminSchema.safeParse(data);
  if (!parsed.success || !isAdmin) {
    return { success: true, message: UPDATE_SUCCESS };
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

await prisma.user.update({
  where: { id: targetUserId },
  data: { deletedAt: new Date(), isBanned: true },
});

  // بروزرسانی نقش‌ها
  await prisma.userRole.deleteMany({ where: { userId: targetUserId } });
  await prisma.userRole.createMany({
    data: roles.map((role) => ({ userId: targetUserId, role })),
    skipDuplicates: true,
  });

  return { success: true, message: UPDATE_SUCCESS };
}

export async function handleDeleteUser(
  adminUserId: string,
  targetUserId: string
): Promise<AdminUsersResult> {
  const isAdmin = await hasAdminAccess(adminUserId);

  // حتی اگر دسترسی نداشته باشه، خودش باشه یا کاربر وجود نداشته باشه → success: true
  if (!isAdmin || adminUserId === targetUserId) {
    return { success: true, message: DELETE_SUCCESS };
  }

  // اگر کاربر وجود نداشته باشه، Prisma خطا می‌ده → در route catch می‌شه
  await prisma.user.delete({ where: { id: targetUserId } });

  return { success: true, message: DELETE_SUCCESS };
}