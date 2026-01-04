// src/lib/email/templates/fa/reset-success.html.ts

export default function resetSuccessTemplate({ name, loginLink }: { name: string; loginLink: string }) {
  return `
    <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; background: #f9f9f9; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      <h1 style="color: #1a73e8; text-align: center; margin-bottom: 10px;">روم آکادمی</h1>
      <h2 style="text-align: center; color: #333; margin-bottom: 30px;">رمز عبور شما تغییر کرد</h2>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">سلام <strong>${name}</strong> عزیز،</p>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        رمز عبور حساب شما با موفقیت تغییر یافت 🎉
      </p>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        اگر این تغییر توسط شما انجام شده، عالیه! حالا می‌تونید با رمز جدید وارد حساب خودتون بشید.
      </p>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        اگر شما این تغییر رو انجام ندادید، <strong>فوراً</strong> با پشتیبانی تماس بگیرید:
        <a href="mailto:support@rom.ir" style="color: #d32f2f; font-weight: bold;">support@rom.ir</a>
      </p>
      <div style="text-align: center; margin: 40px 0;">
        <a href="${loginLink}" style="display: inline-block; padding: 16px 36px; background: #1a73e8; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">
          ورود به حساب
        </a>
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;">
      <p style="font-size: 14px; color: #999; text-align: center;">
        روم آکادمی | پشتیبانی: <a href="mailto:support@rom.ir" style="color: #1a73e8;">support@rom.ir</a>
      </p>
    </div>
  `;
}