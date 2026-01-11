"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

// چک دسترسی: ادمین + مدرس + co-instructor
async function canAccessEarnings(userId: string, instructorId: string): Promise<boolean> {
  if (userId === instructorId) return true;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { role: true } } },
  });

  return user?.roles.some(r => ["ADMIN", "SUPER_ADMIN"].includes(r.role)) || false;
}

// validation برای درخواست برداشت
const getWithdrawalSchema = (t: (key: string) => string) => z.object({
  amount: z.string().transform(v => parseInt(v, 10)).pipe(z.number().min(10000, t("minimum_withdrawal"))),
  method: z.string().min(1),
  details: z.string().min(1),
  honeypot: z.string().optional(),
});

export async function fetchInstructorEarnings({ userId }: { userId: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !(await canAccessEarnings(session.user.id, userId))) {
    return { items: [], totalRevenue: 0, available: 0, stats: [] };
  }

  // کمیسیون سایت
  const commission = await prisma.platformCommission.findFirst({
    where: { isActive: true },
    select: { percentage: true },
  });
  const commissionRate = commission?.percentage || 20;

  // دوره‌های مدرس یا co-instructor
  const courses = await prisma.course.findMany({
    where: {
      OR: [
        { instructorId: userId },
        { coInstructors: { some: { id: userId } } },
      ],
    },
    select: {
      id: true,
      title: true,
      orderItems: { select: { price: true, quantity: true } },
      buyers: { select: { id: true } },
    },
  });

  const earnings = courses.map(course => {
    const gross = course.orderItems.reduce((sum, oi) => sum + oi.price * oi.quantity, 0);
    const net = Math.round(gross * (100 - commissionRate) / 100);
    return {
      courseId: course.id,
      title: course.title,
      grossRevenue: gross,
      platformCut: gross - net,
      netRevenue: net,
      students: course.buyers.length,
    };
  });

  const totalGross = earnings.reduce((sum, e) => sum + e.grossRevenue, 0);
  const totalNet = earnings.reduce((sum, e) => sum + e.netRevenue, 0);

  // موجودی موجود برای برداشت (کل درآمد خالص - برداشت‌شده)
  const withdrawn = await prisma.withdrawalRequest.aggregate({
    where: { instructorId: userId, status: "PAID" },
    _sum: { amount: true },
  });

  const available = totalNet - (withdrawn._sum.amount || 0);

  return {
    items: earnings,
    totalGross,
    totalNet,
    available,
    commissionRate,
    stats: [
      { key: "totalGross", label: "کل فروش", value: totalGross },
      { key: "platformCut", label: "کمیسیون سایت", value: totalGross - totalNet },
      { key: "netEarning", label: "درآمد خالص", value: totalNet },
      { key: "available", label: "قابل برداشت", value: available },
      { key: "totalCourses", label: "تعداد دوره", value: courses.length },
      { key: "totalStudents", label: "تعداد دانشجو", value: earnings.reduce((s, e) => s + e.students, 0) },
    ],
  };
}

export async function requestWithdrawalAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  const tCommon = await getTranslations("common");
  const tValidation = await getTranslations("validation");

  if (!session?.user?.id) return { success: false, error: tCommon("please_login") };

  const userId = session.user.id as string;
  const rawData = Object.fromEntries(formData);
  const schema = getWithdrawalSchema(key => tValidation(key));
  const parsed = schema.safeParse(rawData);

  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  const { amount, method, details, honeypot } = parsed.data;
  if (honeypot && honeypot.length > 0) return { success: true };

  const earnings = await fetchInstructorEarnings({ userId });
  if (earnings.available < amount) {
    return { success: false, error: tValidation("insufficient_balance") || "موجودی کافی نیست" };
  }

  await prisma.withdrawalRequest.create({
    data: {
      instructorId: userId,
      amount,
      method,
      details: JSON.parse(details),
      status: "PENDING",
    },
  });

  // نوتیفیکیشن به ادمین
  const admins = await prisma.user.findMany({
    where: { roles: { some: { role: { in: ["ADMIN", "SUPER_ADMIN"] } } } },
    select: { id: true },
  });

  for (const admin of admins) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        title: "درخواست برداشت جدید",
        message: `مدرس ${session.user.name} درخواست برداشت ${amount.toLocaleString("fa-IR")} تومان کرد.`,
        type: "withdrawal",
        link: "/dashboard/admin/withdrawals",
      },
    });
  }

  revalidatePath("/dashboard/instructor/earnings");
  return { success: true, message: "درخواست برداشت ثبت شد و در انتظار تأیید ادمین است" };
}