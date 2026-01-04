// src/components/blog/PostCard.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, Calendar, Clock } from "lucide-react";
import LikeButton from "../common/LikeButton";
import { format } from "date-fns-jalali";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils/cn";

interface PostCardProps {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  thumbnail?: string | null;
  featuredImage?: string | null;
  readingTime: number;
  publishedAt: Date | null;
  author: {
    name: string;
    image?: string | null;
  };
  category?: {
    name: string;
    slug: string;
    color?: string;
  } | null;
  tags: { name: string; slug: string }[];
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
  views?: number;
}

export default function PostCard({
  id,
  slug,
  title,
  excerpt,
  thumbnail,
  featuredImage,
  readingTime,
  publishedAt,
  author,
  category,
  tags,
  likesCount,
  commentsCount,
  isLiked = false,
  views,
}: PostCardProps) {
  const t = useTranslations("blog");
  const locale = useLocale();
  const isRTL = locale === "fa";
  const imageUrl = thumbnail || featuredImage || "/blog-placeholder.jpg";

  return (
    <div className="group relative bg-card rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-700 overflow-hidden transform hover:-translate-y-6 border border-border/50">
      {/* Like Button */}
      <div className={cn("absolute top-6 z-20", isRTL ? "left-6" : "right-6")}>
        <LikeButton id={id} type="post" initialLiked={isLiked} size={32} />
      </div>

      {/* Category */}
      {category && (
        <div className={cn("absolute top-6 z-10", isRTL ? "right-6" : "left-6")}>
          <span
            className={cn(
              "px-6 py-3 rounded-full text-white font-black text-lg shadow-xl",
              category.color || "bg-gradient-to-r from-primary to-secondary"
            )}
          >
            {category.name}
          </span>
        </div>
      )}

      {/* Image */}
      <Link href={`/blog/${slug}`} className="block">
        <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10">
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-110 transition-transform duration-1000"
            priority={false}
            placeholder="blur"
            blurDataURL="/placeholder.jpg"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
      </Link>

      {/* Content */}
      <div className="p-8 space-y-6">
        {/* Author + Date + Reading Time */}
        <div className="flex items-center justify-between text-muted-foreground">
          <div className="flex items-center gap-4">
            <Image
              src={author.image || "/avatar.jpg"}
              alt={author.name}
              width={40}
              height={40}
              className="rounded-full ring-2 ring-primary/20"
            />
            <span className="font-bold text-lg text-foreground">{author.name}</span>
          </div>
          <div className="flex items-center gap-5 text-sm">
            {publishedAt && (
              <div className="flex items-center gap-2">
                <Calendar size={20} />
                <span className="font-medium">{format(publishedAt, "dd MMMM yyyy")}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock size={20} />
              <span className="font-medium">{t("reading_time", { minutes: readingTime })}</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <Link href={`/blog/${slug}`}>
          <h3 className="text-3xl font-black text-foreground line-clamp-2 group-hover:text-primary transition duration-300">
            {title}
          </h3>
        </Link>

        {/* Excerpt */}
        {excerpt && (
          <p className="text-lg text-muted-foreground line-clamp-3 leading-relaxed">{excerpt}</p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {tags.slice(0, 4).map((tag) => (
              <Link
                key={tag.slug}
                href={`/blog?tag=${tag.slug}`}
                className="px-4 py-2 bg-secondary/20 text-secondary rounded-full text-sm font-bold hover:bg-secondary/40 transition"
              >
                #{tag.name}
              </Link>
            ))}
            {tags.length > 4 && (
              <span className="text-muted-foreground text-sm self-center">+{tags.length - 4}</span>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between pt-6 border-t border-border/30">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Heart
                size={24}
                fill={isLiked ? "currentColor" : "none"}
                className={isLiked ? "text-red-500" : "text-muted-foreground"}
              />
              <span className="font-bold text-lg text-foreground">{likesCount.toLocaleString("fa-IR")}</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle size={24} />
              <span className="font-bold text-lg text-foreground">{commentsCount.toLocaleString("fa-IR")}</span>
            </div>
            {views !== undefined && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="font-bold text-lg text-foreground">{views.toLocaleString("fa-IR")}</span>
              </div>
            )}
          </div>

          <Link
            href={`/blog/${slug}`}
            className="text-xl font-black text-primary hover:text-secondary transition flex items-center gap-3 group"
          >
            {t("continue_reading")}
            <svg
              className={cn("w-6 h-6 group-hover:translate-x-2 transition-transform", isRTL && "rotate-180 group-hover:-translate-x-2")}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}