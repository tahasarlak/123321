// src/app/api/admin/products/toggle/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleToggleProduct } from "@/server/public/Handler/adminProducts";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const productId = formData.get("productId") as string;
    if (!productId) return NextResponse.json({ error: "شناسه محصول الزامی است" }, { status: 400 });

    const result = await handleToggleProduct(productId, session.user.id);

    if (result.success) {
      return NextResponse.redirect(new URL("/admin/products", req.url));
    }

    return NextResponse.json({ error: result.error }, { status: 400 });
  } catch (error) {
    console.error("[ADMIN PRODUCT TOGGLE] خطا:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}