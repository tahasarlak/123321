export default function forgotTemplate({ name, resetLink }: { name: string; resetLink: string }) {
  return `
    <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; background: #f9f9f9; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      <h1 style="color: #1a73e8; text-align: center; margin-bottom: 10px;">روم آکادمی</h1>
      <h2 style="text-align: center; color: #333; margin-bottom: 30px;">بازیابی رمز عبور</h2>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">سلام <strong>${name}</strong> عزیز،</p>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        درخواست بازیابی رمز عبور برای حساب شما دریافت شد.
      </p>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        برای تنظیم رمز عبور جدید، روی دکمه زیر کلیک کنید:
      </p>
      <div style="text-align: center; margin: 40px 0;">
        <a href="${resetLink}" style="display: inline-block; padding: 16px 36px; background: #1a73e8; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">
          تغییر رمز عبور
        </a>
      </div>
      <p style="font-size: 14px; color: #888;">
        این لینک تا <strong>۱ ساعت</strong> معتبر است.<br>
        اگر این درخواست از طرف شما نبوده، لطفاً این ایمیل را نادیده بگیرید.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;">
      <p style="font-size: 14px; color: #999; text-align: center;">
        روم آکادمی | پشتیبانی: <a href="mailto:support@rom.ir" style="color: #1a73e8;">support@rom.ir</a>
      </p>
    </div>
  `;
}