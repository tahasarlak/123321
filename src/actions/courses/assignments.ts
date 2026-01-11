// lib/actions/assignment.actions.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import type { AssignmentType, Prisma } from "@prisma/client";
import { notifyGradeAssigned } from "./notification.actions";

const PAGE_SIZE = 12;

// ── تابع مشترک چک دسترسی (بهینه) ────────────────────────────────
async function canAccessAssignment(userId: string, courseId: string): Promise<boolean> {
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

// ── اسکیماها (دقیق‌تر و ترجمه‌پذیر) ─────────────────────────────
const getCreateEditSchema = (t: (key: string) => string) =>
  z.object({
    id: z.string().cuid().optional(),
    courseId: z.string().cuid({ message: t("invalid_course_id") }),
    groupId: z.string().cuid().nullable().optional(),
    title: z.string().min(3, t("title_too_short")).max(200),
    description: z.string().max(2000).optional(),
    instructions: z.string().max(1500).optional(),
    dueDate: z
      .string()
      .datetime({ message: t("invalid_date") })
      .optional()
      .nullable()
      .refine(val => !val || new Date(val) > new Date(), {
        message: t("due_date_past"),
      }),
    latePenalty: z.coerce.number().min(0).max(100).nullable().optional(),
    maxAttempts: z.coerce.number().int().min(1).max(10).nullable().optional(),
    maxScore: z.coerce.number().min(1).max(1000, t("max_score_too_high")),
    type: z.enum(["TEXT_ONLY", "FILE_ONLY", "TEXT_AND_FILE", "MULTIPLE_FILES"] as const),
    isPublished: z.coerce.boolean().default(false),
    honeypot: z.string().optional(),
  });

const getGradeSchema = (t: (key: string) => string) =>
  z.object({
    submissionId: z.string().cuid(),
    score: z.coerce.number().min(0, t("score_negative")),
    feedback: z.string().max(2000).optional(),
    honeypot: z.string().optional(),
  });

// ── ۱. دریافت لیست تکالیف مدرس (بهینه) ─────────────────────────────
export async function fetchInstructorAssignments({
  search = "",
  page = 1,
  courseId: courseFilter,
  userId,
}: {
  search?: string;
  page?: number;
  courseId?: string;
  userId: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.id !== userId) {
    return { items: [], totalItems: 0, stats: { total: 0, published: 0, pendingGrading: 0 } };
  }

  const currentUserId = session.user.id as string;

  const baseWhere: Prisma.AssignmentWhereInput = search
    ? { title: { contains: search.trim(), mode: "insensitive" } }
    : {};

  const courseWhere = courseFilter && courseFilter !== "all"
    ? { id: courseFilter }
    : { OR: [{ instructorId: currentUserId }, { coInstructors: { some: { id: currentUserId } } }] };

  const where: Prisma.AssignmentWhereInput = {
    ...baseWhere,
    course: courseWhere,
    deletedAt: null, // فقط تکالیف غیرحذف‌شده
  };

  const [assignments, totalItems, publishedCount, pendingGradingCount] = await Promise.all([
    prisma.assignment.findMany({
      where,
      select: {
        id: true,
        title: true,
        type: true,
        maxScore: true,
        dueDate: true,
        isPublished: true,
        _count: { select: { submissions: true } },
        course: { select: { id: true, title: true } },
        group: { select: { id: true, title: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.assignment.count({ where }),
    prisma.assignment.count({ where: { ...where, isPublished: true } }),
    prisma.assignmentSubmission.count({
      where: {
        assignment: where,
        score: null,
        gradedAt: null,
      },
    }),
  ]);

  const items = assignments.map(a => ({
    id: a.id,
    title: a.title,
    type: a.type,
    maxScore: a.maxScore,
    dueDate: a.dueDate?.toISOString() ?? null,
    isPublished: a.isPublished,
    submissionsCount: a._count.submissions,
    course: a.course,
    group: a.group,
    createdAt: a.createdAt.toISOString(),
  }));

  return {
    items,
    totalItems,
    stats: {
      total: totalItems,
      published: publishedCount,
      pendingGrading: pendingGradingCount,
    },
  };
}

// ── ۲. ایجاد تکلیف جدید ─────────────────────────────────────────────
export async function createAssignmentAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("assignments");

  if (!session?.user?.id) {
    return { success: false, error: t("please_login") };
  }

  const userId = session.user.id as string;

  const raw = Object.fromEntries(formData);
  const parsed = getCreateEditSchema(key => t(key)).safeParse(raw);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const data = parsed.data;

  if (data.honeypot?.length) return { success: true };

  if (!(await canAccessAssignment(userId, data.courseId))) {
    return { success: false, error: t("unauthorized") };
  }

  try {
    const assignment = await prisma.$transaction(async tx => {
      const newAssignment = await tx.assignment.create({
        data: {
          courseId: data.courseId,
          groupId: data.groupId ?? null,
          title: data.title.trim(),
          description: data.description ?? null,
          instructions: data.instructions ?? null,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          latePenalty: data.latePenalty,
          maxAttempts: data.maxAttempts,
          maxScore: data.maxScore,
          type: data.type as AssignmentType,
          isPublished: data.isPublished,
          publishedAt: data.isPublished ? new Date() : null,
        },
        include: { course: { select: { title: true } } },
      });

      // اگر منتشر شد → نوتیفیکیشن به دانشجویان ثبت‌نام‌شده
      if (data.isPublished) {
        const enrolled = await tx.enrollment.findMany({
          where: {
            run: { courseId: data.courseId },
            status: "APPROVED",
          },
          select: { userId: true },
        });

        if (enrolled.length > 0) {
          // می‌توانید notifyAssignmentCreated بسازید یا مستقیم بفرستید
          console.log(`ارسال نوتیفیکیشن تکلیف جدید به ${enrolled.length} دانشجو`);
          // مثال:
          // await notifyNewAssignment(enrolled.map(e => e.userId), newAssignment);
        }
      }

      return newAssignment;
    });

    revalidatePath("/dashboard/instructor/assignments");
    revalidatePath(`/dashboard/courses/${data.courseId}/assignments`);

    return {
      success: true,
      message: t("assignment_created"),
      assignment,
    };
  } catch (err) {
    console.error("خطا در ایجاد تکلیف:", err);
    return { success: false, error: t("server_error") };
  }
}

// ── ۳. ویرایش تکلیف ─────────────────────────────────────────────────
export async function editAssignmentAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("assignments");

  if (!session?.user?.id) return { success: false, error: t("please_login") };

  const userId = session.user.id as string;

  const raw = Object.fromEntries(formData);
  const parsed = getCreateEditSchema(key => t(key)).safeParse(raw);

  if (!parsed.success || !parsed.data.id) {
    return { success: false, error: parsed.error?.errors?.[0]?.message || "داده نامعتبر" };
  }

  const data = parsed.data;

  if (data.honeypot?.length) return { success: true };

  const existing = await prisma.assignment.findUnique({
    where: { id: data.id },
    select: { courseId: true, isPublished: true },
  });

  if (!existing || !(await canAccessAssignment(userId, existing.courseId))) {
    return { success: false, error: t("unauthorized") };
  }

  // چک دسترسی به دوره جدید (اگر تغییر کرده)
  if (existing.courseId !== data.courseId) {
    if (!(await canAccessAssignment(userId, data.courseId))) {
      return { success: false, error: t("unauthorized_new_course") };
    }
  }

  try {
    const updated = await prisma.$transaction(async tx => {
      const assignment = await tx.assignment.update({
        where: { id: data.id },
        data: {
          courseId: data.courseId,
          groupId: data.groupId ?? null,
          title: data.title.trim(),
          description: data.description ?? null,
          instructions: data.instructions ?? null,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          latePenalty: data.latePenalty,
          maxAttempts: data.maxAttempts,
          maxScore: data.maxScore,
          type: data.type as AssignmentType,
          isPublished: data.isPublished,
          publishedAt: data.isPublished && !existing.isPublished ? new Date() : undefined,
        },
        include: { course: { select: { title: true } } },
      });

      // اگر تازه منتشر شده → نوتیفیکیشن
      if (data.isPublished && !existing.isPublished) {
        // اینجا می‌توانید نوتیفیکیشن ارسال کنید
      }

      return assignment;
    });

    revalidatePath("/dashboard/instructor/assignments");
    revalidatePath(`/dashboard/courses/${data.courseId}/assignments`);

    return {
      success: true,
      message: t("assignment_updated"),
      assignment: updated,
    };
  } catch (err) {
    console.error("خطا در ویرایش تکلیف:", err);
    return { success: false, error: t("server_error") };
  }
}

// ── ۴. حذف تکلیف (soft-delete) ──────────────────────────────────────
export async function deleteAssignmentAction(id: string) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("assignments");

  if (!session?.user?.id) return { success: false, error: t("please_login") };

  const userId = session.user.id as string;

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    select: { courseId: true },
  });

  if (!assignment || !(await canAccessAssignment(userId, assignment.courseId))) {
    return { success: false, error: t("unauthorized") };
  }

  await prisma.assignment.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/dashboard/instructor/assignments");

  return { success: true, message: t("assignment_deleted") };
}

// ── ۵. نمره‌دهی به ارسال تکلیف (پیشرفته) ──────────────────────────
export async function gradeSubmissionAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("assignments");

  if (!session?.user?.id) return { success: false, error: t("please_login") };

  const userId = session.user.id as string;

  const raw = Object.fromEntries(formData);
  const parsed = getGradeSchema(key => t(key)).safeParse(raw);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { submissionId, score, feedback, honeypot } = parsed.data;

  if (honeypot?.length) return { success: true };

  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id: submissionId },
    include: {
      assignment: {
        select: {
          id: true,
          courseId: true,
          maxScore: true,
          title: true,
        },
      },
      user: { select: { id: true, name: true } },
    },
  });

  if (!submission || !(await canAccessAssignment(userId, submission.assignment.courseId))) {
    return { success: false, error: t("unauthorized") };
  }

  if (score > submission.assignment.maxScore) {
    return { success: false, error: t("score_exceeds_max", { max: submission.assignment.maxScore }) };
  }

  try {
    const updated = await prisma.$transaction(async tx => {
      const graded = await tx.assignmentSubmission.update({
        where: { id: submissionId },
        data: {
          score,
          feedback: feedback || null,
          gradedAt: new Date(),
        },
        include: {
          user: { select: { name: true } },
          assignment: { select: { title: true } },
        },
      });

      // به‌روزرسانی تعداد نمره‌داده‌شده (denormalized)
      await tx.assignment.update({
        where: { id: submission.assignment.id },
        data: {
          gradedSubmissionsCount: { increment: 1 },
        },
      });

      return graded;
    });

    // ارسال نوتیفیکیشن به دانشجو
    await notifyGradeAssigned({
      userId: submission.userId,
      courseId: submission.assignment.courseId,
      score,
      maxScore: submission.assignment.maxScore,
      categoryTitle: submission.assignment.title,
      feedback,
      gradedById: userId,
      type: "ASSIGNMENT",
    });

    revalidatePath("/dashboard/instructor/assignments");
    revalidatePath(`/dashboard/assignments/${submission.assignment.id}`);

    return {
      success: true,
      message: t("graded_successfully"),
      submission: updated,
    };
  } catch (err) {
    console.error("خطا در نمره‌دهی:", err);
    return { success: false, error: t("server_error") };
  }
}

// ── ۶. دریافت جزئیات تکلیف برای مدرس ───────────────────────────────
export async function getAssignmentByIdForInstructor(id: string, userId: string) {
  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, title: true } },
      group: { select: { id: true, title: true } },
      submissions: {
        include: {
          user: { select: { id: true, name: true, image: true } },
          files: true,
        },
        orderBy: { submittedAt: "desc" },
      },
    },
  });

  if (!assignment || !(await canAccessAssignment(userId, assignment.courseId))) {
    throw new Error("Not found or unauthorized");
  }

  return assignment;
}