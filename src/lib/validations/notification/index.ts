// src/validations/notification/index.ts
import { z } from "zod";
import { faNotificationMessages } from "./messages";

const notificationTypes = ["success", "info", "warning", "error", "order", "payment", "review", "message", "system"] as const;

export const createNotificationSchema = z.object({
  userId: z.string().min(1),
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.enum(notificationTypes).default("info"),
  link: z.string().optional(),
});

export const markAsReadSchema = z.object({
  notificationIds: z.array(z.string()).min(1, faNotificationMessages.ids_required),
  honeypot: z.string().optional(),
});