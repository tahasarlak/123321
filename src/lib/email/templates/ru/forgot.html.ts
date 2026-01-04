export default function forgotTemplate({ name, resetLink }: { name: string; resetLink: string }) {
  return `
    <div dir="ltr" style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; background: #f9f9f9; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      <h1 style="color: #1a73e8; text-align: center; margin-bottom: 10px;">Rom Academy</h1>
      <h2 style="text-align: center; color: #333; margin-bottom: 30px;">Сброс пароля</h2>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">Здравствуйте, <strong>${name}</strong>!</p>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        Мы получили запрос на сброс пароля для вашего аккаунта.
      </p>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        Нажмите на кнопку ниже, чтобы установить новый пароль:
      </p>
      <div style="text-align: center; margin: 40px 0;">
        <a href="${resetLink}" style="display: inline-block; padding: 16px 36px; background: #1a73e8; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">
          Сбросить пароль
        </a>
      </div>
      <p style="font-size: 14px; color: #888;">
        Эта ссылка действительна в течение <strong>1 часа</strong>.<br>
        Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;">
      <p style="font-size: 14px; color: #999; text-align: center;">
        Rom Academy | Поддержка: <a href="mailto:support@rom.ir" style="color: #1a73e8;">support@rom.ir</a>
      </p>
    </div>
  `;
}