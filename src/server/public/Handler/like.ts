// src/server/public/Handler/like.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { likeSchema } from "@/lib/validations/like";
import { faLikeMessages } from "@/lib/validations/like/messages";
import type { LikeResult } from "@/types/like";

export async function handleToggleLike(data: unknown, userId: string): Promise<LikeResult> {
  const parsed = likeSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faLikeMessages.server_error };

  const { productId, courseId, action, honeypot } = parsed.data;
  if (honeypot && honeypot.length > 0) return { success: true };

  if (action === "like") {
    await prisma.like.upsert({
      where: productId
        ? { userId_productId: { userId, productId } }
        : { userId_courseId: { userId, courseId: courseId! } },
      update: {},
      create: {
        userId,
        productId: productId ?? null,
        courseId: courseId ?? null,
      },
    });
  } else {
    await prisma.like.deleteMany({
      where: {
        userId,
        ...(productId ? { productId } : { courseId }),
      },
    });
  }

  return { success: true, message: action === "like" ? "لایک شد" : "لایک حذف شد" };
}