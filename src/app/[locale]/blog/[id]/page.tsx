// src/app/[locale]/blog/[slug]/page.tsx
import { getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import { Metadata } from "next";

import PostHeader from "@/components/blog/PostHeader";
import PostContent from "@/components/blog/PostContent";
import PostTags from "@/components/blog/PostTags";
import PostAuthorCard from "@/components/blog/PostAuthorCard";
import RelatedPosts from "@/components/blog/RelatedPosts";
import ReviewSection from "@/components/review/ReviewSection";

type Props = {
  params: { slug: string; locale: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = params;
  const t = await getTranslations({ locale, namespace: "blog" });

  const post = await prisma.post.findUnique({
    where: { slug },
    select: {
      title: true,
      excerpt: true,
      featuredImage: true,
      thumbnail: true,
      publishedAt: true,
      content: true,
    },
  });

  if (!post || !post.publishedAt) {
    return { title: t("not_found") || "پست یافت نشد" };
  }

  const imageUrl = post.featuredImage || post.thumbnail || "/blog-placeholder.jpg";

  return {
    title: post.title,
    description: post.excerpt || post.content?.slice(0, 160) || "",
    openGraph: {
      title: post.title,
      description: post.excerpt || post.content?.slice(0, 160) || "",
      url: `https://rom.ir/${locale}/blog/${slug}`,
      images: [imageUrl],
      type: "article",
      publishedTime: post.publishedAt.toISOString(),
    },
    alternates: {
      canonical: `/blog/${slug}`,
      languages: {
        fa: `/fa/blog/${slug}`,
        en: `/en/blog/${slug}`,
        ru: `/ru/blog/${slug}`,
      },
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug, locale } = params;
  const t = await getTranslations({ locale, namespace: "blog" });
  const isRTL = locale === "fa";
  const session = await getServerSession(authOptions);

  const post = await prisma.post.findUnique({
    where: { slug },
    include: {
      author: {
        select: { id: true, name: true, image: true, bio: true },
      },
      category: { select: { name: true, slug: true, color: true } },
      tags: true,
      comments: {
        where: { isApproved: true, commentableType: "Post" },
        include: {
          author: { select: { name: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      likes: session?.user?.id
        ? { where: { userId: session.user.id }, select: { id: true } }
        : false,
      _count: { select: { likes: true, comments: true } },
    },
  });

  if (!post || !post.published || !post.publishedAt) notFound();

  // افزایش بازدید
  await prisma.post.update({
    where: { id: post.id },
    data: { views: { increment: 1 } },
  });

  const isLiked = Array.isArray(post.likes) && post.likes.length > 0;

  // کامنت‌های بلاگ rating ندارند → میانگین امتیاز صفر
  const avgRating = 0;
  const totalReviews = post._count.comments;

  const relatedPosts = await prisma.post.findMany({
    where: {
      published: true,
      publishedAt: { not: null },
      OR: [
        { categoryId: post.categoryId },
        { tags: { some: { id: { in: post.tags.map((t) => t.id) } } } },
      ],
      NOT: { id: post.id },
    },
    include: {
      author: { select: { name: true } },
      category: { select: { name: true, slug: true } },
      tags: true,
      _count: { select: { likes: true, comments: true } },
    },
    orderBy: { publishedAt: "desc" },
    take: 6,
  });

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.excerpt || "",
            image: post.featuredImage || post.thumbnail || "/blog-placeholder.jpg",
            author: { "@type": "Person", name: post.author.name },
            publisher: {
              "@type": "Organization",
              name: "روم آکادمی",
              logo: { "@type": "ImageObject", url: "https://rom.ir/logo.png" },
            },
            datePublished: post.publishedAt.toISOString(),
            dateModified: post.updatedAt.toISOString(),
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `https://rom.ir/${locale}/blog/${slug}`,
            },
          }),
        }}
      />

      <div className="container mx-auto px-6 py-32 max-w-7xl">
        {/* هدر پست با عکس بزرگ */}
        <PostHeader
          post={{
            id: post.id,
            title: post.title,
            excerpt: post.excerpt,
            featuredImage: post.featuredImage,
            thumbnail: post.thumbnail,
            author: post.author,
            category: post.category,
            publishedAt: post.publishedAt,
            readingTime: post.readingTime,
            views: post.views,
          }}
          isRTL={isRTL}
          isLiked={isLiked}
          t={t}
        />

        {/* محتوای اصلی + سایدبار */}
        <div className="grid lg:grid-cols-3 gap-16">
          <article className="lg:col-span-2 space-y-20">
            {/* محتوای پست */}
            <PostContent content={post.content} />

            {/* تگ‌ها */}
            {post.tags.length > 0 && <PostTags tags={post.tags} t={t} />}

            {/* بخش کامنت‌ها (به عنوان ReviewSection استفاده شده) */}
            <div className="mt-32">
              <ReviewSection
                reviews={post.comments.map((c) => ({
                  id: c.id,
                  rating: 5, // مقدار پیش‌فرض (چون کامنت rating ندارد)
                  comment: c.content,
                  createdAt: c.createdAt,
                  user: {
                    name: c.author.name || "ناشناس",
                    image: c.author.image,
                  },
                }))}
                averageRating={avgRating}
                totalReviews={totalReviews}
                entityId={post.id}
                entityType="post"
              />
            </div>
          </article>

          {/* سایدبار نویسنده */}
          <aside className="space-y-12">
            <PostAuthorCard author={post.author} t={t} />
          </aside>
        </div>

        {/* پست‌های مرتبط */}
        {relatedPosts.length > 0 && <RelatedPosts posts={relatedPosts} t={t} />}
      </div>
    </>
  );
}