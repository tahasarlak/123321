// src/server/public/Handler/cart.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { addCartSchema, updateCartItemSchema } from "@/lib/validations/cart";
import { faCartMessages } from "@/lib/validations/cart/messages";
import type { CartResult } from "@/types/cart";

export async function handleAddToCart(
  data: unknown,
  userId: string
): Promise<CartResult> {
  const parsed = addCartSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faCartMessages.server_error };

  const { productId, courseId, quantity, honeypot } = parsed.data;

  if (honeypot && honeypot.length > 0) return { success: true, message: "" };

  let cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) {
    cart = await prisma.cart.create({ data: { userId } });
  }

  const where = {
    cartId_productId_courseId: {
      cartId: cart.id,
      productId: productId || "",
      courseId: courseId || "",
    },
  };

  const existing = await prisma.cartItem.findUnique({ where });

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: productId || null,
        courseId: courseId || null,
        quantity,
      },
    });
  }

  return { success: true, message: "به سبد خرید اضافه شد" };
}

export async function handleUpdateCartItem(
  data: unknown,
  userId: string
): Promise<CartResult> {
  const parsed = updateCartItemSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faCartMessages.server_error };

  const { productId, courseId, quantity, honeypot } = parsed.data;
  if (honeypot && honeypot.length > 0) return { success: true, message: "" };

  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) return { success: false, error: faCartMessages.server_error };

  const where = {
    cartId_productId_courseId: {
      cartId: cart.id,
      productId: productId || "",
      courseId: courseId || "",
    },
  };

  const item = await prisma.cartItem.findUnique({ where });
  if (!item) return { success: false, error: "آیتم یافت نشد" };

  if (quantity === 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
    return { success: true, message: "آیتم حذف شد" };
  }

  await prisma.cartItem.update({
    where: { id: item.id },
    data: { quantity },
  });

  return { success: true, message: "تعداد به‌روزرسانی شد" };
}