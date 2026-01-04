// src/app/api/admin/shipping/zones/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleDeleteZone } from "@/server/public/Handler/adminShipping";

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "شناسه الزامی است" }, { status: 400 });

    const result = await handleDeleteZone(id, session.user.id);

    if (result.success) {
      return NextResponse.json({ success: true, message: result.message });
    }

    return NextResponse.json({ error: result.error }, { status: 400 });
  } catch (error) {
    console.error("[ADMIN ZONE DELETE] خطا:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}