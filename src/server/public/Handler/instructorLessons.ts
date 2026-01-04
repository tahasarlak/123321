// src/server/public/Handler/instructorLessons.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { getSocket } from "@/server/public/Socket/socket";
import { createLessonSchema, reorderLessonsSchema } from "@/lib/validations/instructorLessons";
import { faInstructorLessonsMessages } from "@/lib/validations/instructorLessons/messages";
import type { LessonResult } from "@/types/instructorLessons";

async function isInstructorOrAdmin(userId: string, courseId?: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { role: true } } },
  });
  if (user?.roles.some(r => ["ADMIN", "SUPERADMIN"].includes(r.role))) return true;
  if (!courseId) return false;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true },
  });
  return course?.instructorId === userId;
}

export async function handleCreateLesson(data: unknown, userId: string): Promise<LessonResult> {
  const parsed = createLessonSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faInstructorLessonsMessages.server_error };

  const { courseId, sectionId, title, type, content, videoUrl, duration, isFree, order, honeypot } = parsed.data;
  if (honeypot && honeypot.length > 0) return { success: true };

  if (!(await isInstructorOrAdmin(userId, courseId))) return { success: false, error: faInstructorLessonsMessages.not_owner };

  const baseSlug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  let slug = baseSlug;
  let counter = 1;
  // استفاده از نام composite درست (courseId_slug)
  while (await prisma.lesson.findUnique({ where: { courseId_slug: { courseId, slug } } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  const lesson = await prisma.lesson.create({
    data: {
      courseId,
      sectionId,
      title,
      slug,
      type,
      content,
      videoUrl,
      duration,
      isFree,
      order,
    },
  });

  const io = getSocket();
  io?.to(`course_${courseId}`).emit("new_lesson", lesson);

  return { success: true, message: "درس ایجاد شد", lesson };
}

export async function handleReorderLessons(data: unknown, userId: string): Promise<LessonResult> {
  const parsed = reorderLessonsSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faInstructorLessonsMessages.server_error };

  const { courseId, lessonIds, honeypot } = parsed.data;
  if (honeypot && honeypot.length > 0) return { success: true };

  if (!(await isInstructorOrAdmin(userId, courseId))) return { success: false, error: faInstructorLessonsMessages.not_owner };

  await prisma.$transaction(
    lessonIds.map((id, index) =>
      prisma.lesson.update({
        where: { id },
        data: { order: index + 1 },
      })
    )
  );

  const io = getSocket();
  io?.to(`course_${courseId}`).emit("lessons_reordered");

  return { success: true, message: "ترتیب درس‌ها تغییر کرد" };
}