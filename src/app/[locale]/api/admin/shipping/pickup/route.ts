// src/app/api/admin/shipping/pickups/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userRoles = session?.user?.roles as string[] | undefined;
  const hasAdminAccess = userRoles?.some((r) => ["ADMIN", "SUPERADMIN"].includes(r));

  if (!session || !hasAdminAccess) {
    return NextResponse.json({ error: "دسترسی ممنوع" }, { status: 403 });
  }

  try {
    const pickups = await prisma.pickupLocation.findMany({
      include: {
        city: { select: { id: true, name: true, province: { select: { name: true } } } },
        _count: { select: { methods: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ pickups });
  } catch (error) {
    console.error("[ADMIN PICKUPS LIST] خطا:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

 ;