// src/server/public/Handler/instructorSessions.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { getSocket } from "@/server/public/Socket/socket";
import { createSessionSchema, editSessionSchema } from "@/lib/validations/instructorSessions";
import { faInstructorSessionsMessages } from "@/lib/validations/instructorSessions/messages";
import type { SessionResult } from "@/types/instructorSessions";

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

export async function handleCreateSession(data: unknown, userId: string): Promise<SessionResult> {
  const parsed = createSessionSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faInstructorSessionsMessages.server_error };

  const { courseId, title, type, startTime, endTime, meetLink, recordingLink, honeypot } = parsed.data;
  if (honeypot && honeypot.length > 0) return { success: true };

  if (!(await isInstructorOrAdmin(userId, courseId))) return { success: false, error: faInstructorSessionsMessages.not_owner };

  const session = await prisma.classSession.create({
    data: {
      courseId,
      title,
      type,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      meetLink,
      recordingLink,
    },
  });

  const io = getSocket();
  io?.to(`course_${courseId}`).emit("new_session", session);

  return { success: true, message: "جلسه ایجاد شد", session };
}

export async function handleEditSession(data: unknown, userId: string): Promise<SessionResult> {
  const parsed = editSessionSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faInstructorSessionsMessages.server_error };

  const { id, courseId, ...updateData } = parsed.data;

  if (!(await isInstructorOrAdmin(userId, courseId!))) return { success: false, error: faInstructorSessionsMessages.not_owner };

  const session = await prisma.classSession.update({
    where: { id },
    data: updateData as any,
  });

  const io = getSocket();
  io?.to(`course_${courseId}`).emit("session_updated", session);

  return { success: true, message: "جلسه ویرایش شد", session };
}

export async function handleDeleteSession(sessionId: string, userId: string): Promise<SessionResult> {
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    select: { courseId: true },
  });

  if (!session || !(await isInstructorOrAdmin(userId, session.courseId))) return { success: false, error: faInstructorSessionsMessages.not_owner };

  await prisma.classSession.delete({ where: { id: sessionId } });

  const io = getSocket();
  io?.to(`course_${session.courseId}`).emit("session_deleted", { sessionId });

  return { success: true, message: "جلسه حذف شد" };
}