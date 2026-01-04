// src/app/api/review/reaction/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleAddReaction } from "@/server/public/Handler/review";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const result = await handleAddReaction(body, session.user.id);

    if (result.success) {
      return NextResponse.json({ reactions: result.reactions, userReaction: result.userReaction });
    }

    return NextResponse.json({ error: result.error }, { status: 400 });
  } catch (error) {
    console.error("[API REVIEW REACTION] خطا:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}