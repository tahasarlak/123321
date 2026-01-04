// src/app/api/admin/majors/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const majors = await prisma.major.findMany({
      select: {
        id: true,
        name: true,
        universityId: true, // اختیاری، اما خوبه داشته باشه
      },
      orderBy: {
        name: "asc",
      },
    });

    // اگر هیچ رشته‌ای نبود، داده فیک برگردون
    if (majors.length === 0) {
      return NextResponse.json([
        { id: "1", name: "مهندسی کامپیوتر" },
        { id: "2", name: "مهندسی برق" },
        { id: "3", name: "پزشکی" },
        { id: "4", name: "حقوق" },
        { id: "5", name: "معماری" },
      ]);
    }

    return NextResponse.json(majors);
  } catch (error) {
    console.error("Error fetching majors:", error);
    return NextResponse.json([
      { id: "temp-1", name: "مهندسی کامپیوتر" },
      { id: "temp-2", name: "پزشکی" },
    ]);
  }
}