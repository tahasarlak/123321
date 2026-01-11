// lib/actions/session.actions.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { Prisma, SessionType } from "@prisma/client";
import { notifySessionEvent } from "./notification.actions";

const PAGE_SIZE = 12;

// ── Helper: چک دسترسی ادمین یا مدرس/هم‌مدرس به دوره ─────────────
async function canAccessSession(userId: string, courseId: string): Promise<boolean> {
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

// ── اسکیماها (کامل و ترجمه‌پذیر) ────────────────────────────────
const getCreateEditSchema = (t: (key: string) => string) =>
  z
    .object({
      id: z.string().cuid().optional(),
      courseId: z.string().cuid({ message: t("invalid_course_id") }),
      groupId: z.string().cuid().optional().nullable(),
      title: z.string().min(3, t("title_too_short")).max(150),
      type: z.enum(
        ["LIVE_CLASS", "RECORDED_CLASS", "WORKSHOP", "EXAM", "OFFICE_HOUR", "Q_A"] as const,
        { message: t("invalid_session_type") }
      ),
      startTime: z.string().datetime({ message: t("invalid_datetime") }),
      endTime: z.string().datetime({ message: t("invalid_datetime") }),
      meetLink: z.string().url().optional().nullable().or(z.literal("")),
      recordingLink: z.string().url().optional().nullable().or(z.literal("")),
      isRecorded: z.coerce.boolean().default(false),
      jitsiRoomName: z.string().optional(),
      roomStatus: z.enum(["PENDING", "ACTIVE", "ENDED", "CANCELLED"]).optional(),
      honeypot: z.string().optional(),
    })
    .refine(data => new Date(data.startTime) < new Date(data.endTime), {
      message: t("end_time_before_start"),
      path: ["endTime"],
    });

// ── ۱. لیست جلسات برای مدرس/ادمین (با آمار مفید) ──────────────────
export async function fetchInstructorSessions({
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
    return { items: [], totalItems: 0, stats: {} };
  }

  const where: Prisma.ClassSessionWhereInput = {
    deletedAt: null,
    course: courseFilter && courseFilter !== "all" ? { id: courseFilter } : {},
  };

  if (search.trim()) {
    const term = search.trim();
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { course: { title: { contains: term, mode: "insensitive" } } },
    ];
  }

  // فقط جلسات دوره‌هایی که دسترسی دارد
  if (!(await hasAdminAccess(userId))) {
    where.course = {
      ...where.course,
      OR: [
        { instructorId: userId },
        { coInstructors: { some: { id: userId } } },
      ],
    };
  }

  const now = new Date();

  const [sessions, totalItems, [upcoming, live, past, recorded]] = await Promise.all([
    prisma.classSession.findMany({
      where,
      include: {
        course: { select: { id: true, title: true, slug: true } },
        group: { select: { id: true, title: true, color: true } },
      },
      orderBy: { startTime: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.classSession.count({ where }),
    Promise.all([
      prisma.classSession.count({ where: { ...where, startTime: { gt: now } } }),
      prisma.classSession.count({
        where: { ...where, startTime: { lte: now }, endTime: { gte: now } },
      }),
      prisma.classSession.count({ where: { ...where, endTime: { lt: now } } }),
      prisma.classSession.count({ where: { ...where, isRecorded: true } }),
    ]),
  ]);

  const items = sessions.map(s => {
    const isInternal = !s.meetLink || s.meetLink.trim() === "";
    return {
      id: s.id,
      title: s.title,
      type: s.type,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
      meetLink: s.meetLink || null,
      recordingLink: s.recordingLink || null,
      jitsiRoomName: s.jitsiRoomName || null,
      isInternal,
      isUpcoming: s.startTime > now,
      isLive: s.startTime <= now && s.endTime >= now,
      isPast: s.endTime < now,
      isRecorded: s.isRecorded,
      roomStatus: s.roomStatus,
      course: s.course,
      group: s.group ? { id: s.group.id, title: s.group.title, color: s.group.color } : null,
    };
  });

  return {
    items,
    totalItems,
    stats: {
      total: totalItems,
      upcoming,
      live,
      past,
      recorded,
    },
  };
}

// ── ۲. ایجاد جلسه جدید ─────────────────────────────────────────────
export async function createSessionAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("sessions");

  if (!session?.user?.id) return { success: false, error: t("please_login") };

  const userId = session.user.id as string;

  const raw = Object.fromEntries(formData);
  const schema = getCreateEditSchema(key => t(key));
  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const data = parsed.data;

  if (data.honeypot?.length) return { success: true };

  if (!(await canAccessSession(userId, data.courseId))) {
    return { success: false, error: t("unauthorized") };
  }

  const start = new Date(data.startTime);
  const end = new Date(data.endTime);

  if (start >= end) {
    return { success: false, error: t("end_time_before_start") };
  }

  const course = await prisma.course.findUnique({
    where: { id: data.courseId },
    select: { slug: true },
  });

  const isInternal = !data.meetLink || data.meetLink.trim() === "";

  const jitsiRoomName = isInternal
    ? `${course?.slug || "course"}-${slugify(data.title)}-${Date.now().toString(36)}`
    : null;

  try {
    const newSession = await prisma.$transaction(async tx => {
      const sessionCreated = await tx.classSession.create({
        data: {
          courseId: data.courseId,
          groupId: data.groupId ?? null,
          title: data.title.trim(),
          type: data.type as SessionType,
          startTime: start,
          endTime: end,
          meetLink: data.meetLink?.trim() || null,
          recordingLink: data.recordingLink?.trim() || null,
          isRecorded: data.isRecorded ?? !!data.recordingLink,
          jitsiRoomName,
          roomStatus: isInternal ? "PENDING" : null,
        },
        include: {
          course: { select: { title: true, slug: true } },
          group: true,
        },
      });

      // نوتیفیکیشن به دانشجویان گروه یا دوره (اختیاری)
      // await notifySessionEvent(...)

      return sessionCreated;
    });

    revalidatePath("/dashboard/instructor/sessions");
    revalidatePath(`/dashboard/courses/${course?.slug}/sessions`);

    return {
      success: true,
      message: t("session_created"),
      session: newSession,
    };
  } catch (err) {
    console.error("Error creating session:", err);
    return { success: false, error: t("server_error") };
  }
}

// ── ۳. ویرایش جلسه ──────────────────────────────────────────────────
export async function editSessionAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("sessions");

  if (!session?.user?.id) return { success: false, error: t("please_login") };

  const userId = session.user.id as string;

  const raw = Object.fromEntries(formData);
  const schema = getCreateEditSchema(key => t(key));
  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { id, courseId, groupId, title, type, startTime, endTime, meetLink, recordingLink } = parsed.data;

  if (!id) return { success: false, error: t("session_id_required") };

  const existing = await prisma.classSession.findUnique({
    where: { id },
    select: { courseId: true },
  });

  if (!existing || !(await canAccessSession(userId, existing.courseId))) {
    return { success: false, error: t("unauthorized") };
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (start >= end) {
    return { success: false, error: t("end_time_before_start") };
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId ?? existing.courseId },
    select: { slug: true },
  });

  const isInternal = !meetLink || meetLink.trim() === "";

  const jitsiRoomName = isInternal
    ? `${course?.slug || "course"}-${slugify(title)}-${Date.now().toString(36)}`
    : null;

  try {
    const updated = await prisma.$transaction(async tx => {
      const sessionUpdated = await tx.classSession.update({
        where: { id },
        data: {
          title: title.trim(),
          type: type as SessionType,
          startTime: start,
          endTime: end,
          meetLink: meetLink?.trim() || null,
          recordingLink: recordingLink?.trim() || null,
          isRecorded: !!recordingLink,
          groupId: groupId ?? null,
          jitsiRoomName,
          roomStatus: isInternal ? "PENDING" : null,
        },
        include: {
          course: { select: { title: true, slug: true } },
          group: true,
        },
      });

      return sessionUpdated;
    });

    revalidatePath("/dashboard/instructor/sessions");
    revalidatePath(`/dashboard/courses/${course?.slug}/sessions`);

    return {
      success: true,
      message: t("session_updated"),
      session: updated,
    };
  } catch (err) {
    console.error("Error editing session:", err);
    return { success: false, error: t("server_error") };
  }
}

