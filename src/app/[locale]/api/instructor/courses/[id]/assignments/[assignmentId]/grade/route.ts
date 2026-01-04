// src/app/api/instructor/assignments/[assignmentId]/grade/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleGradeSubmission } from "@/server/public/Handler/instructorAssignments";

export async function POST(req: NextRequest, { params }: { params: { assignmentId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  body.submissionId = params.assignmentId;

  const result = await handleGradeSubmission(body, session.user.id);

  return NextResponse.json(result);
}