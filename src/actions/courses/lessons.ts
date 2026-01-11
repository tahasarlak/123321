// lib/actions/lesson.actions.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { Prisma, LessonType } from "@prisma/client";
import { notifyLessonCreated, notifyLessonUpdated } from "./notification.actions";

const PAGE_SIZE = 12;

// ── Helper: چک دسترسی ادمین یا مدرس/هم‌مدرس به دوره ─────────────
async function canAccessLesson(userId: string, courseId: string): Promise<boolean> {
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
const getCreateEditLessonSchema = (t: (key: string) => string) =>
  z.object({
    id: z.string().cuid().optional(),
    courseId: z.string().cuid({ message: t("invalid_course_id") }),
    sectionId: z.string().cuid().optional().nullable(),
    title: z.string().min(3, t("title_too_short")).max(200),
    type: z.enum(["VIDEO", "TEXT", "QUIZ", "DOWNLOAD", "LIVE", "ASSIGNMENT"] as const, {
      message: t("invalid_lesson_type"),
    }),
    content: z.string().optional(), // JSON string برای بلوک‌ها
    videoUrl: z.string().url({ message: t("invalid_url") }).optional().nullable(),
    externalLink: z.string().url().optional().nullable(),
    duration: z.coerce.number().int().min(0).max(14400).nullable().optional(), // حداکثر ۴ ساعت
    isFree: z.coerce.boolean().default(false),
    order: z.coerce.number().int().min(1),
    isPublished: z.coerce.boolean().default(true),
    attachmentIds: z.array(z.string().cuid()).optional(),
    quizId: z.string().cuid().optional().nullable(),
    assignmentId: z.string().cuid().optional().nullable(),
    honeypot: z.string().optional(),
  });

const getReorderSchema = (t: (key: string) => string) =>
  z.object({
    courseId: z.string().cuid(),
    lessonIds: z.array(z.string().cuid()).min(1),
    honeypot: z.string().optional(),
  });

// ── ۱. لیست درس‌ها برای مدرس/ادمین (بهینه + آمار مفید) ────────────
export async function fetchInstructorLessons({
  search = "",
  page = 1,
  courseId: courseFilter,
  sectionId,
  userId,
}: {
  search?: string;
  page?: number;
  courseId?: string;
  sectionId?: string;
  userId: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.id !== userId) {
    return { items: [], totalItems: 0, stats: {} };
  }

  const where: Prisma.LessonWhereInput = {
    deletedAt: null,
    course: courseFilter && courseFilter !== "all" ? { id: courseFilter } : {},
    section: sectionId ? { id: sectionId } : undefined,
  };

  if (search.trim()) {
    const term = search.trim();
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { course: { title: { contains: term, mode: "insensitive" } } },
    ];
  }

  // فقط درس‌های دوره‌هایی که دسترسی دارد
  if (!(await hasAdminAccess(userId))) {
    where.course = {
      ...where.course,
      OR: [
        { instructorId: userId },
        { coInstructors: { some: { id: userId } } },
      ],
    };
  }

  const [lessons, totalItems, [freeCount, videoCount, publishedCount]] = await Promise.all([
    prisma.lesson.findMany({
      where,
      include: {
        course: { select: { id: true, title: true, slug: true } },
        section: { select: { id: true, title: true } },
        attachments: { select: { id: true, title: true, fileUrl: true } },
        quiz: { select: { id: true, title: true } },
        assignment: { select: { id: true, title: true } },
      },
      orderBy: [
        { section: { order: "asc" } },
        { order: "asc" },
      ],
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.lesson.count({ where }),
    Promise.all([
      prisma.lesson.count({ where: { ...where, isFree: true } }),
      prisma.lesson.count({ where: { ...where, type: "VIDEO" } }),
      prisma.lesson.count({ where: { ...where, isPublished: true } }),
    ]),
  ]);

  const items = lessons.map(l => ({
    id: l.id,
    title: l.title,
    slug: l.slug,
    type: l.type,
    isFree: l.isFree,
    duration: l.duration,
    order: l.order,
    isPublished: l.isPublished,
    createdAt: l.createdAt.toISOString(),
    course: { id: l.course.id, title: l.course.title, slug: l.course.slug },
    section: l.section ? { id: l.section.id, title: l.section.title } : null,
    hasAttachment: !!l.attachments.length,
    hasQuiz: !!l.quiz,
    hasAssignment: !!l.assignment,
  }));

  return {
    items,
    totalItems,
    stats: {
      total: totalItems,
      free: freeCount,
      video: videoCount,
      published: publishedCount,
    },
  };
}

// ── ۲. ایجاد درس جدید (با transaction کامل) ───────────────────────
export async function createLessonAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("lessons");

  if (!session?.user?.id) return { success: false, error: t("please_login") };

  const userId = session.user.id as string;

  const raw = Object.fromEntries(formData);
  const schema = getCreateEditLessonSchema(key => t(key));
  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const data = parsed.data;

  if (data.honeypot?.length) return { success: true };

  if (!(await canAccessLesson(userId, data.courseId))) {
    return { success: false, error: t("unauthorized") };
  }

  // تولید slug یکتا در محدوده دوره
  let baseSlug = slugify(data.title);
  let slug = baseSlug;
  let counter = 1;
  while (
    await prisma.lesson.findUnique({
      where: { courseId_slug: { courseId: data.courseId, slug } },
    })
  ) {
    slug = `${baseSlug}-${counter++}`;
  }

  try {
    const lesson = await prisma.$transaction(async tx => {
      const newLesson = await tx.lesson.create({
        data: {
          courseId: data.courseId,
          sectionId: data.sectionId ?? null,
          title: data.title.trim(),
          slug,
          type: data.type as LessonType,
          content: data.content ? JSON.parse(data.content) : null,
          videoUrl: data.videoUrl ?? null,
          externalLink: data.externalLink ?? null,
          duration: data.duration ?? null,
          isFree: data.isFree,
          order: data.order,
          isPublished: data.isPublished,
          attachments: data.attachmentIds?.length
            ? { connect: data.attachmentIds.map(id => ({ id })) }
            : undefined,
          quiz: data.quizId ? { connect: { id: data.quizId } } : undefined,
          assignment: data.assignmentId ? { connect: { id: data.assignmentId } } : undefined,
        },
        include: {
          course: { select: { id: true, title: true, slug: true } },
          section: true,
        },
      });

      // اگر درس منتشر شد → نوتیفیکیشن به دانشجویان ثبت‌نام‌شده (اختیاری)
      if (data.isPublished) {
        // می‌توانید notifyNewLesson بسازید و اینجا فراخوانی کنید
      }

      return newLesson;
    });

    revalidatePath("/dashboard/instructor/lessons");
    revalidatePath(`/dashboard/courses/${lesson.course.slug}/lessons`);
    revalidatePath(`/courses/${lesson.course.slug}`);

    return {
      success: true,
      message: t("lesson_created"),
      lesson,
    };
  } catch (err) {
    console.error("Error creating lesson:", err);
    return { success: false, error: t("server_error") };
  }
}

// ── ۳. ویرایش درس ──────────────────────────────────────────────────
export async function editLessonAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("lessons");

  if (!session?.user?.id) return { success: false, error: t("please_login") };

  const userId = session.user.id as string;

  const raw = Object.fromEntries(formData);
  const schema = getCreateEditLessonSchema(key => t(key));
  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { id, courseId, sectionId, title, type, content, videoUrl, ...updateData } = parsed.data;

  if (!id) return { success: false, error: t("lesson_id_required") };

  const existing = await prisma.lesson.findUnique({
    where: { id },
    select: { courseId: true, slug: true },
  });

  if (!existing || !(await canAccessLesson(userId, existing.courseId))) {
    return { success: false, error: t("unauthorized") };
  }

  // اگر دوره تغییر کرده، دسترسی به دوره جدید چک شود
  if (courseId && courseId !== existing.courseId) {
    if (!(await canAccessLesson(userId, courseId))) {
      return { success: false, error: t("unauthorized_new_course") };
    }
  }

  let newSlug: string | undefined;
  if (title) {
    let baseSlug = slugify(title);
    let slug = baseSlug;
    let counter = 1;
    while (
      await prisma.lesson.findUnique({
        where: { courseId_slug: { courseId: courseId || existing.courseId, slug } },
      }) &&
      slug !== existing.slug
    ) {
      slug = `${baseSlug}-${counter++}`;
    }
    newSlug = slug;
  }

  try {
    const updatedLesson = await prisma.$transaction(async tx => {
      const lesson = await tx.lesson.update({
        where: { id },
        data: {
          ...updateData,
          courseId: courseId ?? undefined,
          sectionId: sectionId ?? null,
          ...(newSlug && { slug: newSlug }),
          content: content ? JSON.parse(content) : undefined,
          videoUrl: videoUrl ?? null,
          attachments: updateData.attachmentIds !== undefined
            ? { set: updateData.attachmentIds.map(id => ({ id })) }
            : undefined,
          quiz: updateData.quizId !== undefined
            ? updateData.quizId ? { connect: { id: updateData.quizId } } : { disconnect: true }
            : undefined,
          assignment: updateData.assignmentId !== undefined
            ? updateData.assignmentId ? { connect: { id: updateData.assignmentId } } : { disconnect: true }
            : undefined,
        },
        include: {
          course: { select: { id: true, slug: true } },
        },
      });

      return lesson;
    });

    revalidatePath("/dashboard/instructor/lessons");
    revalidatePath(`/dashboard/courses/${updatedLesson.course.slug}/lessons`);
    revalidatePath(`/courses/${updatedLesson.course.slug}`);

    return {
      success: true,
      message: t("lesson_updated"),
      lesson: updatedLesson,
    };
  } catch (err) {
    console.error("Error editing lesson:", err);
    return { success: false, error: t("server_error") };
  }
}

