// src/app/api/admin/shipping/methods/route.ts
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
    const methods = await prisma.shippingMethod.findMany({
      include: {
        zone: { select: { id: true, name: true } },
        pickup: { select: { id: true, title: true } },
        _count: { select: { products: true } },
      },
      orderBy: { priority: "asc" },
    });

    return NextResponse.json({ methods });
  } catch (error) {
    console.error("[ADMIN METHODS LIST] خطا:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

 ;