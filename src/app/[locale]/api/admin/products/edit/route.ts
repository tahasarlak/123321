// src/app/api/admin/products/edit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleEditProduct } from "@/server/public/Handler/adminProducts";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const data = Object.fromEntries(formData);
    const result = await handleEditProduct(data, session.user.id);

    if (result.success) {
      return NextResponse.redirect(new URL("/admin/products?success=1", req.url));
    }

    return NextResponse.json({ error: result.error }, { status: 400 });
  } catch (error) {
    console.error("[ADMIN PRODUCT EDIT] خطا:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

 ;