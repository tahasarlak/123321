// src/server/public/Handler/instructorEarnings.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { requestWithdrawalSchema } from "@/lib/validations/instructorEarnings";
import { faInstructorEarningsMessages } from "@/lib/validations/instructorEarnings/messages";
import type { EarningsResult } from "@/types/instructorEarnings";

export async function handleGetEarnings(userId: string): Promise<EarningsResult> {
  const earnings = await prisma.course.findMany({
    where: { instructorId: userId },
    select: {
      id: true,
      title: true,
      orderItems: { select: { price: true } },
      buyers: { select: { id: true } },
    },
  });

  const formatted = earnings.map(c => ({
    courseId: c.id,
    title: c.title,
    revenue: c.orderItems.reduce((sum, oi) => sum + oi.price, 0),
    students: c.buyers.length,
  }));

  const total = formatted.reduce((sum, e) => sum + e.revenue, 0);

  return { success: true, earnings: formatted, total };
}

export async function handleRequestWithdrawal(data: unknown, userId: string): Promise<EarningsResult> {
  const parsed = requestWithdrawalSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: "داده نامعتبر" };

  const { amount, method, details, honeypot } = parsed.data;
  if (honeypot && honeypot.length > 0) return { success: true };

  const earnings = await handleGetEarnings(userId);
  if (!earnings.success || (earnings.total ?? 0) < amount) {
    return { success: false, error: faInstructorEarningsMessages.insufficient_balance };
  }

  // ایجاد درخواست برداشت (ساده — بعداً مدل WithdrawalRequest اضافه کن)
  await prisma.notification.create({
    data: {
      userId: "admin_id", // یا به همه ادمین‌ها با loop
      title: "درخواست برداشت جدید",
      message: `استاد ${userId} درخواست برداشت ${amount} تومان با روش ${method} کرد.\nجزئیات: ${details}`,
      type: "withdrawal",
    },
  });

  return { success: true, message: "درخواست برداشت ثبت شد (در انتظار تأیید ادمین)" };
}