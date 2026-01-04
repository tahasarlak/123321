// src/actions/public/cart.ts
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleAddToCart, handleUpdateCartItem } from "@/server/public/Handler/cart";
import { revalidatePath } from "next/cache";

export async function addToCartAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const data = Object.fromEntries(formData);
  const result = await handleAddToCart(data, session.user.id);

  if (result.success) revalidatePath("/api/cart");

  return result;
}

export async function updateCartAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const data = Object.fromEntries(formData);
  const result = await handleUpdateCartItem(data, session.user.id);

  if (result.success) revalidatePath("/api/cart");

  return result;
}