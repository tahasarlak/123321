export default function resetSuccessTemplate({ name, loginLink }: { name: string; loginLink: string }) {
  return `
    <div dir="ltr" style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; background: #f9f9f9; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      <h1 style="color: #1a73e8; text-align: center; margin-bottom: 10px;">Rom Academy</h1>
      <h2 style="text-align: center; color: #333; margin-bottom: 30px;">Password Changed</h2>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">Hello <strong>${name}</strong>,</p>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        Your password has been successfully changed.
      </p>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        You can now log in with your new password.
      </p>
      <div style="text-align: center; margin: 40px 0;">
        <a href="${loginLink}" style="display: inline-block; padding: 16px 36px; background: #1a73e8; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">
          Log In
        </a>
      </div>
      <p style="font-size: 14px; color: #d32f2f;">
        <strong>Warning:</strong> If you didn't make this change, contact support immediately.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;">
      <p style="font-size: 14px; color: #999; text-align: center;">
        Rom Academy | Support: <a href="mailto:support@rom.ir" style="color: #1a73e8;">support@rom.ir</a>
      </p>
    </div>
  `;
}