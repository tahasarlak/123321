// proxy.ts  ← در ریشه پروژه، کنار package.json
import { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  // لیست زبان‌های پشتیبانی شده
  locales: ['en', 'fa'],

  // زبان پیش‌فرض
  defaultLocale: 'fa',

  // اگر بخوای /fa رو هم نشون نده (مثل / → fa و /en → en)
  // localePrefix: 'as-needed',

  // اگر می‌خوای همیشه پیشوند داشته باشه (مثل همیشه /fa و /en)
  localePrefix: 'always',
});

export const config = {
  // این خط خیلی مهمه! بدون این کار نمی‌کنه
  matcher: [
    // همه مسیرها به جز api, _next, favicon و فایل‌های استاتیک
    '/((?!api|_next|favicon.ico|.*\\.).*)',
  ],
};