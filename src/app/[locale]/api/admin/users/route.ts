// src/app/api/admin/users/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { ipRateLimit } from "@/lib/redis/rate-limit";
import { headers } from "next/headers";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const MAX_SEARCH_LENGTH = 100;

export async function GET(req: NextRequest) {
  try {
    // === دریافت IP به روش استاندارد ===
    const headersList = await headers();
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip")?.trim() ||
      headersList.get("cf-connecting-ip")?.trim() ||
      headersList.get("x-vercel-forwarded-for")?.trim() ||
      "unknown";

    // === Rate Limit حتی برای ادمین ===
    const { success: rateLimitSuccess } = await ipRateLimit.limit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: "تعداد درخواست‌ها زیاد است. لطفاً کمی صبر کنید." },
        { status: 429 }
      );
    }

    // === چک دسترسی ادمین ===
    const session = await getServerSession(authOptions);
    const userRoles = (session?.user?.roles as string[]) || [];

    const isSuperAdmin = userRoles.includes("SUPERADMIN");
    const isAdmin = userRoles.includes("ADMIN") || isSuperAdmin;

    if (!session?.user?.id || !isAdmin) {
      return NextResponse.json({ error: "دسترسی ممنوع" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);

    // === پارامترهای pagination ===
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    let limit = parseInt(searchParams.get("limit") || `${DEFAULT_LIMIT}`, 10);
    limit = Math.min(MAX_LIMIT, Math.max(1, limit));

    // === جستجو ===
    const rawSearch = searchParams.get("search")?.trim() || "";
    const search = rawSearch.slice(0, MAX_SEARCH_LENGTH);

    // === فیلتر نقش ===
    const roleFilter = searchParams.get("role")?.trim().toUpperCase() || "";

    // === ساخت where ===
    const where: any = {
      deletedAt: null, // فقط کاربران فعال/حذف‌نشده
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    if (roleFilter && ["ADMIN", "SUPERADMIN", "USER", "INSTRUCTOR", "SELLER", "BLOGGER", "SUPPORT"].includes(roleFilter)) {
      where.roles = { some: { role: roleFilter } };
    }

    // === گرفتن داده‌ها ===
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isBanned: true,
          city: true,
          createdAt: true,
          isEmailVerified: true,
          academicStatus: true,
          roles: { select: { role: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // === فرمت کردن خروجی ===
    const formattedUsers = users.map((user) => {
      const roles = user.roles.map((r) => r.role);
      const primaryRole = roles[0] || "USER";

      // ماسک کردن — SUPERADMIN می‌تونه کامل ببینه
      const email = isSuperAdmin ? user.email : user.email ? maskEmail(user.email) : null;
      const phone = isSuperAdmin ? user.phone : user.phone ? maskPhone(user.phone) : null;

      return {
        id: user.id,
        name: user.name || "نامشخص",
        email,
        phone,
        isBanned: user.isBanned,
        city: user.city || "-",
        createdAt: user.createdAt,
        isEmailVerified: user.isEmailVerified,
        academicStatus: user.academicStatus,
        roles,
        rolesDisplay: roles.length > 0 ? roles.join("، ") : "کاربر عادی",
        primaryRole,
      };
    });

    return NextResponse.json({
      users: formattedUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[ADMIN USERS LIST] خطای غیرمنتظره:", err);
    return NextResponse.json(
      { error: "خطایی در دریافت اطلاعات رخ داد." },
      { status: 500 }
    );
  }
}

// توابع کمکی ماسک کردن
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain || local.length <= 3) return email;
  return `${local.slice(0, 3)}***@${domain}`;
}

function maskPhone(phone: string): string {
  if (!phone || phone.length <= 7) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}