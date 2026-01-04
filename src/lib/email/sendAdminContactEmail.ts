// src/lib/email/sendAdminContactEmail.ts

import { sendEmail } from "./sendEmail";
import { prisma } from "@/lib/db/prisma";
import type { ContactMessageForEmail } from "@/types/contact";

export async function sendAdminNotificationEmail(message: ContactMessageForEmail) {
  try {
    // همه ادمین‌ها رو بگیر
    const admins = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: "ADMIN",
          },
        },
        isEmailVerified: true,
        isBanned: false,
      },
      select: {
        email: true,
        name: true,
        preferredLocale: true,
      },
    });

    if (admins.length === 0) {
      console.warn("[EMAIL] هیچ ادمینی برای دریافت نوتیفیکیشن یافت نشد");
      return;
    }

    // برای هر ادمین، ایمیل به زبان خودش بفرست
    for (const admin of admins) {
      const locale = admin.preferredLocale || "fa";
      const isFa = locale === "fa";
      const isEn = locale === "en";
      const isRu = locale === "ru";

      // انتخاب متن‌ها بر اساس زبان
      const texts = {
        title: isFa ? "پیام تماس جدید" : isEn ? "New Contact Message" : "Новое сообщение в контакте",
        nameLabel: isFa ? "نام" : isEn ? "Name" : "Имя",
        emailLabel: isFa ? "ایمیل" : isEn ? "Email" : "Email",
        subjectLabel: isFa ? "موضوع" : isEn ? "Subject" : "Тема",
        noSubject: isFa ? "بدون موضوع" : isEn ? "No subject" : "Без темы",
        messageLabel: isFa ? "پیام" : isEn ? "Message" : "Сообщение",
        receivedAt: isFa ? "زمان دریافت" : isEn ? "Received at" : "Получено",
        unknown: isFa ? "نامشخص" : isEn ? "Unknown" : "Неизвестно",
        viewInPanel: isFa ? "مشاهده در پنل مدیریت" : isEn ? "View in Admin Panel" : "Просмотр в панели админа",
        footer: isFa 
          ? "روم آکادمی | پشتیبانی: support@rom.ir" 
          : isEn 
          ? "Rom Academy | Support: support@rom.ir" 
          : "Rom Academy | Поддержка: support@rom.ir",
      };

      const subject = isFa
        ? `پیام تماس جدید از ${message.name} - روم آکادمی`
        : isEn
        ? `New Contact Message from ${message.name} - Rom Academy`
        : `Новое сообщение от ${message.name} - Rom Academy`;

      const formattedDate = new Date(message.createdAt).toLocaleString(
        isFa ? "fa-IR" : isEn ? "en-US" : "ru-RU"
      );

      const dir = isFa ? "rtl" : "ltr";
      const textAlign = isFa ? "right" : "left";
      const fontFamily = isFa ? "Tahoma" : "'Helvetica Neue', Arial, sans-serif";

      const html = `
        <div dir="${dir}" style="font-family: ${fontFamily}; max-width: 600px; margin: auto; padding: 30px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <h2 style="color: #1e293b; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; margin-bottom: 20px; text-align: ${textAlign};">
            ${texts.title}
          </h2>
          
          <div style="font-size: 16px; line-height: 1.8; color: #334155; text-align: ${textAlign};">
            <p><strong>${texts.nameLabel}:</strong> ${message.name}</p>
            <p><strong>${texts.emailLabel}:</strong> 
              <a href="mailto:${message.email}" style="color: #3b82f6; text-decoration: none;">${message.email}</a>
            </p>
            <p><strong>${texts.subjectLabel}:</strong> ${message.subject || texts.noSubject}</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;" />
            
            <p style="margin-bottom: 10px;"><strong>${texts.messageLabel}:</strong></p>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; white-space: pre-wrap; font-family: monospace; font-size: 14px; border: 1px solid #e2e8f0;">
              ${message.message}
            </div>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;" />
            
            <p style="font-size: 14px; color: #64748b;">
              <strong>${texts.receivedAt}:</strong> ${formattedDate}<br />
              <strong>IP:</strong> ${message.ipAddress || texts.unknown}
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 40px;">
            <a href="https://rom.ir/admin/contacts" style="display: inline-block; padding: 16px 36px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">
              ${texts.viewInPanel}
            </a>
          </div>
          
          <hr style="margin: 40px 0 20px; border: none; border-top: 1px solid #e2e8f0;" />
          <p style="font-size: 14px; color: #94a3b8; text-align: center;">
            ${texts.footer}
          </p>
        </div>
      `;

      await sendEmail({
        to: admin.email,
        subject,
        html,
      });

      console.log(`[EMAIL] نوتیفیکیشن پیام تماس به ادمین ارسال شد: ${admin.email} (${locale})`);
    }
  } catch (error) {
    console.error("[EMAIL ADMIN CONTACT] خطا در ارسال نوتیفیکیشن به ادمین‌ها:", error);
  }
}