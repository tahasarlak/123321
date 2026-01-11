// lib/actions/blog.actions.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import slugify from "slugify";

const PAGE_SIZE = 12;

// ── Helper: چک نقش‌ها ─────────────────────────────────────────────
async function getUserRoles(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { role: true } } },
  });
  return user?.roles.map((r) => r.role) || [];
}

async function isAdmin(userId: string): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");
}

async function isBlogger(userId: string): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roles.includes("BLOGGER") || roles.includes("BLOG_AUTHOR") || roles.includes("INSTRUCTOR");
}

// ── اسکیماها ──────────────────────────────────────────────────────
const basePostSchema = z.object({
  title: z.string().min(3, "عنوان حداقل ۳ کاراکتر").max(200),
  slug: z.string().min(3).max(200).optional(),
  excerpt: z.string().max(300).optional(),
  blocks: z.array(z.any()).min(1, "محتوا نمی‌تواند خالی باشد"),
  thumbnail: z.string().url().optional().nullable(),
  featuredImage: z.string().url().optional().nullable(),
  readingTime: z.coerce.number().int().min(1).optional(),
  categoryId: z.string().optional().nullable(),
  tagIds: z.array(z.string()).optional(),
  published: z.coerce.boolean().default(false),
  isPremium: z.coerce.boolean().default(false),
  premiumTierId: z.string().optional().nullable(),
  newsletterId: z.string().optional().nullable(),
  honeypot: z.string().optional(),
});

const createPostSchema = basePostSchema;
const editPostSchema = basePostSchema.extend({ id: z.string().cuid() });

// ── ۱. لیست پست‌ها (برای داشبورد) ─────────────────────────────────
export async function fetchBlogs({
  search = "",
  page = 1,
  status = "all",
  userId,
}: {
  search?: string;
  page?: number;
  status?: "all" | "published" | "draft";
  userId: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.id !== userId) {
    return { items: [], totalItems: 0 };
  }

  const currentUserId = session.user.id as string;
  const userIsAdmin = await isAdmin(currentUserId);

  const where: Prisma.PostWhereInput = {};

  if (!userIsAdmin) where.authorId = currentUserId;

  if (status === "published") where.published = true;
  if (status === "draft") where.published = false;

  if (search.trim()) {
    const term = search.trim();
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { excerpt: { contains: term, mode: "insensitive" } },
      { author: { name: { contains: term, mode: "insensitive" } } },
    ];
  }

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        author: { select: { name: true, image: true } },
        category: { select: { name: true } },
        tags: { select: { name: true } },
        analytics: true,
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: { publishedAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.post.count({ where }),
  ]);

  const items = posts.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    thumbnail: p.thumbnail,
    featuredImage: p.featuredImage,
    author: p.author.name,
    authorImage: p.author.image,
    category: p.category?.name || "بدون دسته",
    tags: p.tags.map((t) => t.name),
    views: p.views,
    uniqueViews: p.analytics?.uniqueViews || 0,
    likes: p._count.likes,
    comments: p._count.comments,
    published: p.published,
    isPremium: p.isPremium,
    premiumTierId: p.premiumTierId,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  }));

  return { items, totalItems: total };
}

// ── ۲. دریافت پست برای ویرایش ─────────────────────────────────────
export async function getBlogPostById(id: string, userId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.id !== userId) {
    throw new Error("دسترسی غیرمجاز");
  }

  const currentUserId = session.user.id as string;
  const userIsAdmin = await isAdmin(currentUserId);

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      category: true,
      tags: true,
      blocks: { orderBy: { order: "asc" } },
      newsletter: true,
      author: { select: { id: true } },
    },
  });

  if (!post) throw new Error("پست یافت نشد");

  if (!userIsAdmin && post.authorId !== currentUserId) {
    throw new Error("شما اجازه ویرایش این پست را ندارید");
  }

  return {
    ...post,
    tagIds: post.tags.map((t) => t.id),
    blocks: post.blocks.map((b) => ({
      id: b.id,
      type: b.type,
      content: b.content,
      order: b.order,
    })),
  };
}

