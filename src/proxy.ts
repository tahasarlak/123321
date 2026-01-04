// src/proxy.ts (یا middleware.ts)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import createIntlMiddleware from "next-intl/middleware";
import { ipRateLimit } from "@/lib/redis/rate-limit";

const intlMiddleware = createIntlMiddleware({
  locales: ["fa", "en", "ru"],
  defaultLocale: "fa",
  localePrefix: "as-needed",
  localeDetection: true,
});

// مسیرهایی که rate limit می‌شن (حساس به اسپم و brute-force)
const rateLimitedPaths = [
  "/api/auth/register",
  "/api/auth/forgot",
  "/api/auth/reset-password", // ← اضافه شد — مهم!
];

// مسیرهای حفاظت‌شده بر اساس نقش
const protectedPaths = {
  user: ["/dashboard", "/profile", "/orders", "/my-courses", "/cart", "/wishlist"],
  instructor: ["/instructor"],
  blogger: ["/blogger"],
  admin: ["/admin", "/dashboard/admin"], // ← تغییر: همه زیرمسیرهای /dashboard/admin حفاظت می‌شن
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ۱. مسیرهای داخلی NextAuth که نباید rate limit بشن
  if (pathname.startsWith("/api/auth/") && !rateLimitedPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // ۲. Rate Limiting فقط برای مسیرهای حساس
  if (rateLimitedPaths.includes(pathname)) {
    const ip = getClientIp(request);
    const { success, reset } = await ipRateLimit.limit(ip);
    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      return new NextResponse(
        JSON.stringify({
          message: "تعداد درخواست‌ها زیاد است. لطفاً ۱۵ دقیقه دیگر تلاش کنید.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
          },
        }
      );
    }
  }

  // ۳. استخراج توکن و نقش‌ها
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const roles = (token?.roles as string[]) || [];

  // ۴. حفاظت نقش‌محور
  // ادمین (شامل همه زیرمسیرهای /dashboard/admin)
  if (protectedPaths.admin.some((path) => pathname.startsWith(path))) {
    if (!token?.id || !roles.some((r) => ["ADMIN", "SUPERADMIN"].includes(r))) {
      return handleUnauthorized(request, token);
    }
  }

  // مدرس
  if (protectedPaths.instructor.some((path) => pathname.startsWith(path))) {
    if (!token?.id || !roles.includes("INSTRUCTOR")) {
      return handleUnauthorized(request, token);
    }
  }

  // بلاگر
  if (protectedPaths.blogger.some((path) => pathname.startsWith(path))) {
    if (!token?.id || !roles.includes("BLOGGER")) {
      return handleUnauthorized(request, token);
    }
  }

  // کاربر عادی
  if (protectedPaths.user.some((path) => pathname.startsWith(path))) {
    if (!token?.id) {
      return redirectToLogin(request);
    }
  }

  // ۵. intl middleware فقط برای صفحات UI (نه API و فایل‌ها)
  if (
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/_next") &&
    !pathname.includes(".")
  ) {
    const response = intlMiddleware(request);
    if (response) return response;
  }

  return NextResponse.next();
}

// توابع کمکی
function redirectToLogin(request: NextRequest) {
  const url = new URL("/auth/login", request.url);
  url.searchParams.set("callbackUrl", request.url);
  return NextResponse.redirect(url);
}

function handleUnauthorized(request: NextRequest, token: any) {
  if (!token?.id) {
    return redirectToLogin(request);
  }
  // کاربر لاگین‌شده ولی دسترسی نداره
  return NextResponse.redirect(new URL("/403", request.url));
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-vercel-forwarded-for")?.trim() ||
    request.headers.get("true-client-ip")?.trim() ||
    "127.0.0.1"
  );
}

// matcher بهینه برای Next.js 15/16 (به‌روزرسانی شده برای پوشش /dashboard/admin)
export const config = {
  matcher: [
    // همه صفحات به جز فایل‌های استاتیک و _next
    "/((?!_next/static|_next/image|favicon.ico|monitoring|uploads|.*\\..*).*)",
    // مسیرهای حفاظت‌شده
    "/dashboard/:path*",
    "/profile/:path*",
    "/orders/:path*",
    "/my-courses/:path*",
    "/cart/:path*",
    "/wishlist/:path*",
    "/instructor/:path*",
    "/blogger/:path*",
    "/admin/:path*", // ← به‌روزرسانی: پوشش همه /admin/*
    "/dashboard/admin/:path*", // ← اضافه: پوشش همه /dashboard/admin/*
    // rate limit فقط این سه API
    "/api/auth/register",
    "/api/auth/forgot",
    "/api/auth/reset-password",
  ],
};