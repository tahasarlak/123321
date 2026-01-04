// src/server/public/Handler/instructorCourses.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { editInstructorCourseSchema } from "@/lib/validations/instructorCourses";
import { faInstructorCoursesMessages } from "@/lib/validations/instructorCourses/messages";
import type { InstructorCourseResult } from "@/types/instructorCourses";

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

export async function handleGetInstructorCourses(userId: string): Promise<InstructorCourseResult> {
  const courses = await prisma.course.findMany({
    where: { instructorId: userId },
    select: {
      id: true,
      title: true,
      slug: true,
      image: true,
      enrolledCount: true,
      status: true,
    },
  });

  return { success: true, courses };
}

export async function handleEditInstructorCourse(data: unknown, userId: string): Promise<InstructorCourseResult> {
  const parsed = editInstructorCourseSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faInstructorCoursesMessages.server_error };

  const { id, ...updateData } = parsed.data;

  if (!(await isInstructorOrAdmin(userId, id))) return { success: false, error: faInstructorCoursesMessages.not_owner };

  const course = await prisma.course.update({
    where: { id },
    data: updateData as any,
  });

  return { success: true, course };
}