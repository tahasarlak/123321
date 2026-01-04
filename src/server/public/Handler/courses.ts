// src/server/public/Handler/courses.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { createCourseSchema, editCourseSchema } from "@/lib/validations/courses";
import { faCoursesMessages } from "@/lib/validations/courses/messages";
import type { CourseResult, CourseListResponse } from "@/types/courses";

async function hasAdminAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { role: true } } },
  });
  return user?.roles.some((r) => ["ADMIN", "SUPERADMIN"].includes(r.role)) ?? false;
}

async function isInstructorOrAdmin(userId: string, courseId?: string): Promise<boolean> {
  if (await hasAdminAccess(userId)) return true;

  if (!courseId) return false;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true },
  });

  return course?.instructorId === userId;
}

export async function handleCreateCourse(data: unknown, userId: string): Promise<CourseResult> {
  if (!(await hasAdminAccess(userId))) return { success: false, error: faCoursesMessages.unauthorized };

  const parsed = createCourseSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faCoursesMessages.server_error };

  const {
    title,
    instructorId,
    type,
    status = "DRAFT",
    description,
    duration,
    units = 0,
    capacity,
    price,
    discountPercent,
    maxDiscountAmount,
    categoryIds,
    tagIds,
    termId,
    image,
    videoPreview,
    honeypot,
  } = parsed.data;

  if (honeypot && honeypot.length > 0) return { success: true };

  const baseSlug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  let slug = baseSlug;
  let counter = 1;
  while (await prisma.course.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  const course = await prisma.course.create({
    data: {
      title,
      slug,
      description,
      shortDescription: description?.slice(0, 300) || null,
      duration,
      units,
      type,
      status,
      isSaleEnabled: true,
      capacity,
      price: price as any,
      discountPercent,
      maxDiscountAmount: maxDiscountAmount as any,
      image: image || null,
      videoPreview: videoPreview || null,
      instructor: { connect: { id: instructorId } },
      categories: categoryIds?.length ? { connect: categoryIds.map(id => ({ id })) } : undefined,
      tags: tagIds?.length ? { connect: tagIds.map(id => ({ id })) } : undefined,
      term: termId ? { connect: { id: termId } } : undefined,
    },
    include: {
      instructor: { select: { id: true, name: true, image: true } },
      categories: true,
      tags: true,
      term: true,
    },
  });

  return { success: true, message: "دوره با موفقیت ایجاد شد", course };
}

export async function handleEditCourse(data: unknown, userId: string): Promise<CourseResult> {
  const parsed = editCourseSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faCoursesMessages.server_error };

  const { id, title, ...updateData } = parsed.data;

  if (!(await isInstructorOrAdmin(userId, id))) return { success: false, error: faCoursesMessages.not_owner };

  if (title) {
    const baseSlug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.course.findUnique({ where: { slug, NOT: { id } } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    updateData.slug = slug;
  }

  const course = await prisma.course.update({
    where: { id },
    data: {
      ...updateData,
      price: updateData.price as any,
      maxDiscountAmount: updateData.maxDiscountAmount as any,
    },
    include: {
      instructor: { select: { id: true, name: true, image: true } },
      categories: true,
      tags: true,
      term: true,
    },
  });

  return { success: true, message: "دوره با موفقیت ویرایش شد", course };
}

export async function handleToggleCourse(courseId: string, userId: string): Promise<CourseResult> {
  if (!(await hasAdminAccess(userId))) return { success: false, error: faCoursesMessages.unauthorized };

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return { success: false, error: faCoursesMessages.course_not_found };

  const newStatus = course.status === "PUBLISHED" ? "ARCHIVED" : "PUBLISHED";

  await prisma.course.update({
    where: { id: courseId },
    data: { status: newStatus, isVisible: newStatus === "PUBLISHED" },
  });

  return { success: true, message: `دوره ${newStatus === "PUBLISHED" ? "منتشر" : "آرشیو"} شد` };
}

export async function handleDeleteCourse(courseId: string, userId: string): Promise<CourseResult> {
  if (!(await hasAdminAccess(userId))) return { success: false, error: faCoursesMessages.unauthorized };

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return { success: false, error: faCoursesMessages.course_not_found };

  await prisma.course.delete({ where: { id: courseId } });

  return { success: true, message: "دوره با موفقیت حذف شد" };
}

export async function handleGetPublicCourses(search?: string, categoryId?: string, instructorId?: string): Promise<CourseListResponse> {
  const where: any = {
    status: "PUBLISHED",
    isVisible: true,
  };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (categoryId) where.categories = { some: { id: categoryId } };
  if (instructorId) where.instructorId = instructorId;

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        image: true,
        price: true,
        discountPercent: true,
        type: true,
        status: true, // اضافه شد برای رفع خطا
        enrolledCount: true,
        instructor: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.course.count({ where }),
  ]);

  return { courses, total };
}