// src/lib/email/sendWithTemplate.ts
import { sendEmail } from "./sendEmail";

type EmailType = "register" | "verification" | "forgot" | "reset-success";

// Overload برای Type-safety کامل
export async function sendWithTemplate(
  to: string,
  type: "register",
  locale: string,
  variables: { name: string }
): Promise<void>;
export async function sendWithTemplate(
  to: string,
  type: "verification",
  locale: string,
  variables: { name: string; verifyLink: string }
): Promise<void>;
export async function sendWithTemplate(
  to: string,
  type: "forgot",
  locale: string,
  variables: { name: string; resetLink: string }
): Promise<void>;
export async function sendWithTemplate(
  to: string,
  type: "reset-success",
  locale: string,
  variables: { name: string; loginLink?: string }
): Promise<void>;

// پیاده‌سازی اصلی با لاگ‌های دقیق
export async function sendWithTemplate(
  to: string,
  type: EmailType,
  locale: string = "fa",
  variables: any
): Promise<void> {
  console.log("[SEND WITH TEMPLATE] شروع فرآیند ارسال ایمیل");
  console.log("[SEND WITH TEMPLATE] گیرنده:", to);
  console.log("[SEND WITH TEMPLATE] نوع تمپلیت:", type);
  console.log("[SEND WITH TEMPLATE] زبان:", locale);
  console.log("[SEND WITH TEMPLATE] متغیرها:", variables);

  const localeKey = (locale in templates ? locale : "fa") as keyof typeof templates;

  try {
    console.log("[SEND WITH TEMPLATE] در حال بارگذاری تمپلیت:", `${localeKey}/${type}`);

    const templateModule = await templates[localeKey][type]();

    console.log("[SEND WITH TEMPLATE] تمپلیت با موفقیت لود شد");

    const html = templateModule.default(variables);

    console.log("[SEND WITH TEMPLATE] HTML تمپلیت تولید شد (طول:", html.length, "کاراکتر)");

    let subject = "";
    switch (type) {
      case "register":
        subject =
          locale === "fa"
            ? "خوش آمدید به روم آکادمی!"
            : locale === "en"
            ? "Welcome to Rom Academy!"
            : "Добро пожаловать в Rom Academy!";
        break;
      case "verification":
        subject =
          locale === "fa"
            ? "تأیید ایمیل - روم آکادمی"
            : locale === "en"
            ? "Verify Your Email - Rom Academy"
            : "Подтвердите email - Rom Academy";
        break;
      case "forgot":
        subject =
          locale === "fa"
            ? "بازیابی رمز عبور - روم آکادمی"
            : locale === "en"
            ? "Password Reset - Rom Academy"
            : "Сброс пароля - Rom Academy";
        break;
      case "reset-success":
        subject =
          locale === "fa"
            ? "رمز عبور تغییر کرد - روم آکادمی"
            : locale === "en"
            ? "Password Changed - Rom Academy"
            : "Пароль изменён - Rom Academy";
        break;
    }

    console.log("[SEND WITH TEMPLATE] موضوع ایمیل:", subject);

    console.log("[SEND WITH TEMPLATE] در حال فراخوانی sendEmail...");
    await sendEmail({ to, subject, html });

    console.log("[SEND WITH TEMPLATE] sendEmail با موفقیت اجرا شد — ایمیل ارسال شد");
  } catch (error: any) {
    console.error("[SEND WITH TEMPLATE] خطا در فرآیند ارسال ایمیل:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
      locale,
      type,
      to,
    });

    // Fallback ایمیل ساده در صورت خطا
    console.log("[SEND WITH TEMPLATE] ارسال ایمیل fallback...");
    await sendEmail({
      to,
      subject: "روم آکادمی - اطلاع‌رسانی مهم",
      html: `
        <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; background: #f9f9f9; border-radius: 12px;">
          <h2 style="color: #1a73e8; text-align: center;">روم آکادمی</h2>
          <p style="font-size: 16px; color: #555; line-height: 1.6;">
            متأسفانه در ارسال ایمیل اصلی مشکلی پیش آمد.
          </p>
          <p style="font-size: 16px; color: #555; line-height: 1.6;">
            لطفاً با پشتیبانی تماس بگیرید:
            <a href="mailto:support@rom.ir" style="color: #1a73e8;">support@rom.ir</a>
          </p>
        </div>
      `,
    });

    console.log("[SEND WITH TEMPLATE] ایمیل fallback ارسال شد");
  }
}

const templates = {
  fa: {
    register: () => import("./templates/fa/register.html"),
    verification: () => import("./templates/fa/verification.html"),
    forgot: () => import("./templates/fa/forgot.html"),
    "reset-success": () => import("./templates/fa/reset-success.html"),
  },
  en: {
    register: () => import("./templates/en/register.html"),
    verification: () => import("./templates/en/verification.html"),
    forgot: () => import("./templates/en/forgot.html"),
    "reset-success": () => import("./templates/en/reset-success.html"),
  },
  ru: {
    register: () => import("./templates/ru/register.html"),
    verification: () => import("./templates/ru/verification.html"),
    forgot: () => import("./templates/ru/forgot.html"),
    "reset-success": () => import("./templates/ru/reset-success.html"),
  },
} as const;