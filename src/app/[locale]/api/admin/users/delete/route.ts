// src/app/api/admin/users/delete/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleDeleteUser } from "@/server/public/Handler/adminUsers";
import { ipRateLimit } from "@/lib/redis/rate-limit";
import { headers } from "next/headers";

const SUCCESS_MESSAGE = "درخواست حذف کاربر با موفقیت پردازش شد.";

const fakeDelay = () =>
  new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 300) + 200));

const uniformSuccessResponse = async () => {
  await fakeDelay();
  return NextResponse.json({ message: SUCCESS_MESSAGE }, { status: 200 });
};

export async function DELETE(req: NextRequest) {
  try {
    // === دریافت IP به روش استاندارد ===
    const headersList = await headers();
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip")?.trim() ||
      headersList.get("cf-connecting-ip")?.trim() ||
      headersList.get("x-vercel-forwarded-for")?.trim() ||
      "unknown";

    // === Rate Limit ===
    const { success: rateLimitSuccess } = await ipRateLimit.limit(ip);
    if (!rateLimitSuccess) {
      return await uniformSuccessResponse();
    }

    // === چک جلسه و نقش ادمین ===
    const session = await getServerSession(authOptions);
    const userRoles = (session?.user?.roles as string[]) || [];

    const isAdmin = userRoles.includes("ADMIN") || userRoles.includes("SUPERADMIN");

    if (!session?.user?.id || !isAdmin) {
      return await uniformSuccessResponse();
    }

    const adminId = session.user.id;

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("id");

    // === ولیدیشن id ===
    if (!targetUserId || typeof targetUserId !== "string" || targetUserId.length < 10) {
      return await uniformSuccessResponse();
    }

    // === جلوگیری از حذف خود ===
    if (targetUserId === adminId) {
      return await uniformSuccessResponse();
    }

    // === اجرای حذف در handler (با لاگ‌گیری و چک‌های اضافی) ===
    await handleDeleteUser(adminId, targetUserId);

    return await uniformSuccessResponse();
  } catch (err) {
    console.error("[ADMIN DELETE USER] خطای غیرمنتظره:", err);
    return await uniformSuccessResponse();
  }
}