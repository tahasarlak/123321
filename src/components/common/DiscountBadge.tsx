// src/components/common/DiscountBadge.tsx
import { Percent } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface DiscountBadgeProps {
  discount: {
    type: "PERCENTAGE" | "FIXED";
    value: number;
  };
  size?: "default" | "lg";
  className?: string;
}

export default function DiscountBadge({
  discount,
  size = "default",
  className,
}: DiscountBadgeProps) {
  const isPercentage = discount.type === "PERCENTAGE";

  const sizeMap = {
    default: "px-8 py-4 text-2xl",
    lg: "px-10 py-6 text-3xl",
  };

  return (
    <div
      className={cn(
        "group relative flex items-center gap-4 rounded-full shadow-4xl border-4 border-white/50 backdrop-blur-3xl transition-all duration-700 hover:scale-110 hover:shadow-5xl",
        sizeMap[size],
        isPercentage
          ? "bg-gradient-to-br from-rose-600 via-red-600 to-rose-700 text-white"
          : "bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white",
        className
      )}
    >
      {isPercentage && <Percent className="h-10 w-10" />}
      <div className="text-4xl font-black">
        {isPercentage ? `−${discount.value}%` : `−${discount.value.toLocaleString("fa-IR")} تومان`}
      </div>
      <span className="pointer-events-none absolute inset-0 -translate-x-full rounded-full bg-white/30 transition-transform duration-1000 group-hover:translate-x-full" />
    </div>
  );
}