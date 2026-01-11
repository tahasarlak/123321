// lib/actions/admin-users.actions.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

const PAGE_SIZE = 12;

// ── Helper Functions ───────────────────────────────────────────────
async function getUserRoles(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { role: true } } },
  });
  return user?.roles.map((r) => r.role) || [];
}

async function isAdmin(userId: string) {
  const roles = await getUserRoles(userId);
  return roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");
}

async function isSuperAdmin(userId: string) {
  const roles = await getUserRoles(userId);
  return roles.includes("SUPER_ADMIN");
}

async function logAdminAction(
  adminId: string,
  action: string,
  targetUserId: string | null = null,
  details: any = {}
) {
  await prisma.activityLog.create({
    data: {
      userId: adminId,
      action: `ADMIN_${action.toUpperCase()}`,
      entity: "User",
      entityId: targetUserId || undefined,
      details,
    },
  });
}

// ── Schemas ─────────────────────────────────────────────────────────
const baseUserSchema = z.object({
  name: z.string().min(1, "نام الزامی است").max(100),
  email: z.string().email("ایمیل نامعتبر است"),
  phone: z.string().optional(),
  bio: z.string().max(500).optional(),
  expertise: z.string().max(100).optional(),
  instagram: z.string().url().or(z.literal("")).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  birthDate: z.string().optional(),
  universityId: z.string().optional(),
  majorId: z.string().optional(),
  studentId: z.string().optional(),
  entranceYear: z.coerce.number().optional(),
  academicStatus: z.enum(["ACTIVE", "GRADUATED", "DROPPED_OUT", "SUSPENDED", "ON_LEAVE"]).optional(),
  honeypot: z.string().optional(),
});

const createUserSchema = baseUserSchema.extend({
  password: z.string().min(6, "رمز عبور حداقل ۶ کاراکتر"),
  roles: z.array(z.string()).min(1, "حداقل یک نقش انتخاب شود"),
});

const updateUserSchema = baseUserSchema.extend({
  password: z.string().min(6).optional(),
  roles: z.array(z.string()).optional(),
});

// ── ۱. دریافت تاریخچه تغییرات نقش کاربر ──────────────────────────
export async function fetchUserRoleHistory({
  targetUserId,
  page = 1,
  pageSize = 20,
  adminUserId,
}: {
  targetUserId: string;
  page?: number;
  pageSize?: number;
  adminUserId: string;
}) {
  if (!(await isAdmin(adminUserId))) {
    return {
      success: false,
      error: "فقط ادمین می‌تواند تاریخچه نقش‌ها را مشاهده کند",
      history: [],
      total: 0,
    };
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, name: true, email: true },
  });

  if (!targetUser) {
    return { success: false, error: "کاربر یافت نشد", history: [], total: 0 };
  }

  const skip = (page - 1) * pageSize;

  const [history, total] = await Promise.all([
    prisma.userRoleHistory.findMany({
      where: { userId: targetUserId },
      include: {
        changedBy: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { changedAt: "desc" },
      take: pageSize,
      skip,
    }),
    prisma.userRoleHistory.count({ where: { userId: targetUserId } }),
  ]);

  const formatted = history.map((entry) => ({
    id: entry.id,
    action: entry.action,
    oldRole: entry.oldRole,
    newRole: entry.newRole,
    reason: entry.reason || "تغییر توسط ادمین",
    changedAt: entry.changedAt.toISOString(),
    changedBy: entry.changedBy
      ? {
          id: entry.changedBy.id,
          name: entry.changedBy.name,
          email: entry.changedBy.email,
          image: entry.changedBy.image,
        }
      : null,
  }));

  await logAdminAction(adminUserId, "VIEW_ROLE_HISTORY", targetUserId, {
    targetEmail: targetUser.email,
    viewedEntries: total,
  });

  return {
    success: true,
    user: { id: targetUser.id, name: targetUser.name, email: targetUser.email },
    history: formatted,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

// ── ۲. لیست کاربران با فیلتر و آمار ────────────────────────────────
export async function fetchUsers({
  search = "",
  page = 1,
  roleFilter = "ALL",
  universityId,
  majorId,
  academicStatus,
  isActive,
  isBanned,
  sortBy = "createdAt",
  sortOrder = "desc",
  userId,
}: {
  search?: string;
  page?: number;
  roleFilter?: string;
  universityId?: string;
  majorId?: string;
  academicStatus?: string;
  isActive?: boolean;
  isBanned?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  userId: string;
}) {
  if (!(await isAdmin(userId))) {
    return { items: [], totalItems: 0, stats: [] };
  }

  const where: Prisma.UserWhereInput = { deletedAt: null };

  if (roleFilter && roleFilter !== "ALL") {
    where.roles = { some: { role: roleFilter.toUpperCase() } };
  }

  if (search.trim()) {
    const term = search.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { phone: { contains: term, mode: "insensitive" } },
      { expertise: { contains: term, mode: "insensitive" } },
      { university: { name: { contains: term, mode: "insensitive" } } },
      { major: { name: { contains: term, mode: "insensitive" } } },
    ];
  }

  if (universityId) where.universityId = universityId;
  if (majorId) where.majorId = majorId;
  if (academicStatus) where.academicStatus = academicStatus;
  if (isActive !== undefined) where.isActive = isActive;
  if (isBanned !== undefined) where.isBanned = isBanned;

  const orderBy =
    sortBy === "coursesCount"
      ? { taughtCourses: { _count: sortOrder } }
      : { [sortBy]: sortOrder };

  const skip = (page - 1) * PAGE_SIZE;

  const [users, totalItems, activeCount, bannedCount, instructorCount] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        bio: true,
        expertise: true,
        roles: { select: { role: true } },
        university: { select: { name: true } },
        major: { select: { name: true } },
        _count: { select: { taughtCourses: true } },
        isActive: true,
        isBanned: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy,
      take: PAGE_SIZE,
      skip,
    }),
    prisma.user.count({ where }),
    prisma.user.count({ where: { ...where, isActive: true } }),
    prisma.user.count({ where: { ...where, isBanned: true } }),
    prisma.user.count({
      where: { ...where, roles: { some: { role: "INSTRUCTOR" } } },
    }),
  ]);

  const items = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    image: u.image,
    bio: u.bio,
    expertise: u.expertise,
    roles: u.roles.map((r) => r.role),
    university: u.university?.name,
    major: u.major?.name,
    coursesCount: u._count.taughtCourses,
    isActive: u.isActive,
    isBanned: u.isBanned,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  }));

  const stats = [
    { key: "total", count: totalItems, label: "کل کاربران" },
    { key: "active", count: activeCount, label: "فعال" },
    { key: "banned", count: bannedCount, label: "مسدود" },
    { key: "instructors", count: instructorCount, label: "مدرسین" },
  ];

  return { items, totalItems, stats };
}

