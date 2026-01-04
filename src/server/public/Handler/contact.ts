"use server";

import prisma from "@/lib/db/prisma";  // ایمپورت از فایل بالا
import { sendAdminNotificationEmail } from "@/lib/email/sendAdminContactEmail";
import type { ContactFormData } from "@/types/contact";

export async function handleContactSubmission(
  data: ContactFormData,
  context: { ip?: string | null; userAgent?: string | null } = {}
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    if (data.honeypot && data.honeypot.length > 0) {
      console.log("[CONTACT] بات شناسایی شد (honeypot پر شده)");
      return { success: true };
    }

    const contactMessage = await prisma.contactMessage.create({
      data: {
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        subject: data.subject.trim() || "بدون موضوع",
        message: data.message.trim(),
        ipAddress: context.ip ?? null,
        userAgent: context.userAgent ?? null,
        status: "PENDING",
        replied: false,
      },
    });

    console.log("[CONTACT] پیام تماس جدید ذخیره شد → ID:", contactMessage.id);

    await sendAdminNotificationEmail({
      id: contactMessage.id,
      name: contactMessage.name,
      email: contactMessage.email,
      subject: contactMessage.subject,
      message: contactMessage.message,
      createdAt: contactMessage.createdAt,
      ipAddress: contactMessage.ipAddress,
    });

    return { success: true };
  } catch (error: any) {
    console.error("[CONTACT] خطا در ذخیره پیام یا ارسال ایمیل:", error);
    return { success: false, error: "خطایی در سرور رخ داد. لطفاً بعداً تلاش کنید." };
  }
}