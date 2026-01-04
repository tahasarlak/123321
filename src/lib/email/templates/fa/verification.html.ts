export default function verificationTemplate({
  name,
  verifyLink,
}: {
  name: string;
  verifyLink: string;
}) {
  // تشخیص خودکار: اگر لینک شامل token باشه → تأیید، وگرنه → قبلاً تأیید شده
  const isAlreadyVerified = !verifyLink.includes("?token=");
  const buttonText = isAlreadyVerified ? "ورود به حساب کاربری" : "تأیید ایمیل";
  const buttonColor = isAlreadyVerified ? "#28a745" : "#1a73e8";
  const title = isAlreadyVerified ? "ایمیل شما قبلاً تأیید شده است! 🎉" : "تأیید ایمیل حساب شما";

  return `
    <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; background: #f9f9f9; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      <h1 style="color: #1a73e8; text-align: center; margin-bottom: 10px;">روم آکادمی</h1>
      <h2 style="text-align: center; color: ${isAlreadyVerified ? '#155724' : '#333'}; margin-bottom: 30px;">
        ${title}
      </h2>

      ${isAlreadyVerified ? `
        <div style="background: #d4edda; color: #155724; padding: 20px; border-radius: 8px; border: 1px solid #c3e6cb; text-align: center; margin: 20px 0;">
          <strong>حساب شما فعال است!</strong>
        </div>
      ` : ''}

      <p style="font-size: 16px; color: #555; line-height: 1.6;">سلام <strong>${name}</strong> عزیز،</p>

      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        ${isAlreadyVerified 
          ? "تبریک! ایمیل شما قبلاً با موفقیت تأیید شده است.<br>حالا می‌توانید مستقیماً وارد حساب خود شوید." 
          : "برای فعال کردن حساب خود، لطفاً ایمیل خود را تأیید کنید."
        }
      </p>

      <div style="text-align: center; margin: 40px 0;">
        <a href="${verifyLink}" style="display: inline-block; padding: 16px 36px; background: ${buttonColor}; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">
          ${buttonText}
        </a>
      </div>

      <p style="font-size: 14px; color: #888;">
        ${isAlreadyVerified 
          ? "هر زمان که خواستید می‌توانید وارد شوید." 
          : "این لینک تا <strong>۲۴ ساعت</strong> معتبر است."
        }
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;">

      <p style="font-size: 14px; color: #999; text-align: center;">
        روم آکادمی | پشتیبانی: 
        <a href="mailto:support@rom.ir" style="color: #1a73e8; text-decoration: none;">support@rom.ir</a>
      </p>
    </div>
  `;
}