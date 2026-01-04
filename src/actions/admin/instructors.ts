// src/actions/admin/instructors.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

const PAGE_SIZE = 12;

/**
 * دریافت داده‌های مدرسان برای نمایش در لیست
 */
export async function fetchInstructors({
  search = "",
  page = 1,
  searchParams = {},
}: {
  search?: string;
  page?: number;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const where: Prisma.InstructorWhereInput = {};

  if (search.trim()) {
    const trimmedSearch = search.trim();
    where.OR = [
      { name: { contains: trimmedSearch, mode: "insensitive" } },
      { bio: { contains: trimmedSearch, mode: "insensitive" } },
      { expertise: { contains: trimmedSearch, mode: "insensitive" } },
    ];
  }

  const [instructorsRaw, totalInstructors] = await Promise.all([
    prisma.instructor.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        _count: { select: { courses: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.instructor.count({ where }),
  ]);

  const items = instructorsRaw.map((i) => ({
    ...i,
    coursesCount: i._count.courses,
  }));

  // آمار وضعیت
  const active = instructorsRaw.filter(i => i.isActive).length;
  const inactive = totalInstructors - active;

  const stats = [
    { key: "active", count: active },
    { key: "inactive", count: inactive },
  ];

  return { items, totalItems: totalInstructors, stats };
}

/**
 * عملیات گروهی فعال/غیرفعال/حذف مدرسان
 */
export async function bulkInstructorAction(
  selectedIds: string[],
  action: "activate" | "deactivate" | "delete"
) {
  if (selectedIds.length === 0) {
    return {
      success: false,
      message: "هیچ مدرسی انتخاب نشده است.",
    };
  }

  try {
    if (action === "delete") {
      await prisma.instructor.deleteMany({
        where: { id: { in: selectedIds } },
      });
      return {
        success: true,
        message: `${selectedIds.length} مدرس با موفقیت حذف شدند.`,
      };
    }

    const isActive = action === "activate";

    await prisma.instructor.updateMany({
      where: { id: { in: selectedIds } },
      data: { isActive },
    });

    return {
      success: true,
      message: `${selectedIds.length} مدرس با موفقیت ${isActive ? "فعال" : "غیرفعال"} شدند.`,
    };
  } catch (error) {
    console.error("خطا در عملیات گروهی مدرسان:", error);
    return {
      success: false,
      message: "خطایی در انجام عملیات گروهی رخ داد.",
    };
  }
}

/**
 * خروجی CSV از مدرسان
 */
export async function exportInstructorsCsv(where: Prisma.InstructorWhereInput = {}) {
  try {
    const instructors = await prisma.instructor.findMany({
      where,
      include: {
        _count: { select: { courses: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "نام",
      "بیوگرافی",
      "تخصص",
      "تعداد دوره‌ها",
      "وضعیت",
      "تاریخ ایجاد",
    ];

    const rows = instructors.map((i) => [
      i.name,
      i.bio || "-",
      i.expertise || "-",
      i._count.courses.toString(),
      i.isActive ? "فعال" : "غیرفعال",
      new Date(i.createdAt).toLocaleDateString("fa-IR"),
    ]);

    const csvLines = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    return `\uFEFF${csvLines}`;
  } catch (error) {
    console.error("خطا در خروجی CSV مدرسان:", error);
    throw new Error("خطایی در تولید فایل CSV رخ داد.");
  }
}