// ── ۳. ایجاد کاربر جدید ─────────────────────────────────────────────
export async function createUserAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !(await isAdmin(session.user.id))) {
    return { success: false, error: "دسترسی ممنوع" };
  }

  const raw = Object.fromEntries(formData);
  const parsed = createUserSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  const data = parsed.data;
  if (data.honeypot?.length) return { success: true, message: "عملیات موفق" };

  const existing = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });

  if (existing) return { success: false, error: "این ایمیل قبلاً ثبت شده است" };

  const hashed = await bcrypt.hash(data.password, 12);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase(),
        password: hashed,
        roles: {
          create: data.roles.map((role) => ({ role })),
        },
      },
    });

    // ثبت تاریخچه نقش اولیه
    await tx.userRoleHistory.createMany({
      data: data.roles.map((role) => ({
        userId: newUser.id,
        newRole: role,
        action: "CREATED",
        changedById: session.user.id,
        reason: "ایجاد کاربر جدید توسط ادمین",
      })),
    });

    return newUser;
  });

  await logAdminAction(session.user.id, "CREATE_USER", user.id, { email: user.email });

  revalidatePath("/dashboard/admin/users");

  return { success: true, message: "کاربر با موفقیت ایجاد شد" };
}

// ── ۴. بروزرسانی کاربر (با مدیریت کامل نقش‌ها) ─────────────────────
export async function updateUserAction(formData: FormData, targetUserId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !(await isAdmin(session.user.id))) {
    return { success: false, error: "دسترسی ممنوع" };
  }

  const adminId = session.user.id;

  // جلوگیری از تغییر تنها SUPER_ADMIN باقی‌مانده
  if (targetUserId === adminId) {
    const adminRoles = await getUserRoles(adminId);
    if (adminRoles.includes("SUPER_ADMIN")) {
      const superCount = await prisma.userRole.count({
        where: { role: "SUPER_ADMIN" },
      });
      if (superCount <= 1) {
        return { success: false, error: "نمی‌توانید تنها SUPER_ADMIN سیستم را تغییر دهید" };
      }
    }
  }

  const raw = Object.fromEntries(formData);
  const parsed = updateUserSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  const data = parsed.data;
  if (data.honeypot?.length) return { success: true };

  // چک تکراری بودن ایمیل
  if (data.email) {
    const existing = await prisma.user.findFirst({
      where: {
        email: data.email.toLowerCase(),
        id: { not: targetUserId },
      },
    });
    if (existing) return { success: false, error: "این ایمیل توسط کاربر دیگری استفاده می‌شود" };
  }

  const updateData: Prisma.UserUpdateInput = {
    name: data.name,
    email: data.email?.toLowerCase(),
    phone: data.phone,
    bio: data.bio,
    expertise: data.expertise,
    instagram: data.instagram,
    gender: data.gender,
    birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
    universityId: data.universityId,
    majorId: data.majorId,
    studentId: data.studentId,
    entranceYear: data.entranceYear,
    academicStatus: data.academicStatus,
  };

  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 12);
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetUserId },
      data: updateData,
    });

    if (data.roles) {
      const current = await tx.userRole.findMany({
        where: { userId: targetUserId },
        select: { role: true },
      });

      const currentSet = new Set(current.map((r) => r.role));
      const newSet = new Set(data.roles);

      const granted = data.roles.filter((r) => !currentSet.has(r));
      const revoked = current.map((r) => r.role).filter((r) => !newSet.has(r));

      // حذف همه نقش‌های قبلی
      await tx.userRole.deleteMany({ where: { userId: targetUserId } });

      // اضافه کردن نقش‌های جدید
      await tx.userRole.createMany({
        data: data.roles.map((role) => ({ userId: targetUserId, role })),
      });

      // ثبت تاریخچه تغییرات
      const historyEntries = [
        ...granted.map((role) => ({
          userId: targetUserId,
          newRole: role,
          action: "GRANTED" as const,
          changedById: adminId,
          reason: "تغییر توسط ادمین",
        })),
        ...revoked.map((role) => ({
          userId: targetUserId,
          oldRole: role,
          action: "REVOKED" as const,
          changedById: adminId,
          reason: "تغییر توسط ادمین",
        })),
      ];

      if (historyEntries.length > 0) {
        await tx.userRoleHistory.createMany({ data: historyEntries });
      }
    }
  });

  await logAdminAction(adminId, "UPDATE_USER", targetUserId, {
    changedFields: Object.keys(updateData),
    rolesChanged: data.roles ? "updated" : "unchanged",
  });

  revalidatePath("/dashboard/admin/users");
  revalidatePath(`/dashboard/admin/users/${targetUserId}`);

  return { success: true, message: "کاربر با موفقیت به‌روزرسانی شد" };
}

