// src/app/api/cart/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { handleAddToCart, handleUpdateCartItem } from "@/server/public/Handler/cart";

const CART_SELECT = {
  items: {
    select: {
      id: true,
      productId: true,
      courseId: true,
      quantity: true,
      product: {
        select: { title: true, image: true, price: true, stock: true },
      },
      course: {
        select: { title: true, image: true, price: true },
      },
    },
  },
} as const;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ count: 0, items: [] });
  }

  try {
    const cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
      select: CART_SELECT,
    });

    const items = cart?.items ?? [];
    const count = items.reduce((sum, i) => sum + i.quantity, 0);

    return NextResponse.json({ count, items });
  } catch (error) {
    console.error("[CART GET] خطا:", error);
    return NextResponse.json({ count: 0, items: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const result = await handleAddToCart(body, session.user.id);

    if (result.success) {
      revalidatePath("/api/cart");
      return NextResponse.json({ success: true, message: result.message });
    }

    return NextResponse.json({ error: result.error }, { status: 400 });
  } catch (error) {
    console.error("[CART POST] خطا:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const result = await handleUpdateCartItem(body, session.user.id);

    if (result.success) {
      revalidatePath("/api/cart");
      return NextResponse.json({ success: true, message: result.message });
    }

    return NextResponse.json({ error: result.error }, { status: 400 });
  } catch (error) {
    console.error("[CART PUT] خطا:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { productId, courseId } = body;

    const cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
      include: { items: true },
    });

    if (!cart) return NextResponse.json({ success: true });

    const item = cart.items.find((i) => i.productId === productId || i.courseId === courseId);
    if (!item) return NextResponse.json({ success: true });

    if (item.quantity > 1) {
      await prisma.cartItem.update({
        where: { id: item.id },
        data: { quantity: { decrement: 1 } },
      });
    } else {
      await prisma.cartItem.delete({ where: { id: item.id } });
    }

    revalidatePath("/api/cart");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CART DELETE] خطا:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}