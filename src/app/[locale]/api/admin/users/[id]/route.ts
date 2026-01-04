// src/app/[locale]/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { handleUpdateUser } from "@/server/public/Handler/adminUsers";
import { ipRateLimit } from "@/lib/redis/rate-limit";
import { headers } from "next/headers";

const SUCCESS_MESSAGE_GET = "اطلاعات کاربر با موفقیت بارگذاری شد.";
const SUCCESS_MESSAGE_PATCH = "تغییرات با موفقیت اعمال شد.";

const fakeDelay = () =>
  new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 300) + 200));

const uniformSuccessResponse = async (data: object = {}, status: number = 200) => {
  await fakeDelay();
  return NextResponse.json({ message: "درخواست با موفقیت پردازش شد.", ...data }, { status });
};

function maskEmail(email: string, isSuperAdmin: boolean): string {
  if (isSuperAdmin) return email;
  if (!email.includes("@")) return email;
  const [local, domain] = email.split("@");
  if (local.length <= 3) return email;
  return `${local.slice(0, 3)}***@${domain}`;
}

function maskPhone(phone: string | null, isSuperAdmin: boolean): string | null {
  if (isSuperAdmin) return phone;
  if (!phone || phone.length < 8) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const headersList = await headers();
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip")?.trim() ||
      headersList.get("cf-connecting-ip")?.trim() ||
      headersList.get("x-vercel-forwarded-for")?.trim() ||
      "unknown";

    const { success: rateLimitSuccess } = await ipRateLimit.limit(ip);
    if (!rateLimitSuccess) {
      return await uniformSuccessResponse({ user: null });
    }

    const session = await getServerSession(authOptions);
    const userRoles = (session?.user?.roles as string[]) || [];
    const isSuperAdmin = userRoles.includes("SUPERADMIN");
    const isAdmin = userRoles.includes("ADMIN") || isSuperAdmin;

    if (!session?.user?.id || !isAdmin) {
      return await uniformSuccessResponse({ user: null });
    }

    const { id: targetUserId } = await context.params;

    // لاگ درست — داخل تابع GET
    console.log("🔍 Requested user ID:", targetUserId);

    if (!targetUserId || targetUserId.length < 10) {
      return await uniformSuccessResponse({ user: null });
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        studentId: true,
        entranceYear: true,
        city: true,
        isBanned: true,
        isEmailVerified: true,
        image: true,
        instagram: true,
        bio: true,
        isActive: true,
        universityId: true,
        majorId: true,
        university: {
          select: { name: true },
        },
        major: {
          select: { name: true },
        },
        roles: {
          select: { role: true },
        },
      },
    });

    if (!user) {
      console.log("❌ کاربر با این ID پیدا نشد:", targetUserId);
      return await uniformSuccessResponse({ user: null });
    }

    console.log("✅ کاربر پیدا شد:", user.name, user.email);

    const roles = user.roles.map(r => r.role);

    const formattedUser = {
      id: user.id,
      name: user.name || "نامشخص",
      email: maskEmail(user.email, isSuperAdmin),
      phone: maskPhone(user.phone, isSuperAdmin),
      universityName: user.university?.name ?? null,
      majorName: user.major?.name ?? null,
      studentId: user.studentId ?? null,
      entranceYear: user.entranceYear ?? null,
      city: user.city ?? null,
      isBanned: user.isBanned,
      isEmailVerified: user.isEmailVerified,
      roles,
      bio: user.bio ?? null,
      image: user.image ?? null,
      instagram: user.instagram ?? null,
      universityId: user.universityId ?? null,
      majorId: user.majorId ?? null,
      isActive: user.isActive ?? true,
      shortBio: null,
      website: null,
      twitter: null,
      linkedin: null,
      degree: null,
      academicRank: null,
    };

    return NextResponse.json({
      message: SUCCESS_MESSAGE_GET,
      user: formattedUser,
    });
  } catch (err) {
    console.error("[ADMIN USER DETAIL] خطای غیرمنتظره:", err);
    return await uniformSuccessResponse({ user: null });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const headersList = await headers();
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip")?.trim() ||
      headersList.get("cf-connecting-ip")?.trim() ||
      headersList.get("x-vercel-forwarded-for")?.trim() ||
      "unknown";

    const { success: rateLimitSuccess } = await ipRateLimit.limit(ip);
    if (!rateLimitSuccess) {
      return await uniformSuccessResponse();
    }

    const session = await getServerSession(authOptions);
    const userRoles = (session?.user?.roles as string[]) || [];
    const isAdmin = userRoles.includes("ADMIN") || userRoles.includes("SUPERADMIN");

    if (!session?.user?.id || !isAdmin) {
      return await uniformSuccessResponse();
    }

    const adminId = session.user.id;
    const { id: targetUserId } = await context.params;

    console.log("✏️ PATCH request for user ID:", targetUserId, "by admin:", adminId);

    if (!targetUserId || targetUserId.length < 10 || targetUserId === adminId) {
      return await uniformSuccessResponse();
    }

    const body = await req.json();
    await handleUpdateUser(body, adminId, targetUserId);

    return NextResponse.json({ message: SUCCESS_MESSAGE_PATCH });
  } catch (err) {
    console.error("[ADMIN UPDATE USER] خطای غیرمنتظره:", err);
    return await uniformSuccessResponse();
  }
}