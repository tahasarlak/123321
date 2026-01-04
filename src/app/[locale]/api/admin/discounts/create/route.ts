// src/app/api/admin/discounts/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleCreateDiscount } from "@/server/public/Handler/adminDiscounts";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const data = Object.fromEntries(formData);
    const result = await handleCreateDiscount(data, session.user.id);

    if (result.success) {
      return NextResponse.json({ success: true, message: result.message, discount: result.discount });
    }

    return NextResponse.json({ error: result.error }, { status: 400 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "کد تخفیف تکراری است" }, { status: 409 });
    }
    console.error("[ADMIN DISCOUNT CREATE] خطا:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
