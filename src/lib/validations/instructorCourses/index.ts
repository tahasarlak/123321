// src/validations/instructorCourses/index.ts
import { z } from "zod";
import { faInstructorCoursesMessages } from "./messages";

export const editInstructorCourseSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  price: z.object({}).passthrough().optional(),
  discountPercent: z.number().optional(),
  image: z.string().optional(),
  videoPreview: z.string().optional(),
  honeypot: z.string().optional(),
});