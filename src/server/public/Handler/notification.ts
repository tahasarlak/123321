// src/server/public/Handler/notification.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { getSocket } from "@/server/public/Socket/socket";
import { createNotificationSchema, markAsReadSchema } from "@/lib/validations/notification";
import { faNotificationMessages } from "@/lib/validations/notification/messages";
import type { NotificationItem, NotificationResult, NotificationListResponse, NotificationType } from "@/types/notification";

export async function handleCreateNotification(data: unknown): Promise<NotificationResult> {
  const parsed = createNotificationSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faNotificationMessages.server_error };

  const { userId, title, message, type, link } = parsed.data;

  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type: type as string, 
      link,
    },
  });

  const io = getSocket();
  io?.to(userId).emit("new_notification", { ...notification, type });

  return { success: true, notification: { ...notification, type } as NotificationItem };
}

export async function handleMarkAsRead(data: unknown, userId: string): Promise<NotificationResult> {
  const parsed = markAsReadSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faNotificationMessages.server_error };

  const { notificationIds, honeypot } = parsed.data;
  if (honeypot && honeypot.length > 0) return { success: true };

  await prisma.notification.updateMany({
    where: { id: { in: notificationIds }, userId },
    data: { isRead: true, readAt: new Date() },
  });

  const io = getSocket();
  io?.to(userId).emit("notification_updated");

  return { success: true, message: "خوانده شد" };
}

export async function handleMarkAllAsRead(userId: string): Promise<NotificationResult> {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

  const io = getSocket();
  io?.to(userId).emit("notification_updated");

  return { success: true, message: "همه خوانده شدند" };
}

export async function handleGetUserNotifications(userId: string): Promise<NotificationListResponse> {
  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  const formatted = notifications.map(n => ({
    ...n,
    type: n.type as NotificationType,
  }));

  return { notifications: formatted, total, unreadCount };
}

export async function handleGetAdminNotifications(): Promise<NotificationListResponse> {
  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.notification.count(),
    prisma.notification.count({ where: { isRead: false } }),
  ]);

  const formatted = notifications.map(n => ({
    ...n,
    type: n.type as NotificationType,
  }));

  return { notifications: formatted, total, unreadCount };
}