// ── ۴. حذف جلسه (soft-delete) ───────────────────────────────────────
export async function deleteSessionAction(id: string) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("sessions");

  if (!session?.user?.id) return { success: false, error: t("please_login") };

  const userId = session.user.id as string;

  const existing = await prisma.classSession.findUnique({
    where: { id },
    select: {
      courseId: true,
      course: { select: { slug: true } },
    },
  });

  if (!existing || !(await canAccessSession(userId, existing.courseId))) {
    return { success: false, error: t("unauthorized") };
  }

  await prisma.classSession.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/dashboard/instructor/sessions");

  return { success: true, message: t("session_deleted") };
}

// ── ۵. دریافت جلسه برای ویرایش توسط مدرس ───────────────────────────
export async function getSessionByIdForInstructor(id: string, userId: string) {
  const sessionData = await prisma.classSession.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, title: true, slug: true } },
      group: { select: { id: true, title: true } },
    },
  });

  if (!sessionData || !(await canAccessSession(userId, sessionData.courseId))) {
    throw new Error("جلسه یافت نشد یا دسترسی غیرمجاز است");
  }

  return {
    ...sessionData,
    startTime: sessionData.startTime.toISOString().slice(0, 16),
    endTime: sessionData.endTime.toISOString().slice(0, 16),
  };
}