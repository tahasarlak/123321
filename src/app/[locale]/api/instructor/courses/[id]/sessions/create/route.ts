// src/app/api/instructor/courses/[id]/sessions/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleCreateSession } from "@/server/public/Handler/instructorSessions";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  body.courseId = params.id;

  const result = await handleCreateSession(body, session.user.id);

  return NextResponse.json(result);
}