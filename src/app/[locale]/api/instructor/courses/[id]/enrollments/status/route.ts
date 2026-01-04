// src/app/api/instructor/enrollments/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleChangeEnrollmentStatus } from "@/server/public/Handler/instructorEnrollments";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const result = await handleChangeEnrollmentStatus(body, session.user.id);

  return NextResponse.json(result);
}