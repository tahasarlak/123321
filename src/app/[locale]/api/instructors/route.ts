// src/app/api/instructors/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "12", 10);
  const search = searchParams.get("search")?.trim() || "";

  const where: any = {
    roles: { some: { role: "INSTRUCTOR" } },
    isActive: true,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { bio: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const [instructors, total] = await Promise.all([
      prisma.user.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          image: true,
          bio: true,
          instagram: true,
          taughtCourses: { select: { id: true, title: true, image: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({ instructors, total });
  } catch (error) {
    console.error("[INSTRUCTORS LIST] خطا:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}