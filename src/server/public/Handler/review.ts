// src/server/public/Handler/review.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { createReviewSchema, addReactionSchema } from "@/lib/validations/review";
import { faReviewMessages } from "@/lib/validations/review/messages";
import type { ReviewResult, ReactionResult } from "@/types/review";

export async function handleCreateReview(data: unknown, userId: string): Promise<ReviewResult> {
  const parsed = createReviewSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faReviewMessages.server_error };

  const { entityId, entityType, rating, comment, honeypot } = parsed.data;
  if (honeypot && honeypot.length > 0) return { success: true };

  const reviewData: any = {
    userId,
    rating,
    comment: comment || null,
  };

  if (entityType === "product") reviewData.productId = entityId;
  if (entityType === "course") reviewData.courseId = entityId;
  if (entityType === "post") reviewData.postId = entityId;

  await prisma.review.create({ data: reviewData });

  return { success: true, message: "نظر با موفقیت ثبت شد" };
}

export async function handleAddReaction(data: unknown, userId: string): Promise<ReviewResult & { reactions?: ReactionResult["reactions"]; userReaction?: string }> {
  const parsed = addReactionSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faReviewMessages.server_error };

  const { reviewId, type, honeypot } = parsed.data;
  if (honeypot && honeypot.length > 0) return { success: true };

  // حذف واکنش قبلی
  await prisma.reviewReaction.deleteMany({
    where: { reviewId, userId },
  });

  let userReaction = null;
  if (type !== "DISLIKE") {
    await prisma.reviewReaction.create({
      data: { reviewId, userId, type },
    });
    userReaction = type;
  }

  // محاسبه دوباره
  const reactions = await prisma.reviewReaction.groupBy({
    by: ["type"],
    where: { reviewId },
    _count: { type: true },
  });

  const formatted = reactions.map(r => ({
    type: r.type,
    count: r._count.type,
  }));

  return { success: true, reactions: formatted, userReaction };
}