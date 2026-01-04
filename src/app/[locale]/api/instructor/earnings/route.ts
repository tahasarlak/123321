// src/app/api/instructor/earnings/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleGetEarnings } from "@/server/public/Handler/instructorEarnings";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await handleGetEarnings(session.user.id);

  return NextResponse.json(result);
}