// src/app/api/instructor/courses/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleGetInstructorCourses } from "@/server/public/Handler/instructorCourses";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await handleGetInstructorCourses(session.user.id);

  return NextResponse.json(result);
}