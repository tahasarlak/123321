// src/types/instructorNotifications.ts
export type NotificationSendResult =
  | { success: true; count: number; message?: string }
  | { success: false; error: string };