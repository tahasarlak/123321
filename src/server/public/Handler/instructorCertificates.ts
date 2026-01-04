// src/server/public/Handler/instructorCertificates.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { getSocket } from "@/server/public/Socket/socket";
import { issueCertificateSchema, autoCertificateSchema } from "@/lib/validations/instructorCertificates";
import { faInstructorCertificatesMessages } from "@/lib/validations/instructorCertificates/messages";
import type { CertificateResult } from "@/types/instructorCertificates";

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

// صدور دستی
export async function handleIssueCertificateManual(data: unknown, userId: string): Promise<CertificateResult> {
  const parsed = issueCertificateSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faInstructorCertificatesMessages.server_error };

  const { enrollmentId, score, grade, honeypot } = parsed.data;
  if (honeypot && honeypot.length > 0) return { success: true };

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { course: { select: { id: true, title: true } } },
  });

  if (!enrollment || !(await isInstructorOrAdmin(userId, enrollment.courseId))) return { success: false, error: faInstructorCertificatesMessages.not_owner };

  const existing = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId: enrollment.userId, courseId: enrollment.courseId } },
  });

  if (existing) return { success: false, error: faInstructorCertificatesMessages.already_issued };

  const certificate = await prisma.certificate.create({
    data: {
      userId: enrollment.userId,
      courseId: enrollment.courseId,
      score,
      grade,
    },
    include: {
      user: { select: { id: true, name: true } },
      course: { select: { id: true, title: true } },
    },
  });

  await prisma.notification.create({
    data: {
      userId: enrollment.userId,
      title: "گواهی دوره صادر شد",
      message: `گواهی دوره ${enrollment.course.title} برای شما صادر شد.`,
      type: "certificate",
      link: `/certificates/${certificate.id}`,
    },
  });

  const io = getSocket();
  io?.to(`user_${enrollment.userId}`).emit("new_certificate", certificate);

  return { success: true, message: "گواهی دستی صادر شد", certificate };
}

// صدور خودکار (بعد تکمیل همه درس‌ها)
export async function handleIssueCertificateAuto(data: unknown, userId: string): Promise<CertificateResult> {
  const parsed = autoCertificateSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faInstructorCertificatesMessages.server_error };

  const { courseId, userId: studentId, honeypot } = parsed.data;
  if (honeypot && honeypot.length > 0) return { success: true };

  if (!(await isInstructorOrAdmin(userId, courseId))) return { success: false, error: faInstructorCertificatesMessages.not_owner };

  const lessonsCount = await prisma.lesson.count({ where: { courseId } });
  const completedCount = await prisma.lessonCompletion.count({ where: { lesson: { courseId }, userId: studentId } });

  if (completedCount < lessonsCount) return { success: false, error: faInstructorCertificatesMessages.not_completed };

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: studentId, courseId } },
    include: { course: { select: { id: true, title: true } } },
  });

  if (!enrollment) return { success: false, error: "ثبت‌نام یافت نشد" };

  const existing = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId: studentId, courseId } },
  });

  if (existing) return { success: false, error: faInstructorCertificatesMessages.already_issued };

  const certificate = await prisma.certificate.create({
    data: {
      userId: studentId,
      courseId,
      // score/grade خودکار اگر نیاز (مثلاً میانگین نمرات)
    },
    include: {
      user: { select: { id: true, name: true } },
      course: { select: { id: true, title: true } },
    },
  });

  await prisma.notification.create({
    data: {
      userId: studentId,
      title: "گواهی دوره صادر شد",
      message: `تبریک! شما دوره را کامل کردید و گواهی صادر شد.`,
      type: "certificate",
      link: `/certificates/${certificate.id}`,
    },
  });

  const io = getSocket();
  io?.to(`user_${studentId}`).emit("new_certificate", certificate);

  return { success: true, message: "گواهی خودکار صادر شد", certificate };
}

// لیست گواهی‌های دوره (برای استاد)
export async function handleGetCertificates(courseId: string, userId: string): Promise<CertificateResult> {
  if (!(await isInstructorOrAdmin(userId, courseId))) return { success: false, error: faInstructorCertificatesMessages.unauthorized };

  const certificates = await prisma.certificate.findMany({
    where: { courseId },
    include: {
      user: { select: { id: true, name: true } },
      course: { select: { id: true, title: true } },
    },
  });

  return { success: true, certificates };
}