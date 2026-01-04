// src/components/common/LikeButton.tsx
"use client";

import { Heart } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { useTranslations, useLocale } from "next-intl";

interface LikeButtonProps {
  id: string;
  type: "post" | "course" | "product";
  initialLiked?: boolean;
  size?: number;
  className?: string;
}

export default function LikeButton({
  id,
  type,
  initialLiked = false,
  size = 32,
  className,
}: LikeButtonProps) {
  const t = useTranslations("common");
  const locale = useLocale();
  const isRTL = locale === "fa";
  const [liked, setLiked] = useState(initialLiked);
  const [isPending, startTransition] = useTransition();

  const toggleLike = () => {
    if (isPending) return;
    const optimisticLiked = !liked;
    setLiked(optimisticLiked);

    startTransition(async () => {
      try {
        const res = await fetch("/api/like", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            [`${type}Id`]: id,
            action: optimisticLiked ? "like" : "unlike",
          }),
        });
        if (!res.ok) throw new Error();
        toast.success(
          optimisticLiked ? t("added_to_favorites") : t("removed_from_favorites")
        );
      } catch {
        setLiked(!optimisticLiked);
        toast.error(t("server_error"));
      }
    });
  };

  return (
    <button
      onClick={toggleLike}
      disabled={isPending}
      aria-label={liked ? t("remove_from_favorites") : t("add_to_favorites")}
      aria-pressed={liked}
      className={cn(
        "group relative inline-flex items-center justify-center rounded-full transition-all duration-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40",
        isPending && "cursor-wait opacity-60",
        className
      )}
    >
      {/* Background */}
      <div
        className={cn(
          "relative z-10 rounded-full shadow-3xl backdrop-blur-3xl transition-all duration-800 flex items-center justify-center",
          liked
            ? "bg-gradient-to-br from-rose-500 via-pink-600 to-rose-600 text-white ring-8 ring-rose-500/30"
            : "bg-white/95 dark:bg-white/10 text-gray-600 dark:text-gray-300 ring-4 ring-gray-300/50 dark:ring-white/20 group-hover:bg-gradient-to-br group-hover:from-rose-50 group-hover:to-pink-50"
        )}
        style={{ width: size + 16, height: size + 16 }}
      >
        <Heart
          size={size}
          className={cn(
            "transition-all duration-700",
            liked && "fill-current drop-shadow-2xl scale-125",
            "group-hover:scale-150"
          )}
          strokeWidth={liked ? 0 : 2.8}
        />
      </div>

      {/* Pulse */}
      {liked && !isPending && (
        <>
          <span className="absolute inset-0 animate-ping rounded-full bg-rose-400/50" />
          <span className="absolute inset-0 animate-ping animation-delay-200 rounded-full bg-rose-500/40" />
        </>
      )}

      {/* Hover ring */}
      <span
        className={cn(
          "pointer-events-none absolute inset-0 rounded-full opacity-0 transition-all duration-1000",
          liked
            ? "ring-12 ring-rose-500/50"
            : "group-hover:opacity-100 group-hover:ring-12 group-hover:ring-rose-400/40"
        )}
      />
    </button>
  );
}