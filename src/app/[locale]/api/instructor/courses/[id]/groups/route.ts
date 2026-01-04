// src/app/api/instructor/courses/[id]/groups/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const groups = await prisma.courseGroup.findMany({
    where: { courseId: params.id },
    select: {
      id: true,
      title: true,
      enrolled: true,
      capacity: true,
    },
  });

  return NextResponse.json({ groups });
}