// src/validations/bloggerPosts/index.ts
import { z } from "zod";
import { faBloggerPostsMessages } from "./messages";

export const createPostSchema = z.object({
  title: z.string().min(5, faBloggerPostsMessages.title_required),
  excerpt: z.string().optional(),
  content: z.string().min(100, faBloggerPostsMessages.content_required),
  thumbnail: z.string().optional(),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  published: z.boolean().default(false),
  honeypot: z.string().optional(),
});

export const editPostSchema = createPostSchema.partial().extend({
  id: z.string().min(1),
  slug: z.string().optional(), // اختیاری — اگر بخواد دستی تغییر بده
});