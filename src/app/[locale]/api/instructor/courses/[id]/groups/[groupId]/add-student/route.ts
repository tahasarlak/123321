// src/app/api/instructor/groups/[groupId]/add-student/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleAddStudentToGroup } from "@/server/public/Handler/instructorGroups";

export async function POST(req: NextRequest, { params }: { params: { groupId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  body.groupId = params.groupId;

  const result = await handleAddStudentToGroup(body, session.user.id);

  return NextResponse.json(result);
}