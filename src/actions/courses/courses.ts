// lib/actions/course.actions.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { Prisma, CourseStatus } from "@prisma/client";
import { slugify } from "@/lib/utils/slugify";
import { notifyCourseStatusChanged } from "./notification.actions";

const PAGE_SIZE = 12;

// ── Helper Functions ───────────────────────────────────────────────
async function hasAdminAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { role: true } } },
  });
  return user?.roles.some(r => ["ADMIN", "SUPER_ADMIN"].includes(r.role)) ?? false;
}

async function canAccessCourse(userId: string, courseId: string): Promise<boolean> {
  if (await hasAdminAccess(userId)) return true;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      instructorId: true,
      coInstructors: { select: { id: true } },
    },
  });

  if (!course) return false;

  const coIds = course.coInstructors.map(c => c.id);
  return course.instructorId === userId || coIds.includes(userId);
}

// ── ۱. لیست دوره‌ها برای ادمین (فیلتر پیشرفته + آمار کامل) ───────
export async function fetchAdminCourses({
  search = "",
  page = 1,
  status,
  instructorId,
  categoryId,
  minPrice,
  maxPrice,
  hasDiscount,
}: {
  search?: string;
  page?: number;
  status?: CourseStatus | "all";
  instructorId?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  hasDiscount?: boolean;
}) {
  const where: Prisma.CourseWhereInput = { deletedAt: null };

  if (search.trim()) {
    const term = search.trim();
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { code: { contains: term, mode: "insensitive" } },
      { slug: { contains: term, mode: "insensitive" } },
      { instructor: { name: { contains: term, mode: "insensitive" } } },
      { tags: { some: { name: { contains: term, mode: "insensitive" } } } },
      { categories: { some: { name: { contains: term, mode: "insensitive" } } } },
    ];
  }

  if (status && status !== "all") where.status = status as CourseStatus;
  if (instructorId) where.instructorId = instructorId;
  if (categoryId) where.categories = { some: { id: categoryId } };

  if (minPrice !== undefined || maxPrice !== undefined || hasDiscount !== undefined) {
    where.OR = [
      {
        price: {
          ...(minPrice !== undefined && { gte: minPrice }),
          ...(maxPrice !== undefined && { lte: maxPrice }),
        },
      },
      ...(hasDiscount ? [{ discountPercent: { gt: 0 } }] : []),
    ];
  }

  const [courses, total, statusCounts, revenueStats, enrollmentStats] = await Promise.all([
    prisma.course.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        slug: true,
        code: true,
        status: true,
        type: true,
        price: true,
        discountPercent: true,
        enrolledCount: true,
        totalRevenue: true,
        instructor: { select: { id: true, name: true, image: true } },
        categories: { select: { name: true } },
        tags: { select: { name: true } },
        createdAt: true,
        publishedAt: true,
        _count: { select: { buyers: true, enrollments: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.course.count({ where }),
    prisma.course.groupBy({
      by: ["status"],
      _count: { status: true },
      where,
    }),
    prisma.course.aggregate({
      where,
      _sum: { totalRevenue: true },
      _avg: { price: true },
    }),
    prisma.enrollment.groupBy({
      by: ["courseId"],
      _count: { id: true },
      where: { status: "APPROVED" },
    }),
  ]);

  const stats = {
    total: total,
    byStatus: Object.fromEntries(statusCounts.map(s => [s.status.toLowerCase(), s._count.status])),
    totalRevenue: revenueStats._sum.totalRevenue || 0,
    avgPrice: revenueStats._avg.price || 0,
    totalEnrollments: enrollmentStats.reduce((sum, e) => sum + e._count.id, 0),
  };

  return { items: courses, totalItems: total, stats };
}

// ── ۲. لیست دوره‌های مدرس ──────────────────────────────────────────
export async function fetchInstructorCourses({
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

  const where: Prisma.CourseWhereInput = {
    OR: [
      { instructorId: userId },
      { coInstructors: { some: { id: userId } } },
    ],
    deletedAt: null,
  };

  if (search.trim()) {
    const term = search.trim();
    where.AND = [
      {
        OR: [
          { title: { contains: term, mode: "insensitive" } },
          { slug: { contains: term, mode: "insensitive" } },
          { code: { contains: term, mode: "insensitive" } },
        ],
      },
    ];
  }

  const [items, totalItems, statsRaw] = await Promise.all([
    prisma.course.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        enrolledCount: true,
        totalRevenue: true,
        categories: { select: { name: true } },
        tags: { select: { name: true } },
        _count: { select: { buyers: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.course.count({ where }),
    prisma.course.groupBy({
      by: ["status"],
      _count: { status: true },
      where,
    }),
  ]);

  const stats = statsRaw.reduce((acc: Record<string, number>, curr) => {
    acc[curr.status.toLowerCase()] = curr._count.status;
    return acc;
  }, {});

  return { items, totalItems, stats };
}

// ── ۳. ایجاد دوره جدید (با transaction کامل) ───────────────────────
export async function createCourse(formData: FormData) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("courses");

  if (!session?.user?.id) return { success: false, error: t("please_login") };

  const userId = session.user.id as string;
  const isAdmin = await hasAdminAccess(userId);

  const raw = Object.fromEntries(formData);
  const schema = getCreateCourseSchema(key => t(key));
  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const data = parsed.data;

  if (data.honeypot?.length) return { success: true };

  // تولید slug هوشمند و یکتا
  let slug = slugify(data.title);
  let uniqueSlug = slug;
  let counter = 1;
  while (await prisma.course.findUnique({ where: { slug: uniqueSlug } })) {
    uniqueSlug = `${slug}-${counter++}`;
  }

  try {
    const course = await prisma.$transaction(async tx => {
      const newCourse = await tx.course.create({
        data: {
          title: data.title.trim(),
          slug: uniqueSlug,
          instructorId: isAdmin && data.instructorId ? data.instructorId : userId,
          status: isAdmin ? (data.status ?? CourseStatus.DRAFT) : CourseStatus.PENDING_REVIEW,
          language: data.language,
          level: data.level,
          ...data,
          categories: data.categoryIds?.length
            ? { connect: data.categoryIds.map(id => ({ id })) }
            : undefined,
          tags: data.tagIds?.length
            ? { connect: data.tagIds.map(id => ({ id })) }
            : undefined,
          coInstructors: data.coInstructorIds?.length
            ? { connect: data.coInstructorIds.map(id => ({ id })) }
            : undefined,
        },
        include: {
          instructor: { select: { id: true, name: true } },
        },
      });

      if (isAdmin && newCourse.status === CourseStatus.PUBLISHED) {
        await notifyCourseStatusChanged(newCourse.instructorId, newCourse.id, "PUBLISHED");
      }

      return newCourse;
    });

    revalidatePath("/dashboard/instructor/courses");
    revalidatePath("/dashboard/admin/courses");
    revalidatePath("/dashboard/admin/pending-courses");

    return {
      success: true,
      message: t("course_created_success"),
      course,
    };
  } catch (err) {
    console.error("Error creating course:", err);
    return { success: false, error: t("server_error") };
  }
}

// ── ۴. ویرایش دوره ──────────────────────────────────────────────────
export async function editCourse(formData: FormData) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("courses");

  if (!session?.user?.id) return { success: false, error: t("please_login") };

  const userId = session.user.id as string;

  const raw = Object.fromEntries(formData);
  const schema = getEditCourseSchema(key => t(key));
  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { id, title, categoryIds, tagIds, coInstructorIds, ...updateData } = parsed.data;

  if (!(await canAccessCourse(userId, id))) {
    return { success: false, error: t("not_owner") };
  }

  let newSlug: string | undefined;
  if (title) {
    let slug = slugify(title);
    let uniqueSlug = slug;
    let counter = 1;
    while (await prisma.course.findUnique({
      where: { slug: uniqueSlug, NOT: { id } }
    })) {
      uniqueSlug = `${slug}-${counter++}`;
    }
    newSlug = uniqueSlug;
  }

  try {
    const course = await prisma.$transaction(async tx => {
      const updated = await tx.course.update({
        where: { id },
        data: {
          ...updateData,
          ...(newSlug && { slug: newSlug }),
          categories: categoryIds !== undefined
            ? { set: [], connect: categoryIds.map(id => ({ id })) }
            : undefined,
          tags: tagIds !== undefined
            ? { set: [], connect: tagIds.map(id => ({ id })) }
            : undefined,
          coInstructors: coInstructorIds !== undefined
            ? { set: coInstructorIds.map(id => ({ id })) }
            : undefined,
        },
      });

      return updated;
    });

    revalidatePath("/dashboard/instructor/courses");
    revalidatePath("/dashboard/admin/courses");
    revalidatePath(`/courses/${course.slug}`);

    return {
      success: true,
      message: t("course_updated_success"),
      course,
    };
  } catch (err) {
    console.error("Error editing course:", err);
    return { success: false, error: t("server_error") };
  }
}

// ── ۵. تأیید دوره (ادمین) ──────────────────────────────────────────
export async function approveCourse(courseId: string) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("courses");

  if (!session?.user?.id || !(await hasAdminAccess(session.user.id as string))) {
    return { success: false, error: t("admin_only") };
  }

  const course = await prisma.course.update({
    where: { id: courseId },
    data: {
      status: CourseStatus.PUBLISHED,
      publishedAt: new Date(),
    },
    select: {
      id: true,
      title: true,
      instructorId: true,
      instructor: { select: { name: true } },
    },
  });

  if (course.instructorId) {
    await notifyCourseStatusChanged(course.instructorId, course.id, "PUBLISHED");
  }

  revalidatePath("/dashboard/admin/courses");
  revalidatePath("/dashboard/admin/pending-courses");
  revalidatePath(`/courses/${course.id}`);

  return { success: true, message: t("course_published") };
}

// ── ۶. رد دوره با دلیل (ادمین) ─────────────────────────────────────
export async function rejectCourse(courseId: string, reason: string) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("courses");

  if (!session?.user?.id || !(await hasAdminAccess(session.user.id as string))) {
    return { success: false, error: t("admin_only") };
  }

  const course = await prisma.course.update({
    where: { id: courseId },
    data: {
      status: CourseStatus.REJECTED,
      rejectReason: reason.trim() || "دلیل مشخص نشده",
    },
    select: {
      id: true,
      title: true,
      instructorId: true,
    },
  });

  if (course.instructorId) {
    await notifyCourseStatusChanged(course.instructorId, course.id, "REJECTED", reason);
  }

  revalidatePath("/dashboard/admin/courses");
  revalidatePath("/dashboard/admin/pending-courses");

  return { success: true, message: t("course_rejected") };
}

