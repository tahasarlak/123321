// src/app/api/admin/instructors/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleCreateInstructor } from "@/server/public/Handler/adminInstructors";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();

    // تبدیل formData به object ساده + نگه داشتن File برای image
    const data: Record<string, any> = {};
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }

    const result = await handleCreateInstructor(data, session.user.id);

    if (result.success) {
      return NextResponse.redirect(new URL("/admin/instructors?success=created", req.url));
    }

    return NextResponse.json({ error: result.error }, { status: 400 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "ایمیل یا شماره تلفن تکراری است" }, { status: 400 });
    }
    console.error("[ADMIN INSTRUCTOR CREATE] خطا:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}