// src/validations/like/index.ts
import { z } from "zod";
import { faLikeMessages } from "./messages";

export const likeSchema = z.object({
  productId: z.string().optional(),
  courseId: z.string().optional(),
  action: z.enum(["like", "unlike"]),
  honeypot: z.string().optional(),
}).refine((data) => (data.productId && !data.courseId) || (!data.productId && data.courseId), {
  message: faLikeMessages.entity_required,
  path: ["productId"],
});