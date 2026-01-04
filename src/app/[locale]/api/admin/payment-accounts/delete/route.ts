// src/app/api/admin/payment-accounts/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  // چک دسترسی: فقط ADMIN یا SUPERADMIN
  const userRoles = session?.user?.roles as string[] | undefined;

  if (
    !session ||
    !userRoles ||
    !userRoles.some((role) => ["ADMIN", "SUPERADMIN"].includes(role))
  ) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const id = formData.get("id")?.toString();

    if (!id) {
      return NextResponse.json({ error: "شناسه حساب الزامی است" }, { status: 400 });
    }

    // چک کردن وجود حساب
    const account = await prisma.paymentAccount.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!account) {
      return NextResponse.json({ error: "حساب پرداخت یافت نشد" }, { status: 404 });
    }

    // حذف حساب
    await prisma.paymentAccount.delete({
      where: { id },
    });

    revalidatePath("/admin/payment-accounts");

    return NextResponse.json({
      success: true,
      message: "حساب پرداخت با موفقیت حذف شد",
    });
  } catch (error) {
    console.error("خطا در حذف حساب پرداخت:", error);
    return NextResponse.json({ error: "خطای سرور هنگام حذف حساب" }, { status: 500 });
  }
}
