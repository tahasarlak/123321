// src/validations/courses/index.ts
import { z } from "zod";
import { faCoursesMessages } from "./messages";

const courseTypes = ["RECORDED", "LIVE", "HYBRID"] as const;
const courseStatuses = ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "ARCHIVED", "REJECTED"] as const;

export const createCourseSchema = z.object({
  title: z.string().min(1, faCoursesMessages.title_required),
  instructorId: z.string().min(1, faCoursesMessages.instructor_required),
  type: z.enum(courseTypes, { message: faCoursesMessages.type_required }),
  status: z.enum(courseStatuses).default("DRAFT"),
  description: z.string().optional(),
  duration: z.string().optional(),
  units: z.number().int().min(0).default(0),
  capacity: z.number().int().optional(),
  price: z.object({}).passthrough(),
  discountPercent: z.number().int().min(0).max(100).optional(),
  maxDiscountAmount: z.object({}).passthrough().optional(),
  categoryIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  termId: z.string().optional(),
  image: z.string().optional(),
  videoPreview: z.string().optional(),
  honeypot: z.string().optional(),
});

export const editCourseSchema = createCourseSchema.partial().extend({
  id: z.string().min(1),
  slug: z.string().optional(), // اگر title تغییر کرد، slug جدید تولید می‌شه
});