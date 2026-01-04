// src/validations/review/index.ts
import { z } from "zod";
import { faReviewMessages } from "./messages";

export const createReviewSchema = z.object({
  entityId: z.string().min(1),
  entityType: z.enum(["product", "course", "post"], { message: faReviewMessages.entity_type_invalid }),
  rating: z.number().int().min(1).max(5, faReviewMessages.rating_invalid),
  comment: z.string().optional(),
  honeypot: z.string().optional(),
});

export const addReactionSchema = z.object({
  reviewId: z.string().min(1),
  type: z.enum(["LIKE", "DISLIKE", "LOVE", "LAUGH", "WOW", "SAD", "ANGRY"]),
  honeypot: z.string().optional(),
});