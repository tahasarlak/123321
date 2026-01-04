export default function verificationTemplate({ name, verifyLink }: { name: string; verifyLink: string }) {
  return `
    <div dir="ltr" style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; background: #f9f9f9; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      <h1 style="color: #1a73e8; text-align: center; margin-bottom: 10px;">Rom Academy</h1>
      <h2 style="text-align: center; color: #333; margin-bottom: 30px;">Подтверждение email</h2>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">Здравствуйте, <strong>${name}</strong>!</p>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        Спасибо, что присоединились к Rom Academy! Чтобы активировать ваш аккаунт, пожалуйста, подтвердите адрес электронной почты.
      </p>
      <div style="text-align: center; margin: 40px 0;">
        <a href="${verifyLink}" style="display: inline-block; padding: 16px 36px; background: #1a73e8; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">
          Подтвердить email
        </a>
      </div>
      <p style="font-size: 14px; color: #888;">
        Эта ссылка действительна в течение <strong>24 часов</strong>. Если вы не запрашивали подтверждение, просто проигнорируйте это письмо.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;">
      <p style="font-size: 14px; color: #999; text-align: center;">
        Rom Academy | Поддержка: <a href="mailto:support@rom.ir" style="color: #1a73e8;">support@rom.ir</a>
      </p>
    </div>
  `;
}