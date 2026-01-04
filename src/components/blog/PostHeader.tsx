// src/components/blog/PostHeader.tsx
import Image from "next/image";
import Link from "next/link";
import { Calendar, Clock, Eye } from "lucide-react";
import { format } from "date-fns-jalali";
import { cn } from "@/lib/utils/cn";
import PostActions from "./PostActions";

type Props = {
  post: {
    id: string;
    title: string;
    excerpt?: string | null;
    featuredImage?: string | null;
    thumbnail?: string | null;
    author: { name: string; image?: string | null };
    category?: { name: string; slug: string; color?: string } | null;
    publishedAt: Date;
    readingTime?: number | null;
    views?: number | null;
  };
  isRTL: boolean;
  isLiked: boolean;
  t: (key: string) => string;
};

export default function PostHeader({ post, isRTL, isLiked, t }: Props) {
  const imageUrl = post.featuredImage || post.thumbnail || "/blog-placeholder.jpg";

  return (
    <div className="relative rounded-4xl overflow-hidden shadow-4xl mb-20">
      <div className="relative aspect-[16/8] md:aspect-[21/9]">
        <Image
          src={imageUrl}
          alt={post.title}
          fill
          className="object-cover"
          priority
          placeholder="blur"
          blurDataURL="/placeholder.jpg"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
      </div>

      <div className="absolute inset-0 flex items-end p-12 md:p-20">
        <div className="max-w-4xl text-white">
          {post.category && (
            <Link
              href={`/blog?category=${post.category.slug}`}
              className={cn(
                "inline-block px-8 py-4 rounded-full text-2xl font-black mb-8 shadow-2xl",
                post.category.color || "bg-gradient-to-r from-primary to-secondary"
              )}
            >
              {post.category.name}
            </Link>
          )}

          <h1 className="text-6xl md:text-8xl font-black leading-tight mb-10 drop-shadow-2xl">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-8 text-2xl">
            <div className="flex items-center gap-4">
              <Image
                src={post.author.image || "/avatar.jpg"}
                alt={post.author.name}
                width={64}
                height={64}
                className="rounded-full ring-4 ring-white/30"
              />
              <div>
                <p className="font-bold">{post.author.name}</p>
                <p className="text-white/80">{t("author") || "نویسنده"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar size={32} />
              <span className="font-medium">{format(post.publishedAt, "dd MMMM yyyy")}</span>
            </div>

            <div className="flex items-center gap-3">
              <Clock size={32} />
              <span className="font-medium">{post.readingTime || 7} دقیقه مطالعه</span>
            </div>

            <div className="flex items-center gap-8 ml-auto">
              <div className="flex items-center gap-3">
                <Eye size={32} />
                <span className="text-3xl font-black">
                  {(post.views || 0).toLocaleString("fa-IR")}
                </span>
              </div>
            </div>
          </div>
        </div>

        <PostActions postId={post.id} isLiked={isLiked} isRTL={isRTL} />
      </div>
    </div>
  );
}