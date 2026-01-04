// src/validations/auth/getMessage.ts
import { authMessages, type Locale, type AuthMessageKey } from "./messages";
import { getLocale } from "next-intl/server"; // یا از useLocale در کلاینت

// فقط در سرور (Server Components یا Route Handlers)
export async function getAuthMessage(key: AuthMessageKey): Promise<string> {
  const locale = (await getLocale()) as Locale;
  return authMessages[locale]?.[key] ?? authMessages.fa[key]; // fallback به فارسی
}