// ── ۳. ایجاد پست جدید ──────────────────────────────────────────────
export async function createBlogPostAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "لطفاً وارد شوید" };

  const currentUserId = session.user.id as string;
  const userIsAdmin = await isAdmin(currentUserId);
  const userIsBlogger = await isBlogger(currentUserId);

  if (!userIsAdmin && !userIsBlogger) {
    return { success: false, error: "شما اجازه ایجاد پست ندارید" };
  }

  const raw = Object.fromEntries(formData);
  const parsed = createPostSchema.safeParse(raw);

  if (!parsed.success) {
    return { success: false, error: "داده‌های نامعتبر", issues: parsed.error.issues };
  }

  const data = parsed.data;

  if (data.honeypot?.length) {
    return { success: true, message: "عملیات موفق" };
  }

  // تولید slug هوشمند
  let slug = data.slug?.trim();
  if (!slug) {
    slug = slugify(data.title, { lower: true, strict: true, locale: "fa" });
  }

  // اطمینان از یکتایی slug
  let finalSlug = slug;
  let counter = 1;
  while (await prisma.post.findUnique({ where: { slug: finalSlug } })) {
    finalSlug = `${slug}-${counter++}`;
  }

  const postData: Prisma.PostCreateInput = {
    title: data.title.trim(),
    slug: finalSlug,
    excerpt: data.excerpt?.trim() || null,
    thumbnail: data.thumbnail || null,
    featuredImage: data.featuredImage || null,
    readingTime: data.readingTime || Math.ceil(data.blocks.length / 10),
    published: data.published,
    publishedAt: data.published ? new Date() : null,
    isPremium: data.isPremium,
    premiumTierId: data.isPremium ? data.premiumTierId || null : null,
    author: { connect: { id: currentUserId } },
    blocks: {
      create: data.blocks.map((block: any, index: number) => ({
        type: block.type,
        content: block.content,
        order: index + 1,
      })),
    },
  };

  if (data.categoryId) postData.category = { connect: { id: data.categoryId } };
  if (data.tagIds?.length) postData.tags = { connect: data.tagIds.map((id) => ({ id })) };
  if (data.newsletterId) postData.newsletter = { connect: { id: data.newsletterId } };

  try {
    const post = await prisma.post.create({ data: postData });

    await prisma.postAnalytics.create({ data: { postId: post.id } });

    const dashboardPath = userIsAdmin ? "/dashboard/admin/blogs" : "/dashboard/blogger/posts";

    revalidatePath(dashboardPath);
    revalidatePath(`/blog/${post.slug}`);
    revalidatePath("/blog");

    return {
      success: true,
      message: "پست با موفقیت ایجاد شد",
      post: { id: post.id, slug: post.slug },
    };
  } catch (err) {
    console.error("Error creating post:", err);
    return { success: false, error: "خطا در ایجاد پست" };
  }
}

// ── ۴. ویرایش پست ──────────────────────────────────────────────────
export async function editBlogPostAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "لطفاً وارد شوید" };

  const currentUserId = session.user.id as string;
  const userIsAdmin = await isAdmin(currentUserId);

  const raw = Object.fromEntries(formData);
  const parsed = editPostSchema.safeParse(raw);

  if (!parsed.success || !parsed.data.id) {
    return { success: false, error: "داده نامعتبر" };
  }

  const data = parsed.data;

  const existing = await prisma.post.findUnique({
    where: { id: data.id },
    select: { id: true, slug: true, authorId: true, published: true },
  });

  if (!existing) return { success: false, error: "پست یافت نشد" };

  if (!userIsAdmin && existing.authorId !== currentUserId) {
    return { success: false, error: "دسترسی ممنوع" };
  }

  let newSlug = data.slug.trim();
  if (newSlug !== existing.slug) {
    const slugConflict = await prisma.post.findUnique({ where: { slug: newSlug } });
    if (slugConflict) return { success: false, error: "این آدرس قبلاً استفاده شده است" };
  }

  const postData: Prisma.PostUpdateInput = {
    title: data.title.trim(),
    slug: newSlug,
    excerpt: data.excerpt?.trim() || null,
    thumbnail: data.thumbnail || null,
    featuredImage: data.featuredImage || null,
    readingTime: data.readingTime || Math.ceil(data.blocks.length / 10),
    published: data.published,
    publishedAt: data.published && !existing.published ? new Date() : existing.publishedAt,
    isPremium: data.isPremium,
    premiumTierId: data.isPremium ? data.premiumTierId || null : null,
  };

  if (data.categoryId !== undefined) {
    postData.category = data.categoryId ? { connect: { id: data.categoryId } } : { disconnect: true };
  }

  if (data.tagIds !== undefined) {
    postData.tags = data.tagIds.length
      ? { set: [], connect: data.tagIds.map((id) => ({ id })) }
      : { set: [] };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.postContentBlock.deleteMany({ where: { postId: data.id } });

      if (data.blocks.length > 0) {
        await tx.postContentBlock.createMany({
          data: data.blocks.map((block: any, index: number) => ({
            postId: data.id,
            type: block.type,
            content: block.content,
            order: index + 1,
          })),
        });
      }

      await tx.post.update({
        where: { id: data.id },
        data: postData,
      });
    });

    const dashboardPath = userIsAdmin ? "/dashboard/admin/blogs" : "/dashboard/blogger/posts";

    revalidatePath(dashboardPath);
    revalidatePath(`/blog/${newSlug}`);
    revalidatePath("/blog");
    if (newSlug !== existing.slug) revalidatePath(`/blog/${existing.slug}`);

    return { success: true, message: "پست با موفقیت ویرایش شد" };
  } catch (err) {
    console.error("Error editing post:", err);
    return { success: false, error: "خطا در ذخیره تغییرات" };
  }
}

