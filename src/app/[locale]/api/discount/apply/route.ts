// src/app/api/discount/apply/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code, orderId } = await req.json();
  if (!code || !orderId) return NextResponse.json({ error: "کد و سفارش الزامی است" }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { id: orderId, userId: session.user.id },
  });
  if (!order || order.status !== "PENDING") return NextResponse.json({ error: "سفارش نامعتبر" }, { status: 400 });

  const discount = await prisma.discount.findUnique({
    where: { code, isActive: true },
    include: { products: true, categories: true },
  });

  if (!discount) return NextResponse.json({ error: "کد تخفیف نامعتبر" }, { status: 400 });

  // چک تاریخ، حداقل مبلغ، استفاده شده و ...
  // محاسبه تخفیف و return { discountAmount, finalAmount }

  return NextResponse.json({ success: true, discountAmount: 50000 });
}