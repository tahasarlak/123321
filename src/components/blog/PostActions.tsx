"use client";

// src/components/blog/PostActions.tsx
import LikeButton from "@/components/common/LikeButton";
import { Share2, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Props = {
  postId: string;
  isLiked: boolean;
  isRTL: boolean;
};

export default function PostActions({ postId, isLiked, isRTL }: Props) {
  return (
    <div className={cn("absolute top-12 flex flex-col gap-6", isRTL ? "left-12" : "right-12")}>
      <LikeButton id={postId} type="post" initialLiked={isLiked} size={56} />
      <button className="p-4 bg-white/20 backdrop-blur-xl rounded-full hover:bg-white/30 transition">
        <Share2 size={32} className="text-white" />
      </button>
      <button className="p-4 bg-white/20 backdrop-blur-xl rounded-full hover:bg-white/30 transition">
        <Bookmark size={32} className="text-white" />
      </button>
    </div>
  );
}