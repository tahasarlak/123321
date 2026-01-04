// src/components/review/ReviewSection.tsx
"use client";

import { Star } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils/cn";
import AddReviewForm from "./AddReviewForm";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date | string;
  user: {
    name: string;
    image?: string | null;
  };
}

export interface ReviewSectionProps {
  reviews: Review[];
  averageRating?: number;
  totalReviews?: number;
  entityId: string;
  entityType: "product" | "course" | "post";
  hideRatingSummary?: boolean;
}

export default function ReviewSection({
  reviews: initialReviews,
  averageRating: propAvg,
  totalReviews: propTotal,
  entityId,
  entityType,
  hideRatingSummary = false,
}: ReviewSectionProps) {
  const t = useTranslations("review");
  const { data: session, status } = useSession();
  const router = useRouter();

  const avgRating =
    propAvg ??
    (initialReviews.length > 0
      ? Number(
          (initialReviews.reduce((sum, r) => sum + r.rating, 0) / initialReviews.length).toFixed(1)
        )
      : 0);

  const totalReviews = propTotal ?? initialReviews.length;

  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => {
    const count = initialReviews.filter((r) => r.rating === star).length;
    const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
    return { star, count, percentage };
  });

  return (
    <section className="mt-48">
      <Card className="overflow-hidden rounded-4xl shadow-5xl border-0 bg-card/98 backdrop-blur-3xl ring-4 ring-primary/10">
        <div className="relative bg-gradient-to-br from-primary via-violet-600 to-primary p-20 md:p-28 text-center overflow-hidden">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
          <h2 className="relative text-7xl md:text-8xl lg:text-9xl font-black text-white drop-shadow-3xl">
            {t("reviews_title") || "نظرات کاربران"}
          </h2>
        </div>

        <div className="p-12 md:p-20 lg:p-32 space-y-40 bg-gradient-to-b from-background/95 to-muted/40">
          {!hideRatingSummary && (
            <div className="grid md:grid-cols-2 gap-24 items-center">
              <div className="text-center space-y-12">
                <div className="text-11xl lg:text-12xl font-black bg-gradient-to-r from-primary via-violet-600 to-primary bg-clip-text text-transparent drop-shadow-3xl">
                  {avgRating.toFixed(1)}
                </div>
                <div className="flex justify-center gap-8">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={96}
                      fill={i < Math.round(avgRating) ? "#fbbf24" : "none"}
                      className={cn(
                        "drop-shadow-2xl transition-all duration-1000",
                        i < avgRating ? "text-yellow-400" : "text-muted-foreground/20"
                      )}
                      strokeWidth={2}
                    />
                  ))}
                </div>
                <p className="text-4xl lg:text-5xl font-black text-foreground">
                  {t("average_rating", { count: totalReviews.toLocaleString("fa-IR") }) || `بر اساس ${totalReviews.toLocaleString("fa-IR")} نظر`}
                </p>
              </div>

              <div className="space-y-12">
                {ratingDistribution.map(({ star, count, percentage }) => (
                  <div key={star} className="flex items-center gap-8">
                    <div className="flex items-center gap-4 w-40">
                      <span className="text-4xl font-black text-foreground">{star}</span>
                      <Star size={48} fill="#fbbf24" className="text-yellow-400 drop-shadow-xl" />
                    </div>
                    <div className="flex-1 relative h-20 bg-muted/40 rounded-full overflow-hidden shadow-2xl ring-2 ring-border/50">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-600 transition-all duration-2000 ease-out"
                        style={{ width: `${percentage}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-3xl font-black text-white drop-shadow-2xl">
                        {percentage}%
                      </span>
                    </div>
                    <span className="text-3xl font-bold text-muted-foreground w-24 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Review */}
          <div className="border-t-8 border-dashed border-primary/20 pt-40">
            {status === "loading" ? null : !session?.user ? (
              <Card className="p-32 text-center bg-gradient-to-br from-primary/5 via-violet-600/5 to-primary/5 border-4 border-primary/20 shadow-4xl backdrop-blur-xl">
                <p className="text-6xl lg:text-7xl font-black text-foreground mb-20 drop-shadow-md">
                  {t("login_to_review") || "برای ثبت نظر باید وارد شوید"}
                </p>
                <Button
                  onClick={() => router.push("/auth")}
                  className="h-28 px-40 text-4xl font-black rounded-4xl bg-gradient-to-r from-primary via-violet-600 to-primary hover:from-violet-600 hover:to-primary text-white shadow-4xl hover:shadow-5xl hover:scale-105 transition-all duration-700"
                >
                  {t("login") || "ورود / ثبت‌نام"}
                </Button>
              </Card>
            ) : (
              <AddReviewForm entityId={entityId} entityType={entityType} />
            )}
          </div>

          {/* Reviews List */}
          <div className="space-y-20">
            {initialReviews.length === 0 ? (
              <Card className="p-48 text-center bg-gradient-to-br from-muted/30 to-card/90 border-4 border-dashed border-primary/30 shadow-3xl backdrop-blur-xl">
                <p className="text-7xl lg:text-8xl font-black text-muted-foreground mb-16 drop-shadow-md">
                  {t("no_reviews") || "هنوز هیچ نظری ثبت نشده"}
                </p>
                <p className="text-4xl text-muted-foreground leading-relaxed">
                  {t("be_first") || "اولین نفر باشید و تجربه خود را با دیگران به اشتراک بگذارید!"}
                </p>
              </Card>
            ) : (
              initialReviews.map((review, i) => (
                <Card
                  key={review.id}
                  className="group relative overflow-hidden p-16 lg:p-24 shadow-3xl border-0 bg-gradient-to-br from-card/98 to-primary/5 backdrop-blur-xl ring-2 ring-border/50 transition-all duration-1000 hover:shadow-4xl hover:scale-[1.01] hover:ring-primary/30"
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="relative flex gap-12">
                    <Avatar className="h-32 w-32 ring-8 ring-primary/20 shadow-3xl">
                      <AvatarImage src={review.user.image || undefined} />
                      <AvatarFallback className="text-5xl font-black bg-gradient-to-br from-primary via-violet-600 to-primary text-white">
                        {review.user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-8">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-4xl lg:text-5xl font-black text-foreground drop-shadow-md">
                            {review.user.name}
                          </h4>
                          <p className="text-2xl text-muted-foreground mt-4">
                            {new Date(review.createdAt).toLocaleDateString("fa-IR", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="flex gap-4">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={48}
                              fill={i < review.rating ? "#fbbf24" : "none"}
                              className={cn(
                                "drop-shadow-xl transition-all",
                                i < review.rating ? "text-yellow-400" : "text-muted-foreground/20"
                              )}
                              strokeWidth={2}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-2xl lg:text-3xl leading-loose text-foreground/90">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </Card>
    </section>
  );
}