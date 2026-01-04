// src/components/common/DetailHeader.tsx
import { Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";

interface DetailItem {
  label: string;
  value: string;
  color?: "primary" | "violet" | "emerald" | "rose" | "sky";
  icon?: string;
}

interface DetailHeaderProps {
  title: string;
  rating: number;
  reviewsCount: number;
  items: DetailItem[];
  tags?: { id: string; name: string }[];
  className?: string;
}

export default function DetailHeader({
  title,
  rating,
  reviewsCount,
  items,
  tags = [],
  className,
}: DetailHeaderProps) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <div className={cn("space-y-12", className)}>
      {/* عنوان اصلی */}
      <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-tight tracking-tight">
        <span className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent drop-shadow-2xl">
          {title}
        </span>
      </h1>

      {/* امتیاز و تعداد نظرات */}
      <div className="flex flex-wrap items-center gap-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "h-10 w-10 transition-all duration-500",
                  i < fullStars
                    ? "fill-amber-500 text-amber-500 drop-shadow-lg"
                    : i === fullStars && hasHalfStar
                    ? "fill-amber-500/50 text-amber-500"
                    : "text-muted-foreground/30"
                )}
                strokeWidth={2}
              />
            ))}
          </div>
          <span className="text-4xl font-black text-foreground">
            {rating.toFixed(1)}
          </span>
        </div>
        <span className="text-2xl text-muted-foreground">
          ({reviewsCount.toLocaleString("fa-IR")} نظر)
        </span>
      </div>

      {/* مشخصات کلیدی */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {items.map((item, index) => (
          <div
            key={index}
            className="group flex items-center gap-6 rounded-3xl bg-gradient-to-br from-card to-muted/40 p-8 shadow-2xl ring-1 ring-border/50 backdrop-blur-xl transition-all duration-700 hover:shadow-3xl hover:scale-105 hover:ring-primary/30"
          >
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-violet-600/20 flex items-center justify-center shadow-xl ring-4 ring-white/40">
              <span className="text-3xl font-black text-primary drop-shadow-md">
                {item.label[0]}
              </span>
            </div>
            <div>
              <p className="text-lg text-muted-foreground font-medium">{item.label}</p>
              <p
                className={cn(
                  "text-3xl font-black mt-2",
                  item.color === "primary" && "text-primary",
                  item.color === "violet" && "text-violet-600",
                  item.color === "emerald" && "text-emerald-600",
                  item.color === "rose" && "text-rose-600",
                  item.color === "sky" && "text-sky-600",
                  !item.color && "text-foreground"
                )}
              >
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* تگ‌ها */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {tags.map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              size="lg"
              className={cn(
                "rounded-full px-8 py-4 text-lg font-bold border-2 shadow-xl backdrop-blur-xl transition-all hover:scale-110 hover:shadow-2xl",
                "bg-background/70 hover:bg-primary/10 hover:border-primary hover:text-primary"
              )}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}