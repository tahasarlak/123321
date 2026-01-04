// src/app/api/instructor/sessions/[sessionId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleEditSession, handleDeleteSession } from "@/server/public/Handler/instructorSessions";

export async function PATCH(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  body.id = params.sessionId;

  const result = await handleEditSession(body, session.user.id);

  return NextResponse.json(result);
}

export async function DELETE(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await handleDeleteSession(params.sessionId, session.user.id);

  return NextResponse.json(result);
}