// ── ۵. عملیات گروهی روی کاربران ────────────────────────────────────
export async function bulkUserAction(
  selectedIds: string[],
  action: "activate" | "deactivate" | "ban" | "unban" | "soft-delete",
  adminUserId: string
) {
  if (!(await isAdmin(adminUserId))) {
    return { success: false, error: "دسترسی ممنوع" };
  }

  if (selectedIds.length === 0) {
    return { success: false, error: "هیچ کاربری انتخاب نشده است" };
  }

  const session = await getServerSession(authOptions);
  const currentAdminId = session?.user?.id;

  if (currentAdminId && selectedIds.includes(currentAdminId)) {
    return { success: false, error: "نمی‌توانید عملیات گروهی روی حساب خودتان انجام دهید" };
  }

  // حفاظت از SUPER_ADMIN ها
  if (action === "soft-delete") {
    const superAdminsSelected = await prisma.userRole.findMany({
      where: {
        userId: { in: selectedIds },
        role: "SUPER_ADMIN",
      },
      select: { userId: true },
    });

    if (superAdminsSelected.length > 0) {
      const totalSuper = await prisma.userRole.count({
        where: { role: "SUPER_ADMIN" },
      });

      if (totalSuper === superAdminsSelected.length) {
        return {
          success: false,
          error: "نمی‌توانید تمام SUPER_ADMIN های سیستم را حذف کنید",
        };
      }

      // حذف SUPER_ADMIN ها از لیست عملیات
      selectedIds = selectedIds.filter(
        (id) => !superAdminsSelected.some((s) => s.userId === id)
      );

      if (selectedIds.length === 0) {
        return { success: false, error: "هیچ کاربر مجاز برای عملیات باقی نماند" };
      }
    }
  }

  if (action === "soft-delete") {
    await prisma.user.updateMany({
      where: { id: { in: selectedIds } },
      data: { deletedAt: new Date() },
    });
  } else if (action === "ban") {
    await prisma.user.updateMany({
      where: { id: { in: selectedIds } },
      data: { isBanned: true },
    });
  } else if (action === "unban") {
    await prisma.user.updateMany({
      where: { id: { in: selectedIds } },
      data: { isBanned: false },
    });
  } else {
    await prisma.user.updateMany({
      where: { id: { in: selectedIds } },
      data: { isActive: action === "activate" },
    });
  }

  await logAdminAction(adminUserId, `BULK_${action.toUpperCase()}`, null, {
    count: selectedIds.length,
    affectedIds: selectedIds.slice(0, 10),
  });

  revalidatePath("/dashboard/admin/users");

  return {
    success: true,
    message: `عملیات ${action} روی ${selectedIds.length} کاربر با موفقیت انجام شد`,
  };
}