export default function registerTemplate({ name }: { name: string }) {
  return `
    <div dir="ltr" style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; background: #f9f9f9; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      <h1 style="color: #1a73e8; text-align: center; margin-bottom: 10px;">Rom Academy</h1>
      <h2 style="text-align: center; color: #333; margin-bottom: 30px;">Добро пожаловать!</h2>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">Привет, <strong>${name}</strong>!</p>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        Поздравляем! Ваша учётная запись успешно создана в Rom Academy 🎉
      </p>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        Теперь вы можете войти и получить доступ ко всем курсам.
      </p>
      <div style="text-align: center; margin: 40px 0;">
        <a href="${process.env.NEXT_PUBLIC_BASE_URL}/auth" style="display: inline-block; padding: 16px 36px; background: #1a73e8; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">
          Войти в аккаунт
        </a>
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;">
      <p style="font-size: 14px; color: #999; text-align: center;">
        Rom Academy | Поддержка: <a href="mailto:support@rom.ir" style="color: #1a73e8;">support@rom.ir</a>
      </p>
    </div>
  `;
}