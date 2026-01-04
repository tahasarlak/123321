// src/app/api/admin/users/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleCreateUser } from "@/server/public/Handler/adminUsers";
import { ipRateLimit } from "@/lib/redis/rate-limit";

const SUCCESS_MESSAGE = "کاربر با موفقیت ایجاد شد.";

const fakeDelay = () =>
  new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 300) + 200));

const uniformSuccessResponse = async (extraData?: object) => {
  await fakeDelay();
  return NextResponse.json(
    { message: SUCCESS_MESSAGE, ...(extraData || {}) },
    { status: 201 }
  );
};

export async function POST(req: NextRequest) {
  try {
    // === Rate Limit — جلوگیری از spam و abuse ===
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success: rateLimitSuccess } = await ipRateLimit.limit(ip);
    if (!rateLimitSuccess) {
      return await uniformSuccessResponse();
    }

    // === چک جلسه و نقش ادمین ===
    const session = await getServerSession(authOptions);

    const userRoles = session?.user?.roles as string[] | undefined;
    const hasAdminAccess = userRoles?.includes("ADMIN") || userRoles?.includes("SUPERADMIN");

    if (!session?.user?.id || !hasAdminAccess) {
      return await uniformSuccessResponse(); // حتی unauthorized هم پیام موفقیت!
    }

    const body = await req.json();

    // === اجرای handler ایجاد کاربر ===
    const result = await handleCreateUser(body, session.user.id);

    const safeUserData = result.success && result.user
      ? {
          id: result.user.id,
          name: result.user.name,
          email: maskEmail(result.user.email), // ماسک کردن
          phone: result.user.phone ? maskPhone(result.user.phone) : null,
          createdAt: result.user.createdAt,
          roles: result.user.roles,
        }
      : undefined;

    await fakeDelay();
    return NextResponse.json(
      { 
        message: SUCCESS_MESSAGE,
        user: safeUserData // فقط اطلاعات ضروری و ماسک‌شده
      },
      { status: 201 }
    );

  } catch (err: any) {
    console.error("[ADMIN CREATE USER] خطای غیرمنتظره:", err);

    // حتی در خطاهای دیتابیس (مثل P2002) هم پیام یکسان
    // هیچوقت جزئیات خطا رو لو نده
    return await uniformSuccessResponse();
  }
}

// توابع کمکی ماسک کردن
function maskEmail(email: string): string {
  if (!email.includes("@")) return email;
  const [local, domain] = email.split("@");
  const maskedLocal = local.length <= 3 ? local : local.slice(0, 3) + "***";
  return `${maskedLocal}@${domain}`;
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 8) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}