// ── ۷. حذف دوره (soft-delete) ───────────────────────────────────────
export async function deleteCourse(courseId: string) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("courses");

  if (!session?.user?.id || !(await hasAdminAccess(session.user.id as string))) {
    return { success: false, error: t("admin_only") };
  }

  await prisma.course.update({
    where: { id: courseId },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/dashboard/admin/courses");

  return { success: true, message: t("course_deleted") };
}

// ── ۸. عملیات گروهی پیشرفته روی دوره‌ها ────────────────────────────
export async function bulkCourseAction(
  ids: string[],
  action: "publish" | "unpublish" | "archive" | "delete" | "pending" | "reject",
  reason?: string
) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("courses");

  if (!session?.user?.id || !(await hasAdminAccess(session.user.id as string))) {
    return { success: false, error: t("admin_only") };
  }

  if (ids.length === 0) {
    return { success: false, error: t("no_courses_selected") };
  }

  const statusMap: Record<typeof action, CourseStatus> = {
    publish: CourseStatus.PUBLISHED,
    unpublish: CourseStatus.DRAFT,
    archive: CourseStatus.ARCHIVED,
    pending: CourseStatus.PENDING_REVIEW,
    reject: CourseStatus.REJECTED,
    delete: CourseStatus.DRAFT, // برای delete فقط soft-delete
  };

  try {
    if (action === "delete") {
      await prisma.course.updateMany({
        where: { id: { in: ids } },
        data: { deletedAt: new Date() },
      });
    } else {
      const updateData: Prisma.CourseUpdateManyMutationInput = {
        status: statusMap[action],
      };

      if (action === "publish") {
        updateData.publishedAt = new Date();
      }
      if (action === "reject" && reason) {
        updateData.rejectReason = reason.trim();
      }

      await prisma.course.updateMany({
        where: { id: { in: ids } },
        data: updateData,
      });

      // نوتیفیکیشن برای مدرسین
      const affected = await prisma.course.findMany({
        where: { id: { in: ids } },
        select: { instructorId: true, title: true },
      });

      for (const c of affected) {
        if (c.instructorId) {
          await notifyCourseStatusChanged(
            c.instructorId,
            c.id,
            action.toUpperCase(),
            reason
          );
        }
      }
    }

    revalidatePath("/dashboard/admin/courses");
    revalidatePath("/dashboard/admin/pending-courses");

    return {
      success: true,
      message: `${ids.length} دوره با موفقیت ${action === "delete" ? "حذف" : action === "publish" ? "منتشر" : "تغییر وضعیت"} شدند`,
    };
  } catch (err) {
    console.error("Bulk course action error:", err);
    return { success: false, error: t("bulk_action_error") };
  }
}

