// src/app/api/admin/shipping/zones/route.ts
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
    const zones = await prisma.shippingZone.findMany({
      include: {
        countries: { select: { id: true, name: true } },
        _count: { select: { methods: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = zones.map(z => ({
      id: z.id,
      name: z.name,
      isActive: z.isActive,
      countryCount: z.countries.length,
      methodCount: z._count.methods,
      countries: z.countries,
    }));

    return NextResponse.json({ zones: formatted });
  } catch (error) {
    console.error("[ADMIN ZONES LIST] خطا:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

 ;