// src/app/api/instructor/courses/[id]/students/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleGetStudents } from "@/server/public/Handler/instructorStudents";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const exportCSV = searchParams.get("export") === "csv";

  const result = await handleGetStudents(params.id, session.user.id, exportCSV);

  if (exportCSV && result.success && result.csv) {
    return new Response(result.csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=students.csv",
      },
    });
  }

  return NextResponse.json(result);
}