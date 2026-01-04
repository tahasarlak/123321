// src/validations/instructorFiles/index.ts
import { z } from "zod";

export const uploadFileSchema = z.object({
  courseId: z.string().min(1),
  sectionId: z.string().optional(),
  groupId: z.string().optional(),
  title: z.string().min(1),
  file: z.instanceof(File),
  honeypot: z.string().optional(),
});