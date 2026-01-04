// src/app/api/instructor/earnings/withdrawal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleRequestWithdrawal } from "@/server/public/Handler/instructorEarnings";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const result = await handleRequestWithdrawal(body, session.user.id);

  return NextResponse.json(result);
}