// src/app/api/instructor/courses/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleEditInstructorCourse } from "@/server/public/Handler/instructorCourses";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  body.id = params.id;

  const result = await handleEditInstructorCourse(body, session.user.id);

  return NextResponse.json(result);
}