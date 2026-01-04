// src/app/api/admin/roles/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleDeleteRole } from "@/server/public/Handler/adminRoles";

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userRoles = session?.user?.roles as string[] | undefined;
  const hasAdminAccess = userRoles?.some((r) => ["ADMIN", "SUPERADMIN"].includes(r));

  if (!session || !hasAdminAccess) {
    return NextResponse.json({ error: "دسترسی ممنوع" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const result = await handleDeleteRole(body, session.user.id);

    return NextResponse.json(
      result.success ? { message: result.message } : { error: result.error },
      { status: result.success ? 200 : 400 }
    );
  } catch (error) {
    console.error("[ADMIN ROLE DELETE] خطا:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}