// src/server/public/Handler/instructorNotifications.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { getSocket } from "@/server/public/Socket/socket";
import { sendNotificationSchema } from "@/lib/validations/instructorNotifications";
import { faInstructorNotificationsMessages } from "@/lib/validations/instructorNotifications/messages";
import type { NotificationSendResult } from "@/types/instructorNotifications";

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

export async function handleSendNotification(data: unknown, userId: string): Promise<NotificationSendResult> {
  const parsed = sendNotificationSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faInstructorNotificationsMessages.server_error };

  const { courseId, groupId, userIds, title, message, type, link, honeypot } = parsed.data;
  if (honeypot && honeypot.length > 0) return { success: true, count: 0 };

  let targetUserIds: string[] = [];

  if (userIds?.length) {
    targetUserIds = userIds;
  } else if (groupId) {
    const members = await prisma.courseGroupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });
    targetUserIds = members.map(m => m.userId);
  } else if (courseId) {
    if (!(await isInstructorOrAdmin(userId, courseId))) return { success: false, error: faInstructorNotificationsMessages.not_owner };
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId, status: "APPROVED" },
      select: { userId: true },
    });
    targetUserIds = enrollments.map(e => e.userId);
  } else {
    return { success: false, error: faInstructorNotificationsMessages.target_required };
  }

  const notifications = await prisma.notification.createMany({
    data: targetUserIds.map(uId => ({
      userId: uId,
      title,
      message,
      type,
      link,
    })),
  });

  const io = getSocket();
  targetUserIds.forEach(uId => io?.to(`user_${uId}`).emit("new_notification", { title, message, type, link }));

  return { success: true, count: notifications.count, message: `نوتیفیکیشن به ${notifications.count} دانشجو ارسال شد` };
}