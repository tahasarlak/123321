// src/actions/admin/notifications.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

const PAGE_SIZE = 20;

/**
 * دریافت داده‌های نوتیفیکیشن‌ها برای نمایش در لیست
 */
export async function fetchNotifications({
  search = "",
  page = 1,
  searchParams = {},
}: {
  search?: string;
  page?: number;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const where: Prisma.NotificationWhereInput = {};

  if (search.trim()) {
    const trimmedSearch = search.trim();
    where.OR = [
      { title: { contains: trimmedSearch, mode: "insensitive" } },
      { message: { contains: trimmedSearch, mode: "insensitive" } },
      { user: { name: { contains: trimmedSearch, mode: "insensitive" } } },
    ];
  }

  const [notificationsRaw, totalNotifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        user: { select: { name: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { isRead: false } }),
  ]);

  const items = notificationsRaw;

  const stats = [
    { key: "total", count: totalNotifications },
    { key: "unread", count: unreadCount },
  ];

  return { items, totalItems: totalNotifications, stats };
}

/**
 * ارسال نوتیفیکیشن جدید به همه کاربران
 */
export async function sendGlobalNotification(formData: FormData) {
  const title = (formData.get("title") as string)?.trim();
  const message = (formData.get("message") as string)?.trim();
  const type = ((formData.get("type") as string) || "INFO").toUpperCase();
  const link = (formData.get("link") as string)?.trim() || undefined;

  if (!title || !message) {
    return { success: false, message: "عنوان و متن اعلان الزامی است" };
  }

  try {
    const users = await prisma.user.findMany({
      select: { id: true },
    });

    await prisma.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        title,
        message,
        type: type as "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "OFFER",
        link,
      })),
    });

    revalidatePath("/dashboard/admin/notifications");
    return { success: true, message: "نوتیفیکیشن با موفقیت به همه کاربران ارسال شد" };
  } catch (error) {
    console.error("خطا در ارسال نوتیفیکیشن جهانی:", error);
    return { success: false, message: "خطایی در ارسال رخ داد" };
  }
}