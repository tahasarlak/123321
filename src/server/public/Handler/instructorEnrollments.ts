// src/server/public/Handler/instructorEnrollments.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { getSocket } from "@/server/public/Socket/socket";
import { changeEnrollmentStatusSchema } from "@/lib/validations/instructorEnrollments";
import { faInstructorEnrollmentsMessages } from "@/lib/validations/instructorEnrollments/messages";
import type { EnrollmentResult } from "@/types/instructorEnrollments";

async function isInstructorOrAdmin(userId: string, courseId: string): Promise<boolean> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true },
  });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { role: true } } },
  });
  const isAdmin = user?.roles.some(r => ["ADMIN", "SUPERADMIN"].includes(r.role));
  return isAdmin || course?.instructorId === userId;
}

export async function handleChangeEnrollmentStatus(data: unknown, userId: string): Promise<EnrollmentResult> {
  const parsed = changeEnrollmentStatusSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faInstructorEnrollmentsMessages.server_error };

  const { enrollmentId, action, honeypot } = parsed.data;
  if (honeypot && honeypot.length > 0) return { success: true };

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { course: true },
  });

  if (!enrollment || !(await isInstructorOrAdmin(userId, enrollment.courseId))) return { success: false, error: faInstructorEnrollmentsMessages.not_owner };

  const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { status: newStatus, approvedAt: newStatus === "APPROVED" ? new Date() : undefined },
  });

  await prisma.notification.create({
    data: {
      userId: enrollment.userId,
      title: "وضعیت ثبت‌نام تغییر کرد",
      message: `ثبت‌نام شما در دوره ${enrollment.course.title} ${newStatus === "APPROVED" ? "تأیید" : "رد"} شد.`,
      type: "enrollment",
      link: `/courses/${enrollment.course.slug}`,
    },
  });

  const io = getSocket();
  io?.to(`user_${enrollment.userId}`).emit("enrollment_updated", { enrollmentId, newStatus });

  return { success: true, message: "وضعیت ثبت‌نام تغییر کرد" };
}

export async function handleGetEnrollments(courseId: string, userId: string): Promise<EnrollmentResult> {
  if (!(await isInstructorOrAdmin(userId, courseId))) return { success: false, error: "دسترسی ممنوع" };

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { enrolledAt: "desc" },
  });

  return { success: true, enrollments };
}