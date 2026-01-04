// src/app/api/admin/finance/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleGetFinanceStats } from "@/server/public/Handler/adminFinance";


export async function GET() {
  const session = await getServerSession(authOptions);
  const userRoles = session?.user?.roles as string[] | undefined;
  const hasAdminAccess = userRoles?.some((r) => ["ADMIN", "SUPERADMIN"].includes(r));

  if (!session || !hasAdminAccess) {
    return NextResponse.json({ error: "دسترسی ممنوع" }, { status: 403 });
  }

  const result = await handleGetFinanceStats(session.user.id);

  if (result.success) {
    return NextResponse.json({ success: true, data: result.data });
  }

  return NextResponse.json({ error: result.error }, { status: 500 });
}