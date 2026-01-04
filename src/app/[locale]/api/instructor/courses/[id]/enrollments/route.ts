// src/app/api/instructor/courses/[id]/enrollments/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleGetEnrollments } from "@/server/public/Handler/instructorEnrollments";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await handleGetEnrollments(params.id, session.user.id);

  return NextResponse.json(result);
}