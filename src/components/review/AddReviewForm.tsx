// src/components/review/AddReviewForm.tsx
"use client";

import { useState, useTransition } from "react";
import { Star, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";

interface AddReviewFormProps {
  entityId: string;
  entityType: "product" | "course" | "post";
}

export default function AddReviewForm({ entityId, entityType }: AddReviewFormProps) {
  const t = useTranslations("review");
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();

  const getRatingText = () => {
    if (rating === 0) return t("select_rating") || "امتیاز خود را انتخاب کنید";
    if (rating <= 2) return t("very_bad") || "خیلی بد بود";
    if (rating === 3) return t("average") || "معمولی بود";
    if (rating === 4) return t("good") || "خوب بود";
    return t("excellent") || "عالی بود!";
  };

  const submitReview = () => {
    if (rating === 0) {
      toast.error(t("select_rating_required") || "لطفاً امتیاز خود را انتخاب کنید");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityId,
            entityType,
            rating,
            comment: comment.trim() || null,
          }),
        });
        if (!res.ok) throw new Error();
        toast.success(t("review_submitted") || "نظر شما با موفقیت ثبت شد و پس از بررسی نمایش داده می‌شود", {
          duration: 6000,
        });
        setRating(0);
        setComment("");
        setHoveredRating(0);
        window.location.reload();
      } catch {
        toast.error(t("review_error") || "خطا در ارسال نظر");
      }
    });
  };

  const entityName = entityType === "product" ? t("product") : entityType === "course" ? t("course") : t("post");

  return (
    <Card className="relative overflow-hidden p-20 lg:p-32 bg-gradient-to-br from-primary/5 via-violet-600/5 to-primary/5 border-4 border-primary/20 shadow-5xl backdrop-blur-3xl ring-4 ring-primary/10">
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-50" />
      <h3 className="relative text-center text-6xl lg:text-7xl font-black mb-24 bg-gradient-to-r from-primary via-violet-600 to-primary bg-clip-text text-transparent drop-shadow-2xl">
        {t("your_opinion_about") || "نظر شما درباره این"} {entityName}
      </h3>

      {/* Stars */}
      <div className="flex justify-center gap-12 mb-20">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            disabled={isPending}
            className="group relative transition-all duration-500 hover:scale-125 focus:outline-none focus:ring-8 focus:ring-primary/30 rounded-full"
          >
            <Star
              size={96}
              fill={star <= (hoveredRating || rating) ? "#fbbf24" : "none"}
              className={cn(
                "drop-shadow-3xl transition-all duration-700",
                star <= (hoveredRating || rating) ? "text-yellow-400" : "text-muted-foreground/30"
              )}
              strokeWidth={3}
            />
            <span className="absolute inset-0 rounded-full ring-8 ring-yellow-400/0 transition-all group-hover:ring-yellow-400/30" />
          </button>
        ))}
      </div>

      <p className="text-center text-5xl font-black text-foreground mb-24 drop-shadow-md">
        {getRatingText()}
      </p>

      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t("comment_placeholder") || "نظر خود را بنویسید... (اختیاری)"}
        rows={10}
        disabled={isPending}
        className="text-2xl p-12 rounded-4xl border-4 border-primary/30 focus:border-primary shadow-2xl bg-card/95 backdrop-blur-xl resize-none focus:ring-4 focus:ring-primary/20"
      />

      <div className="text-center mt-24">
        <Button
          onClick={submitReview}
          disabled={isPending || rating === 0}
          className="group relative h-32 px-48 text-4xl font-black rounded-4xl bg-gradient-to-r from-primary via-violet-600 to-primary hover:from-violet-600 hover:to-primary text-white shadow-5xl hover:shadow-6xl hover:scale-110 transition-all duration-700"
        >
          <span className="flex items-center gap-12">
            {isPending ? (
              "در حال ارسال..."
            ) : (
              <>
                <Send className="h-16 w-16 transition-transform group-hover:translate-x-4 group-hover:scale-110 drop-shadow-2xl" />
                {t("submit_review") || "ارسال نظر"}
              </>
            )}
          </span>
          <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-1000 group-hover:translate-x-full rounded-4xl" />
        </Button>
      </div>
    </Card>
  );
}