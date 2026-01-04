// src/validations/instructorLessons/index.ts
import { z } from "zod";
import { faInstructorLessonsMessages } from "./messages";

export const createLessonSchema = z.object({
  courseId: z.string().min(1),
  sectionId: z.string().optional(),
  title: z.string().min(1),
  type: z.enum(["VIDEO", "TEXT", "QUIZ", "DOWNLOAD", "LIVE"]),
  content: z.string().optional(),
  videoUrl: z.string().optional(),
  duration: z.number().optional(),
  isFree: z.boolean().default(false),
  order: z.number().int(),
  honeypot: z.string().optional(),
});

export const reorderLessonsSchema = z.object({
  courseId: z.string().min(1),
  lessonIds: z.array(z.string()),
  honeypot: z.string().optional(),
});