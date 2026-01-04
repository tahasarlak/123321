// src/app/api/courses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { handleGetPublicCourses } from "@/server/public/Handler/courses";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || undefined;
  const categoryId = searchParams.get("categoryId") || undefined;
  const instructorId = searchParams.get("instructorId") || undefined;

  const result = await handleGetPublicCourses(search, categoryId, instructorId);

  return NextResponse.json(result);
}