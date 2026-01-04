// src/app/api/like/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleToggleLike } from "@/server/public/Handler/like";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const result = await handleToggleLike(body, session.user.id);

    return NextResponse.json(
      result.success ? { message: result.message } : { error: result.error },
      { status: result.success ? 200 : 400 }
    );
  } catch (error) {
    console.error("[API LIKE] خطا:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}