// src/validations/instructorNotifications/index.ts
import { z } from "zod";
import { faInstructorNotificationsMessages } from "./messages";

export const sendNotificationSchema = z.object({
  courseId: z.string().optional(),
  groupId: z.string().optional(),
  userIds: z.array(z.string()).optional(),
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.string().default("info"),
  link: z.string().optional(),
  honeypot: z.string().optional(),
}).refine((data) => data.courseId || data.groupId || (data.userIds && data.userIds.length > 0), {
  message: faInstructorNotificationsMessages.target_required,
});