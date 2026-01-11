"use server";

import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";
import { ipRateLimit } from "@/lib/redis/rate-limit";
import { sendAdminNotificationEmail } from "@/lib/email/sendAdminContactEmail";
import { z } from "zod";

// Schema اعتبارسنجی فرم تماس
const contactSchema = z.object({
  name: z.string().min(2, "نام باید حداقل ۲ کاراکتر باشد").max(100),
  email: z.string().email("ایمیل نامعتبر است"),
  subject: z.string().optional(),
  message: z.string().min(10, "پیام باید حداقل ۱۰ کاراکتر باشد").max(2000),
  honeypot: z.string().optional(), // برای ضد بات
});

type ContactResult =
  | { success: true; message: string }
  | { success: false; error: string };

// ==================== اکشن اصلی ارسال فرم تماس ====================
export async function submitContactForm(formData: FormData): Promise<ContactResult> {
  const rawData = Object.fromEntries(formData);

  // اعتبارسنجی ورودی‌ها
  const parsed = contactSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: "لطفاً همه فیلدها را به درستی پر کنید." };
  }

  const { name, email, subject, message, honeypot } = parsed.data;

  // ضد بات: اگر honeypot پر شده باشه، وانمود کن موفق بود
  if (honeypot && honeypot.length > 0) {
    console.log("[CONTACT] بات شناسایی شد (honeypot پر شده)");
    return { success: true, message: "پیام شما با موفقیت ارسال شد." };
  }

  // Rate limiting بر اساس IP
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  const { success: rateLimitSuccess } = await ipRateLimit.limit(ip);
  if (!rateLimitSuccess) {
    return { success: false, error: "تعداد درخواست‌ها بیش از حد است. لطفاً چند دقیقه دیگر تلاش کنید." };
  }

  try {
    // ذخیره پیام در دیتابیس
    const contactMessage = await prisma.contactMessage.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        subject: (subject || "بدون موضوع").trim(),
        message: message.trim(),
        ipAddress: ip === "unknown" ? null : ip,
        userAgent: headersList.get("user-agent") ?? null,
        status: "PENDING",
        replied: false,
      },
    });

    console.log("[CONTACT] پیام تماس جدید ذخیره شد → ID:", contactMessage.id);

    // ارسال ایمیل اطلاع‌رسانی به ادمین
    await sendAdminNotificationEmail({
      id: contactMessage.id,
      name: contactMessage.name,
      email: contactMessage.email,
      subject: contactMessage.subject,
      message: contactMessage.message,
      createdAt: contactMessage.createdAt,
      ipAddress: contactMessage.ipAddress ?? undefined,
    });

    return { success: true, message: "پیام شما با موفقیت ارسال شد. به‌زودی با شما تماس می‌گیریم." };
  } catch (error: any) {
    console.error("[CONTACT] خطا در ذخیره پیام تماس یا ارسال ایمیل:", error);
    return { success: false, error: "خطایی در سرور رخ داد. لطفاً بعداً تلاش کنید." };
  }
}