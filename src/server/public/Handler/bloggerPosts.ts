// src/server/public/Handler/bloggerPosts.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { createPostSchema, editPostSchema } from "@/lib/validations/bloggerPosts";
import { faBloggerPostsMessages } from "@/lib/validations/bloggerPosts/messages";
import type { PostResult } from "@/types/bloggerPosts";

async function isBloggerOrAdmin(userId: string, postId?: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { role: true } } },
  });
  if (user?.roles.some(r => ["ADMIN", "SUPERADMIN"].includes(r.role))) return true;

  if (!postId) return false;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });

  return post?.authorId === userId;
}

export async function handleCreatePost(data: unknown, userId: string): Promise<PostResult> {
  const parsed = createPostSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faBloggerPostsMessages.server_error };

  const { title, excerpt, content, thumbnail, categoryId, tagIds, published, honeypot } = parsed.data;
  if (honeypot && honeypot.length > 0) return { success: true };

  const baseSlug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  let slug = baseSlug;
  let counter = 1;
  while (await prisma.post.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  const post = await prisma.post.create({
    data: {
      title,
      slug,
      excerpt,
      content,
      thumbnail,
      published,
      authorId: userId,
      categoryId,
      tags: tagIds?.length ? { connect: tagIds.map(id => ({ id })) } : undefined,
    },
  });

  return { success: true, message: "پست با موفقیت ایجاد شد", post };
}

export async function handleEditPost(data: unknown, userId: string): Promise<PostResult> {
  const parsed = editPostSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faBloggerPostsMessages.server_error };

  const { id, title, ...updateData } = parsed.data;

  if (!(await isBloggerOrAdmin(userId, id))) return { success: false, error: faBloggerPostsMessages.not_owner };

  if (title) {
    const baseSlug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.post.findUnique({ where: { slug, NOT: { id } } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    updateData.slug = slug;
  }

  const post = await prisma.post.update({
    where: { id },
    data: updateData as any,
  });

  return { success: true, message: "پست با موفقیت ویرایش شد", post };
}

export async function handleDeletePost(postId: string, userId: string): Promise<PostResult> {
  if (!(await isBloggerOrAdmin(userId, postId))) return { success: false, error: faBloggerPostsMessages.unauthorized };

  await prisma.post.delete({ where: { id: postId } });

  return { success: true, message: "پست با موفقیت حذف شد" };
}

export async function handleGetBloggerPosts(userId: string): Promise<PostResult> {
  const posts = await prisma.post.findMany({
    where: { authorId: userId },
    include: {
      _count: { select: { likes: true, comments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const formatted = posts.map(p => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    thumbnail: p.thumbnail,
    views: p.views,
    likes: p._count.likes,
    comments: p._count.comments,
    published: p.published,
  }));

  return { success: true, posts: formatted };
}