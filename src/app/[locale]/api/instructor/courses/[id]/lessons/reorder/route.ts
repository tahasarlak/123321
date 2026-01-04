// src/app/api/instructor/courses/[id]/lessons/reorder/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleReorderLessons } from "@/server/public/Handler/instructorLessons";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  body.courseId = params.id;

  const result = await handleReorderLessons(body, session.user.id);

  return NextResponse.json(result);
}