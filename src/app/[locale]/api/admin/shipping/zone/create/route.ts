// src/app/api/admin/shipping/zones/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleCreateZone } from "@/server/public/Handler/adminShipping";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const result = await handleCreateZone(body, session.user.id);

    if (result.success) {
      return NextResponse.json({ success: true, message: result.message, item: result.item });
    }

    return NextResponse.json({ error: result.error }, { status: 400 });
  } catch (error) {
    console.error("[ADMIN ZONE CREATE] خطا:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}