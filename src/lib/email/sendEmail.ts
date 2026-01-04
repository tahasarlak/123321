// src/lib/email/sendEmail.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || process.env.GMAIL_USER,
    pass: process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}) {
  console.log("[SEND EMAIL] شروع ارسال واقعی");
  console.log("[SEND EMAIL] گیرنده:", to);
  console.log("[SEND EMAIL] موضوع:", subject);
  console.log("[SEND EMAIL] طول HTML:", html.length);

  try {
    const info = await transporter.sendMail({
      from: `"روم آکادمی" <${process.env.SMTP_USER || process.env.GMAIL_USER}>`,
      to: Array.isArray(to) ? to : to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim(),
    });

    console.log("[SEND EMAIL] ارسال موفق! MessageId:", info.messageId);
    console.log("[SEND EMAIL] Response:", info.response);

    return { success: true, data: info };
  } catch (error: any) {
    console.error("[SEND EMAIL] خطای واقعی در ارسال ایمیل:", {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });

    return { success: false, error };
  }
}