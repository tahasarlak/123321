// src/app/api/instructor/courses/[id]/files/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleUploadFileToCourse } from "@/server/public/Handler/instructorFiles";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  formData.append("courseId", params.id);

  const data = Object.fromEntries(formData);
  const result = await handleUploadFileToCourse(data, session.user.id);

  return NextResponse.json(result);
}