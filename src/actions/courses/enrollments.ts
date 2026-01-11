// lib/actions/enrollment.actions.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { Prisma, EnrollmentStatus } from "@prisma/client";
import { notifyEnrollmentStatus } from "./notification.actions";

const PAGE_SIZE = 12;

// ── Helper: چک دسترسی ادمین یا مدرس/هم‌مدرس به دوره ─────────────
async function canAccessEnrollment(userId: string, courseId: string): Promise<boolean> {
  const [roles, course] = await Promise.all([
    prisma.userRole.findMany({
      where: { userId },
      select: { role: true },
    }),
    prisma.course.findUnique({
      where: { id: courseId },
      select: {
        instructorId: true,
        coInstructors: { select: { id: true } },
      },
    }),
  ]);

  if (!course) return false;

  const userRoles = roles.map(r => r.role);
  if (userRoles.some(r => ["ADMIN", "SUPER_ADMIN"].includes(r))) return true;

  const coIds = course.coInstructors.map(c => c.id);
  return course.instructorId === userId || coIds.includes(userId);
}

// ── اسکیماها (بهبودیافته و ترجمه‌پذیر) ──────────────────────────
const getChangeStatusSchema = (t: (key: string) => string) =>
  z.object({
    enrollmentId: z.string().cuid({ message: t("invalid_enrollment_id") }),
    action: z.enum(["APPROVE", "REJECT", "CANCEL"], {
      message: t("invalid_action"),
    }),
    rejectReason: z.string().max(500).optional(),
    honeypot: z.string().optional(),
  });

// ── ۱. تغییر وضعیت ثبت‌نام (تأیید / رد / لغو) ─────────────────────
export async function changeEnrollmentStatusAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("enrollments");

  if (!session?.user?.id) {
    return { success: false, error: t("please_login") };
  }

  const userId = session.user.id as string;

  const raw = Object.fromEntries(formData);
  const parsed = getChangeStatusSchema(key => t(key)).safeParse(raw);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { enrollmentId, action, rejectReason, honeypot } = parsed.data;

  if (honeypot?.length) return { success: true };

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      course: { select: { id: true, title: true, slug: true } },
      user: { select: { id: true, name: true } },
    },
  });

  if (!enrollment) {
    return { success: false, error: t("enrollment_not_found") };
  }

  if (!(await canAccessEnrollment(userId, enrollment.courseId))) {
    return { success: false, error: t("unauthorized") };
  }

  // جلوگیری از تغییر وضعیت ثبت‌نام‌های قبلاً نهایی‌شده
  if (
    [EnrollmentStatus.APPROVED, EnrollmentStatus.REJECTED, EnrollmentStatus.CANCELLED].includes(
      enrollment.status
    ) &&
    action !== "CANCEL" // فقط لغو برای موارد خاص مجاز است
  ) {
    return { success: false, error: t("enrollment_already_finalized") };
  }

  let newStatus: EnrollmentStatus;
  switch (action) {
    case "APPROVE":
      newStatus = EnrollmentStatus.APPROVED;
      break;
    case "REJECT":
      newStatus = EnrollmentStatus.REJECTED;
      break;
    case "CANCEL":
      newStatus = EnrollmentStatus.CANCELLED;
      break;
    default:
      return { success: false, error: t("invalid_action") };
  }

  try {
    const updated = await prisma.$transaction(async tx => {
      const enrollmentUpdated = await tx.enrollment.update({
        where: { id: enrollmentId },
        data: {
          status: newStatus,
          approvedAt: newStatus === EnrollmentStatus.APPROVED ? new Date() : null,
          rejectedAt: newStatus === EnrollmentStatus.REJECTED ? new Date() : null,
          rejectReason: newStatus === EnrollmentStatus.REJECTED ? rejectReason?.trim() : null,
        },
        include: {
          course: { select: { title: true, slug: true } },
          user: { select: { id: true } },
        },
      });

      // به‌روزرسانی تعداد ثبت‌نام‌های تأییدشده در دوره (denormalized)
      if (newStatus === EnrollmentStatus.APPROVED) {
        await tx.course.update({
          where: { id: enrollment.courseId },
          data: { enrolledCount: { increment: 1 } },
        });
      }

      return enrollmentUpdated;
    });

    // ارسال نوتیفیکیشن به دانشجو
    await notifyEnrollmentStatus(
      enrollment.userId,
      enrollment.courseId,
      newStatus
    );

    revalidatePath(`/dashboard/instructor/enrollments`);
    revalidatePath(`/dashboard/instructor/courses/${enrollment.courseId}/enrollments`);
    revalidatePath(`/dashboard/student/enrollments`);

    return {
      success: true,
      message: t("enrollment_status_updated"),
      enrollment: updated,
    };
  } catch (err) {
    console.error("Error changing enrollment status:", err);
    return { success: false, error: t("server_error") };
  }
}

// ── ۲. لیست ثبت‌نام‌ها برای مدرس/ادمین (فیلتر پیشرفته) ────────────
export async function fetchInstructorEnrollments({
  search = "",
  page = 1,
  courseId: courseFilter,
  groupId,
  status: statusFilter,
  userId,
}: {
  search?: string;
  page?: number;
  courseId?: string;
  groupId?: string;
  status?: EnrollmentStatus | "all";
  userId: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.id !== userId) {
    return { items: [], totalItems: 0, stats: {} };
  }

  const where: Prisma.EnrollmentWhereInput = {
    course: courseFilter && courseFilter !== "all" ? { id: courseFilter } : {},
    group: groupId ? { id: groupId } : undefined,
    status: statusFilter && statusFilter !== "all" ? statusFilter : undefined,
    deletedAt: null,
  };

  if (search.trim()) {
    const term = search.trim();
    where.OR = [
      { user: { name: { contains: term, mode: "insensitive" } } },
      { user: { email: { contains: term, mode: "insensitive" } } },
      { course: { title: { contains: term, mode: "insensitive" } } },
    ];
  }

  // فقط دوره‌هایی که کاربر دسترسی دارد
  if (!(await hasAdminAccess(userId))) {
    where.course = {
      ...where.course,
      OR: [
        { instructorId: userId },
        { coInstructors: { some: { id: userId } } },
      ],
    };
  }

  const [enrollments, totalItems, statsRaw] = await Promise.all([
    prisma.enrollment.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        course: { select: { id: true, title: true, slug: true } },
        group: { select: { id: true, title: true, color: true } },
      },
      orderBy: { enrolledAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.enrollment.count({ where }),
    prisma.enrollment.groupBy({
      by: ["status"],
      _count: { status: true },
      where,
    }),
  ]);

  const stats = {
    total: totalItems,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
  };

  statsRaw.forEach(({ status, _count }) => {
    const key = status.toLowerCase() as keyof typeof stats;
    if (key in stats) stats[key] = _count.status;
  });

  return {
    items: enrollments.map(e => ({
      id: e.id,
      user: e.user,
      course: e.course,
      group: e.group,
      status: e.status,
      enrolledAt: e.enrolledAt.toISOString(),
      approvedAt: e.approvedAt?.toISOString() ?? null,
    })),
    totalItems,
    stats,
  };
}