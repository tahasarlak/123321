// src/app/api/admin/payment-accounts/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRoles = session.user.roles as string[] | undefined;
  const userId = session.user.id as string;

  // چک دسترسی: ADMIN, SUPERADMIN یا INSTRUCTOR
  const hasAccess = userRoles?.some((role) =>
    ["ADMIN", "SUPERADMIN", "INSTRUCTOR"].includes(role)
  );

  if (!hasAccess) {
    return NextResponse.json({ error: "دسترسی ممنوع" }, { status: 403 });
  }

  const isInstructor = userRoles?.includes("INSTRUCTOR");

  try {
    const accounts = await prisma.paymentAccount.findMany({
      where: isInstructor
        ? {
            ownerType: "INSTRUCTOR",
            instructor: { roles: { some: { userId, role: "INSTRUCTOR" } } },
          }
        : {}, // ادمین همه رو می‌بینه
      include: {
        country: { select: { name: true, flagEmoji: true, currency: true } },
        instructor: { select: { name: true, email: true, image: true } },
      },
      orderBy: { priority: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: accounts,
      count: accounts.length,
    });
  } catch (error) {
    console.error("خطا در دریافت حساب‌های پرداخت:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

