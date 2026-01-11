// src/i18n/request.ts
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";

// تمام localeهای پشتیبانی‌شده
const locales = ["fa", "en", "ru"] as const;

// تمام namespaceهای پروژه (هماهنگ با messages/)
const namespaces = [
  "common",
  "header",
  "footer",
  "supportChat",
  "auth",
  "home",
  "product",
  "profile",
  "instructor",
  "support",
  "liveClasses",
  "cart",
  "shipping",
  "blog",
  "contact",
  "about",
  "careers",
  "admin",
  "dashboard",
  "branding",
  "users",
] as const;

type Locale = (typeof locales)[number];
type Namespace = (typeof namespaces)[number];

export default getRequestConfig(async ({ locale: rawLocale }) => {
  // اعتبارسنجی locale
  const locale = locales.includes(rawLocale as any) ? (rawLocale as Locale) : "fa";

  if (!locales.includes(locale as any)) {
    notFound();
  }

  const messages: Partial<Record<Namespace, any>> = {};

  // بارگذاری تمام namespaceها با fallback هوشمند
  for (const ns of namespaces) {
    try {
      const module = await import(`../messages/${locale}/${ns}.json`);
      messages[ns] = module.default || {};
    } catch {
      // اگر فایل برای locale فعلی وجود نداشت، fallback به fa
      if (locale !== "fa") {
        try {
          const fallback = await import(`../messages/fa/${ns}.json`);
          messages[ns] = fallback.default || {};
        } catch {
          messages[ns] = {};
        }
      } else {
        messages[ns] = {};
      }
    }
  }

  return {
    locale,
    messages,
  };
});