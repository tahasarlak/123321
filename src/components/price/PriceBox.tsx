// src/components/price/PriceBox.tsx
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";

interface PriceBoxProps {
  price: number;
  discountPercent?: number;
  size?: "default" | "lg" | "xl";
  className?: string;
}

export default function PriceBox({
  price,
  discountPercent = 0,
  size = "default",
  className,
}: PriceBoxProps) {
  const hasDiscount = discountPercent > 0;
  const discountedPrice = hasDiscount ? Math.round(price * (1 - discountPercent / 100)) : price;

  const sizeMap = {
    default: "text-4xl",
    lg: "text-5xl",
    xl: "text-6xl md:text-7xl",
  };

  const badgeSizeMap = {
    default: "default",
    lg: "lg",
    xl: "xl",
  };

  return (
    <div
      className={cn(
        "relative inline-block rounded-4xl bg-gradient-to-br from-card to-muted/50 p-8 md:p-12 shadow-4xl ring-4 ring-primary/10 backdrop-blur-3xl",
        "transition-all duration-700 hover:shadow-5xl hover:ring-primary/30 hover:scale-[1.015] hover:-translate-y-2",
        className
      )}
    >
      {/* گرادیان لوکس */}
      <div className="absolute inset-0 rounded-4xl bg-gradient-to-tr from-primary/5 via-transparent to-violet-600/5 opacity-70" />
      <div className="relative z-10 flex flex-col items-end gap-6 md:flex-row md:items-center md:gap-12">
        {/* قیمت اصلی (خط‌خورده) */}
        <div
          className={cn(
            "flex items-baseline gap-3 font-black text-foreground/70 transition-all duration-700",
            sizeMap[size],
            hasDiscount && "order-2 text-foreground/40 line-through opacity-60"
          )}
        >
          <span>{price.toLocaleString("fa-IR")}</span>
          <span className="text-xl md:text-2xl font-bold text-muted-foreground">تومان</span>
        </div>

        {/* قیمت نهایی */}
        <div
          className={cn(
            "flex items-baseline gap-3 font-black bg-gradient-to-r from-primary via-violet-600 to-primary bg-clip-text text-transparent drop-shadow-2xl",
            sizeMap[size],
            !hasDiscount && "order-1"
          )}
        >
          <span>{discountedPrice.toLocaleString("fa-IR")}</span>
          <span className="text-xl md:text-2xl font-bold text-primary drop-shadow-xl">تومان</span>
        </div>

        {/* بج تخفیف */}
        {hasDiscount && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 md:static md:translate-x-0 md:order-1">
            <Badge
              variant="destructive"
              size={badgeSizeMap[size]}
              className={cn(
                "rounded-full shadow-3xl border-4 border-white/50 backdrop-blur-3xl animate-pulse",
                "bg-gradient-to-br from-rose-600 via-red-600 to-rose-700"
              )}
            >
              −{discountPercent}% تخفیف
            </Badge>
          </div>
        )}
      </div>

      {/* افکت نور */}
      <div className="pointer-events-none absolute inset-0 rounded-4xl bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-1000 hover:opacity-100" />
      <div className="pointer-events-none absolute inset-0 rounded-4xl bg-gradient-to-br from-primary/10 via-transparent to-violet-600/10 opacity-0 transition-opacity duration-1000 hover:opacity-100" />
    </div>
  );
}