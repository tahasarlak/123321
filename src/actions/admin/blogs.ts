"use server";

import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

const PAGE_SIZE = 12;

/**
 * دریافت لیست مقالات (پست‌های بلاگ) با جستجو و صفحه‌بندی
 */
export async function fetchBlogs({
  search = "",
  page = 1,
  searchParams = {},
}: {
  search?: string;
  page?: number;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const where: Prisma.PostWhereInput = {};

  if (search.trim()) {
    const trimmedSearch = search.trim();
    where.OR = [
      { title: { contains: trimmedSearch, mode: "insensitive" } },
      { author: { name: { contains: trimmedSearch, mode: "insensitive" } } },
    ];
  }

  const [postsRaw, totalPosts] = await Promise.all([
    prisma.post.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { author: { select: { name: true } } },
      orderBy: { publishedAt: "desc" },
    }),
    prisma.post.count({ where }),
  ]);

  const items = postsRaw.map((p: Prisma.PostGetPayload<{ include: { author: { select: { name: true } } } }>) => ({
    ...p,
    published: p.published ?? false,
  }));

  // آمار ساده: منتشر شده و پیش‌نویس
  const publishedCount = postsRaw.filter((p) => p.published).length;
  const draftCount = totalPosts - publishedCount;

  const stats = [
    { key: "published", count: publishedCount },
    { key: "draft", count: draftCount },
  ];

  return { items, totalItems: totalPosts, stats };
}

/**
 * عملیات گروهی روی مقالات (انتشار، پیش‌نویس، حذف)
 */
export async function bulkBlogAction(
  selectedIds: string[],
  action: "publish" | "unpublish" | "delete"
) {
  if (selectedIds.length === 0) {
    return { success: false, message: "هیچ مقاله‌ای انتخاب نشده است." };
  }

  try {
    if (action === "delete") {
      await prisma.post.deleteMany({
        where: { id: { in: selectedIds } },
      });
      return { success: true, message: `${selectedIds.length} مقاله با موفقیت حذف شدند.` };
    }

    const published = action === "publish";

    await prisma.post.updateMany({
      where: { id: { in: selectedIds } },
      data: { published },
    });

    return {
      success: true,
      message: published
        ? `${selectedIds.length} مقاله با موفقیت منتشر شدند.`
        : `${selectedIds.length} مقاله با موفقیت به حالت پیش‌نویس بازگشتند.`,
    };
  } catch (error) {
    console.error("خطا در عملیات گروهی مقالات:", error);
    return { success: false, message: "خطایی در انجام عملیات گروهی رخ داد." };
  }
}
/**
 * خروجی CSV مقالات (پست‌های بلاگ)
 */
export async function exportBlogsCsv(baseWhere: Prisma.PostWhereInput = {}) {
  try {
    const allPosts = await prisma.post.findMany({
      where: baseWhere,
      include: {
        author: { select: { name: true } },
        category: { select: { name: true } }, // اگر دسته‌بندی دارید
      },
      orderBy: { publishedAt: "desc" },
    });

    const headers = [
      "عنوان",
      "اسلاگ",
      "نویسنده",
      "دسته‌بندی",
      "وضعیت",
      "تاریخ انتشار",
      "تعداد بازدید",
    ];

    const rows = allPosts.map((p) => [
      p.title || "-",
      p.slug || "-",
      p.author?.name || "نامشخص",
      p.category?.name || "-",
      p.published ? "منتشر" : "پیش‌نویس",
      p.publishedAt ? new Date(p.publishedAt).toLocaleDateString("fa-IR") : "-",
      p.views || 0,
    ]);

    const csvLines = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return `\uFEFF${csvLines}`;
  } catch (error) {
    console.error("خطا در خروجی CSV مقالات:", error);
    throw new Error("خطایی در تولید فایل CSV رخ داد.");
  }
}