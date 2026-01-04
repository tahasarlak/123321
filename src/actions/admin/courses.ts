"use server";

import { prisma } from "@/lib/db/prisma";
import { Prisma, CourseStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

const PAGE_SIZE = 12;

/**
 * دریافت لیست دوره‌ها با جستجو، فیلتر وضعیت و صفحه‌بندی
 */
export async function fetchCourses({
  search = "",
  page = 1,
  searchParams = {},
}: {
  search?: string;
  page?: number;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const statusParam = searchParams?.status as string | undefined;

  const validStatuses = [
    CourseStatus.DRAFT,
    CourseStatus.PENDING_REVIEW,
    CourseStatus.PUBLISHED,
    CourseStatus.ARCHIVED,
    CourseStatus.REJECTED,
  ] as const;

  const status = validStatuses.includes(statusParam as any)
    ? (statusParam as CourseStatus)
    : undefined;

  const where: Prisma.CourseWhereInput = {};

  if (search.trim()) {
    const trimmedSearch = search.trim();
    where.OR = [
      { title: { contains: trimmedSearch, mode: "insensitive" } },
      { code: { contains: trimmedSearch, mode: "insensitive" } },
      { instructor: { name: { contains: trimmedSearch, mode: "insensitive" } } },
      { tags: { some: { name: { contains: trimmedSearch, mode: "insensitive" } } } },
    ];
  }

  if (status) {
    where.status = status;
  }

  const [coursesRaw, totalCourses, statusCounts] = await Promise.all([
    prisma.course.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        instructor: { select: { name: true } },
        _count: { select: { buyers: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.course.count({ where }),
    prisma.course.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
  ]);

  const items = coursesRaw.map((c) => ({
    ...c,
    isPublished: c.status === CourseStatus.PUBLISHED,
  }));

  // نقشه وضعیت‌ها به کلیدهای کوچک برای UI
  const statusMap: Record<string, number> = {
    published: 0,
    draft: 0,
    pending_review: 0,
    rejected: 0,
    archived: 0,
  };

  for (const { status, _count } of statusCounts) {
    const key = status?.toLowerCase() || "unknown";
    if (key in statusMap) {
      statusMap[key] = _count.status;
    }
  }

  const stats = Object.entries(statusMap).map(([key, count]) => ({ key, count }));

  return { items, totalItems: totalCourses, stats };
}

/**
 * عملیات گروهی انتشار/لغو انتشار/حذف
 */
export async function bulkPublishCourses(
  selectedIds: string[],
  action: "publish" | "unpublish" | "delete"
) {
  if (selectedIds.length === 0) {
    return { success: false, message: "هیچ دوره‌ای انتخاب نشده است." };
  }

  try {
    if (action === "delete") {
      await prisma.course.deleteMany({
        where: { id: { in: selectedIds } },
      });
      revalidatePath("/dashboard/admin/courses");
      return { success: true, message: `${selectedIds.length} دوره با موفقیت حذف شدند.` };
    }

    const status = action === "publish" ? CourseStatus.PUBLISHED : CourseStatus.DRAFT;
    await prisma.course.updateMany({
      where: { id: { in: selectedIds } },
      data: { status },
    });

    revalidatePath("/dashboard/admin/courses");

    return {
      success: true,
      message:
        action === "publish"
          ? `${selectedIds.length} دوره با موفقیت منتشر شدند.`
          : `${selectedIds.length} دوره با موفقیت به حالت پیش‌نویس بازگشتند.`,
    };
  } catch (error) {
    console.error("خطا در عملیات گروهی دوره‌ها:", error);
    return { success: false, message: "خطایی در انجام عملیات گروهی رخ داد." };
  }
}

/**
 * تأیید و انتشار یک دوره (از وضعیت pending_review)
 */
export async function approveCourse(courseId: string) {
  try {
    const course = await prisma.course.update({
      where: { id: courseId },
      data: { status: CourseStatus.PUBLISHED },
      select: { title: true, instructorId: true },
    });

    if (course.instructorId) {
      await prisma.notification.create({
        data: {
          userId: course.instructorId,
          title: "دوره شما منتشر شد!",
          message: `دوره "${course.title}" با موفقیت تأیید و منتشر گردید.`,
          type: "SUCCESS",
        },
      });
    }

    revalidatePath("/dashboard/admin/courses");
    return { success: true, message: "دوره با موفقیت منتشر شد" };
  } catch (error) {
    console.error("خطا در تأیید دوره:", error);
    return { success: false, message: "خطا در انتشار دوره" };
  }
}

/**
 * رد کردن دوره با دلیل
 */
export async function rejectCourse(courseId: string, reason: string) {
  try {
    const course = await prisma.course.update({
      where: { id: courseId },
      data: {
        status: CourseStatus.REJECTED,
        rejectReason: reason.trim() || "دلیل مشخص نشده",
      },
      select: { title: true, instructorId: true },
    });

    if (course.instructorId) {
      await prisma.notification.create({
        data: {
          userId: course.instructorId,
          title: "دوره شما رد شد",
          message: `دوره "${course.title}" رد شد. دلیل: ${reason}`,
          type: "ERROR",
        },
      });
    }

    revalidatePath("/dashboard/admin/courses");
    return { success: true, message: "دوره با موفقیت رد شد" };
  } catch (error) {
    console.error("خطا در رد دوره:", error);
    return { success: false, message: "خطا در رد دوره" };
  }
}

/**
 * خروجی CSV دوره‌ها
 */
export async function exportCoursesCsv(baseWhere: Prisma.CourseWhereInput = {}) {
  try {
    const allCourses = await prisma.course.findMany({
      where: baseWhere,
      include: {
        instructor: { select: { name: true } },
        _count: { select: { buyers: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "عنوان",
      "اسلاگ",
      "مدرس",
      "وضعیت",
      "تعداد دانشجو",
      "تاریخ ایجاد",
    ];

    const rows = allCourses.map((c) => [
      c.title || "-",
      c.slug || "-",
      c.instructor?.name || "-",
      c.status,
      c._count.buyers ?? 0,
      new Date(c.createdAt).toLocaleDateString("fa-IR"),
    ]);

    const csvLines = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return `\uFEFF${csvLines}`;
  } catch (error) {
    console.error("خطا در خروجی CSV دوره‌ها:", error);
    throw new Error("خطایی در تولید فایل CSV رخ داد.");
  }
}