// ── ۴. حذف درس (soft-delete) ────────────────────────────────────────
export async function deleteLessonAction(id: string) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("lessons");

  if (!session?.user?.id) return { success: false, error: t("please_login") };

  const userId = session.user.id as string;

  const lesson = await prisma.lesson.findUnique({
    where: { id },
    select: {
      courseId: true,
      course: { select: { slug: true } },
    },
  });

  if (!lesson || !(await canAccessLesson(userId, lesson.courseId))) {
    return { success: false, error: t("unauthorized") };
  }

  await prisma.lesson.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/dashboard/instructor/lessons");
  revalidatePath(`/courses/${lesson.course.slug}`);

  return { success: true, message: t("lesson_deleted") };
}

// ── ۵. تغییر ترتیب درس‌ها (Reorder) ────────────────────────────────
export async function reorderLessonsAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("lessons");

  if (!session?.user?.id) return { success: false, error: t("please_login") };

  const userId = session.user.id as string;

  const raw = Object.fromEntries(formData);
  const schema = getReorderSchema(key => t(key));
  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { courseId, lessonIds, honeypot } = parsed.data;

  if (honeypot?.length) return { success: true };

  if (!(await canAccessLesson(userId, courseId))) {
    return { success: false, error: t("unauthorized") };
  }

  try {
    await prisma.$transaction(
      lessonIds.map((id, index) =>
        prisma.lesson.update({
          where: { id },
          data: { order: index + 1 },
        })
      )
    );

    revalidatePath("/dashboard/instructor/lessons");
    revalidatePath(`/courses/${courseId}`);

    return {
      success: true,
      message: t("lessons_reordered"),
    };
  } catch (err) {
    console.error("Error reordering lessons:", err);
    return { success: false, error: t("server_error") };
  }
}

// ── ۶. دریافت درس برای ویرایش توسط مدرس ────────────────────────────
export async function getLessonByIdForInstructor(id: string, userId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, title: true, slug: true } },
      section: { select: { id: true, title: true } },
      attachments: { select: { id: true, title: true, fileUrl: true, fileType: true } },
      quiz: { select: { id: true, title: true } },
      assignment: { select: { id: true, title: true } },
    },
  });

  if (!lesson || !(await canAccessLesson(userId, lesson.courseId))) {
    throw new Error("درس یافت نشد یا دسترسی غیرمجاز است");
  }

  return {
    ...lesson,
    content: lesson.content ? JSON.stringify(lesson.content, null, 2) : "",
  };
}