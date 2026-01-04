// src/app/api/admin/notifications/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleGetAdminNotifications } from "@/server/public/Handler/notification";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userRoles = session?.user?.roles as string[] | undefined;
  const hasAdminAccess = userRoles?.some((r) => ["ADMIN", "SUPERADMIN"].includes(r));

  if (!session || !hasAdminAccess) {
    return NextResponse.json({ error: "دسترسی ممنوع" }, { status: 403 });
  }

  const result = await handleGetAdminNotifications();

  return NextResponse.json(result);
}
