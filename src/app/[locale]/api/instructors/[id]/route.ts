// src/app/api/instructors/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const instructor = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        roles: true,
        taughtCourses: {
          select: { id: true, title: true, slug: true, image: true, price: true, enrolledCount: true },
        },
      },
    });

    if (!instructor || !instructor.roles.some(r => r.role === "INSTRUCTOR") || !instructor.isActive) {
      return NextResponse.json({ error: "مدرس یافت نشد" }, { status: 404 });
    }

    return NextResponse.json(instructor);
  } catch (error) {
    console.error("[INSTRUCTOR DETAIL] خطا:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}