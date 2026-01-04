// src/validations/instructorSessions/index.ts
import { z } from "zod";
import { faInstructorSessionsMessages } from "./messages";

export const createSessionSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(["LIVE_CLASS", "RECORDED_CLASS", "WORKSHOP", "EXAM", "OFFICE_HOUR", "Q_A"]),
  startTime: z.string(),
  endTime: z.string(),
  meetLink: z.string().optional(),
  recordingLink: z.string().optional(),
  honeypot: z.string().optional(),
});

export const editSessionSchema = createSessionSchema.partial().extend({
  id: z.string().min(1),
});