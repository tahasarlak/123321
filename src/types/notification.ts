// src/types/notification.ts
export type NotificationType = "success" | "info" | "warning" | "error" | "order" | "payment" | "review" | "message" | "system";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string | null;
  isRead: boolean;
  readAt?: Date | null;
  createdAt: Date;
};

export type NotificationListResponse = {
  notifications: NotificationItem[];
  total: number;
  unreadCount: number;
};

export type NotificationResult =
  | { success: true; message?: string; notification?: NotificationItem }
  | { success: false; error: string };