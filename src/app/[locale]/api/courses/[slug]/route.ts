// src/app/api/courses/[slug]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  const course = await prisma.course.findUnique({
    where: { slug: params.slug },
    include: {
      categories: true,
      tags: true,
      instructor: { select: { id: true, name: true, image: true, bio: true } },
      enrollments: userId ? { where: { userId } } : undefined,
    },
  });

  if (!course || course.status !== "PUBLISHED" || !course.isVisible) {
    return NextResponse.json({ error: "دوره یافت نشد" }, { status: 404 });
  }

  const formatted = {
    ...course,
    isEnrolled: !!course.enrollments?.length,
  };

  return NextResponse.json(formatted);
}