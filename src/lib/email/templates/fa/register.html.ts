export default function registerTemplate({ name }: { name: string }) {
  return `
    <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; background: #f9f9f9; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      <h1 style="color: #1a73e8; text-align: center; margin-bottom: 10px;">روم آکادمی</h1>
      <h2 style="text-align: center; color: #333; margin-bottom: 30px;">خوش آمدید!</h2>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">سلام <strong>${name}</strong> عزیز،</p>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        تبریک می‌گیم! حساب شما با موفقیت در روم آکادمی ساخته شد 🎉
      </p>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        حالا می‌تونید وارد حساب خودتون بشید و از بهترین دوره‌های آموزشی استفاده کنید.
      </p>
      <div style="text-align: center; margin: 40px 0;">
        <a href="${process.env.NEXT_PUBLIC_BASE_URL}/auth" style="display: inline-block; padding: 16px 36px; background: #1a73e8; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">
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