// ── ۵. حذف پست (نرم یا سخت) ───────────────────────────────────────
export async function deleteBlogPostAction(postId: string, userId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.id !== userId) {
    return { success: false, error: "لطفاً وارد شوید" };
  }

  const currentUserId = session.user.id as string;
  const userIsAdmin = await isAdmin(currentUserId);

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, slug: true },
  });

  if (!post) return { success: false, error: "پست یافت نشد" };

  if (!userIsAdmin && post.authorId !== currentUserId) {
    return { success: false, error: "دسترسی ممنوع" };
  }

  try {
    // حذف کامل (سخت)
    await prisma.$transaction(async (tx) => {
      await tx.postContentBlock.deleteMany({ where: { postId } });
      await tx.post.delete({ where: { id: postId } });
    });

    const dashboardPath = userIsAdmin ? "/dashboard/admin/blogs" : "/dashboard/blogger/posts";

    revalidatePath(dashboardPath);
    revalidatePath(`/blog/${post.slug}`);
    revalidatePath("/blog");

    return { success: true, message: "پست با موفقیت حذف شد" };
  } catch (err) {
    console.error("Error deleting post:", err);
    return { success: false, error: "خطا در حذف پست" };
  }
}

// ── ۶. عملیات گروهی روی پست‌ها ─────────────────────────────────────
export async function bulkBlogAction(
  selectedIds: string[],
  action: "publish" | "unpublish" | "delete",
  userId: string
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.id !== userId) {
    return { success: false, error: "لطفاً وارد شوید" };
  }

  const currentUserId = session.user.id as string;
  const userIsAdmin = await isAdmin(currentUserId);

  if (!userIsAdmin) {
    return { success: false, error: "فقط ادمین می‌تواند عملیات گروهی انجام دهد" };
  }

  if (selectedIds.length === 0) {
    return { success: false, error: "هیچ پستی انتخاب نشده است" };
  }

  try {
    if (action === "delete") {
      await prisma.$transaction(async (tx) => {
        await tx.postContentBlock.deleteMany({
          where: { postId: { in: selectedIds } },
        });
        await tx.post.deleteMany({ where: { id: { in: selectedIds } } });
      });
    } else {
      const published = action === "publish";
      await prisma.post.updateMany({
        where: { id: { in: selectedIds } },
        data: {
          published,
          publishedAt: published ? new Date() : null,
        },
      });
    }

    revalidatePath("/dashboard/admin/blogs");
    revalidatePath("/blog");

    return {
      success: true,
      message: `${selectedIds.length} پست با موفقیت ${
        action === "delete" ? "حذف" : action === "publish" ? "منتشر" : "به پیش‌نویس"
      } شدند`,
    };
  } catch (err) {
    console.error("Bulk blog action error:", err);
    return { success: false, error: "خطا در اجرای عملیات گروهی" };
  }
}

// ── ۷. دریافت پست عمومی + چک دسترسی پرمیوم ──────────────────────
export async function getPublicBlogPost(slug: string, currentUserId?: string) {
  const post = await prisma.post.findUnique({
    where: { slug },
    include: {
      author: { select: { name: true, image: true } },
      category: true,
      tags: true,
      blocks: { orderBy: { order: "asc" } },
      analytics: true,
    },
  });

  if (!post || !post.published) return null;

  // افزایش بازدید
  await prisma.post.update({
    where: { id: post.id },
    data: { views: { increment: 1 } },
  });

  await prisma.postAnalytics.upsert({
    where: { postId: post.id },
    update: { totalViews: { increment: 1 } },
    create: { postId: post.id, totalViews: 1, uniqueViews: 0 },
  });

  const hasAccess = !post.isPremium || (currentUserId && (await hasBlogSubscriptionAccess(currentUserId, post.premiumTierId)));

  return {
    ...post,
    hasAccess,
    blocks: hasAccess ? post.blocks : [],
  };
}

async function hasBlogSubscriptionAccess(userId: string, tierId: string | null): Promise<boolean> {
  if (!tierId) return true;

  const sub = await prisma.blogSubscription.findFirst({
    where: {
      userId,
      tierId,
      status: "ACTIVE",
      endsAt: { gt: new Date() },
    },
  });

  return !!sub;
}