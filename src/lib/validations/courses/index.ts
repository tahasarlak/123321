// src/validations/courses/index.ts
import { z } from "zod";

const courseTypes = ["RECORDED", "LIVE", "HYBRID"] as const;
const courseStatuses = ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "ARCHIVED", "REJECTED"] as const;
const courseLanguages = ["FA", "EN", "AR", "RU"] as const;
const courseLevels = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;

export const getCreateCourseSchema = (t: (key: string) => string) => {
  return z.object({
    title: z.string().min(1, t("title_required")),
    code: z.string().optional(),
    description: z.string().optional(),
    shortDescription: z.string().optional(),
    prerequisites: z.array(z.string()).optional(),
    whatYouWillLearn: z.array(z.string()).optional(),

    // جدید
    language: z.enum(courseLanguages, { message: t("language_required") || "زبان دوره الزامی است" }).default("FA"),
    level: z.enum(courseLevels, { message: t("level_required") || "سطح دوره الزامی است" }).default("BEGINNER"),

    duration: z.string().optional(),
    units: z.number().int().min(0).default(3),
    capacity: z.number().int().optional(),

    type: z.enum(courseTypes, { message: t("type_required") }),
    status: z.enum(courseStatuses).default("DRAFT"),

    termId: z.string().optional(),

    // مدرسین
    instructorId: z.string().min(1, t("instructor_required")), // مدرس اصلی
    coInstructorIds: z.array(z.string()).optional(), // co-instructors

    // رسانه
    image: z.string().optional(),
    videoPreview: z.string().optional(),
    gallery: z.array(z.string()).optional(),

    // فروش و نمایش
    isSaleEnabled: z.boolean().default(true),
    isVisible: z.boolean().default(true),
    featured: z.boolean().default(false),
    countries: z.array(z.string()).optional(),

    // روابط
    categoryIds: z.array(z.string()).optional(),
    tagIds: z.array(z.string()).optional(),

    honeypot: z.string().optional(),
  });
};

export const getEditCourseSchema = (t: (key: string) => string) => {
  return getCreateCourseSchema(t).partial().extend({
    id: z.string().min(1),
    slug: z.string().optional(),
    // coInstructorIds رو هم در ویرایش اجازه می‌دیم تغییر کنه
    coInstructorIds: z.array(z.string()).optional(),
  });
};