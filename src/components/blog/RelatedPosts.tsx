// src/components/blog/RelatedPosts.tsx
import PostCard from "@/components/blog/PostCard";

type RelatedPost = {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  thumbnail?: string | null;
  featuredImage?: string | null;
  readingTime?: number | null;
  publishedAt: Date | null;
  author: { name: string };
  category?: { name: string; slug: string } | null;
  tags: { id: string; name: string; slug: string }[];
  views?: number | null; // اینجا null ممکنه باشه
  _count: { likes: number; comments: number };
};

type Props = {
  posts: RelatedPost[];
  t: (key: string) => string;
};

export default function RelatedPosts({ posts, t }: Props) {
  return (
    <section className="mt-40">
      <h2 className="text-7xl font-black text-center mb-20 bg-gradient-to-r from-cyan-600 to-purple-600 bg-clip-text text-transparent">
        {t("related_posts") || "مقالات مرتبط"}
      </h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
        {posts.map((p) => (
          <PostCard
            key={p.id}
            id={p.id}
            slug={p.slug}
            title={p.title}
            excerpt={p.excerpt}
            thumbnail={p.thumbnail}
            featuredImage={p.featuredImage}
            readingTime={p.readingTime || 5}
            publishedAt={p.publishedAt!}
            author={p.author}
            category={p.category}
            tags={p.tags}
            likesCount={p._count.likes}
            commentsCount={p._count.comments}
            isLiked={false}
            views={p.views ?? 0}  // ← اینجا اصلاح شد: null یا undefined رو به 0 تبدیل می‌کنه
          />
        ))}
      </div>
    </section>
  );
}