// ── ۹. دانلود CSV دوره‌ها (فیلتر شده + کامل) ──────────────────────
export async function exportCoursesCsv(filters: {
  search?: string;
  status?: CourseStatus | "all";
  instructorId?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !(await hasAdminAccess(session.user.id as string))) {
    throw new Error("فقط ادمین می‌تواند خروجی CSV بگیرد");
  }

  const where: Prisma.CourseWhereInput = { deletedAt: null };

  if (filters.search?.trim()) {
    const term = filters.search.trim();
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { code: { contains: term, mode: "insensitive" } },
      { slug: { contains: term, mode: "insensitive" } },
      { instructor: { name: { contains: term, mode: "insensitive" } } },
    ];
  }

  if (filters.status && filters.status !== "all") {
    where.status = filters.status as CourseStatus;
  }

  if (filters.instructorId) where.instructorId = filters.instructorId;

  const courses = await prisma.course.findMany({
    where,
    include: {
      instructor: { select: { name: true, email: true } },
      categories: { select: { name: true } },
      tags: { select: { name: true } },
      term: { select: { title: true } },
      _count: { select: { buyers: true, enrollments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (courses.length === 0) {
    return "هیچ دوره‌ای برای خروجی یافت نشد.";
  }

  const headers = [
    "شناسه",
    "عنوان",
    "اسلاگ",
    "کد دوره",
    "مدرس",
    "ایمیل مدرس",
    "نوع دوره",
    "وضعیت",
    "قیمت (تومان)",
    "درصد تخفیف",
    "تعداد خریداران",
    "تعداد ثبت‌نام‌ها",
    "درآمد کل (تومان)",
    "دسته‌بندی‌ها",
    "تگ‌ها",
    "ترم",
    "تاریخ ایجاد",
    "تاریخ انتشار",
  ].join(",");

  const rows = courses.map(course => {
    const categories = course.categories.map(c => c.name).join(" | ");
    const tags = course.tags.map(t => t.name).join(" | ");
    const price = course.price ? Number(course.price) : 0;
    return [
      `"${course.id}"`,
      `"${course.title.replace(/"/g, '""')}"`,
      `"${course.slug}"`,
      `"${course.code || ""}"`,
      `"${course.instructor?.name || ""}"`,
      `"${course.instructor?.email || ""}"`,
      `"${course.type}"`,
      `"${course.status}"`,
      `"${price}"`,
      `"${course.discountPercent || 0}"`,
      `"${course._count.buyers}"`,
      `"${course._count.enrollments}"`,
      `"${Number(course.totalRevenue || 0)}"`,
      `"${categories}"`,
      `"${tags}"`,
      `"${course.term?.title || ""}"`,
      `"${course.createdAt.toISOString()}"`,
      `"${course.publishedAt?.toISOString() || ""}"`,
    ].join(",");
  });

  const csvContent = `\uFEFF${headers}\n${rows.join("\n")}`;

  return csvContent;
}

// ── ۱۰. پیش‌نمایش دوره قبل از انتشار ──────────────────────────────
export async function getCoursePreview(courseId: string, userId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.id !== userId) {
    throw new Error("لطفاً وارد شوید");
  }

  if (!(await canAccessCourse(userId, courseId))) {
    throw new Error("شما دسترسی به پیش‌نمایش این دوره را ندارید");
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      instructor: { select: { id: true, name: true, image: true } },
      categories: { select: { name: true } },
      tags: { select: { name: true } },
      sections: {
        include: {
          lessons: {
            select: {
              id: true,
              title: true,
              type: true,
              isFree: true,
              duration: true,
              order: true,
              videoUrl: true, // برای پیش‌نمایش ویدیو
            },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      },
      _count: { select: { lessons: true, buyers: true, enrollments: true } },
    },
  });

  if (!course) throw new Error("دوره یافت نشد");

  return {
    ...course,
    isPreviewMode: true,
    previewStats: {
      totalLessons: course._count.lessons,
      totalSections: course.sections.length,
      estimatedDuration: course.sections.reduce((sum, s) =>
        sum + s.lessons.reduce((acc, l) => acc + (l.duration || 0), 0), 0
      ),
      hasFreeLessons: course.sections.some(s => s.lessons.some(l => l.isFree)),
      hasVideoContent: course.sections.some(s => s.lessons.some(l => !!l.videoUrl)),
      studentCountEstimate: course._count.enrollments,
    },
  };
}