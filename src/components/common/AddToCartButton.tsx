// src/components/common/AddToCartButton.tsx
"use client";

import { useState, useTransition } from "react";
import { Loader2, ShoppingCart, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export interface AddToCartButtonProps {
  productId?: string;
  courseId?: string;
  stock?: number;
  isPurchased?: boolean;
  className?: string;
}

export default function AddToCartButton({
  productId,
  courseId,
  stock = Infinity,
  isPurchased = false,
  className,
}: AddToCartButtonProps) {
  const t = useTranslations("cart");
  const [isPending, startTransition] = useTransition();

  const isProduct = !!productId;
  const id = productId || courseId || "";

  const addToCart = () => {
    if (isPurchased) return;
    if (isProduct && stock <= 0) {
      toast.error(t("out_of_stock") || "این محصول موجود نیست");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: isProduct ? id : undefined,
            courseId: !isProduct ? id : undefined,
            quantity: 1,
          }),
        });

        if (res.ok) {
          toast.success(t("added") || "به سبد خرید اضافه شد", { duration: 4000 });
        } else {
          toast.error(t("add_error") || "خطا در افزودن به سبد خرید");
        }
      } catch {
        toast.error(t("network_error") || "مشکل ارتباط با سرور");
      }
    });
  };

  // حالت خریداری شده
  if (isPurchased) {
    return (
      <Button
        disabled
        size="lg"
        className={cn(
          "h-28 w-full rounded-4xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-600 text-white text-4xl font-black shadow-4xl ring-8 ring-emerald-500/30 backdrop-blur-xl",
          className
        )}
      >
        <Check className="h-16 w-16 mr-8 drop-shadow-2xl" />
        {t("purchased") || "خریداری شده"}
      </Button>
    );
  }

  // حالت ناموجود
  if (isProduct && stock <= 0) {
    return (
      <Button
        disabled
        size="lg"
        className={cn(
          "h-28 w-full rounded-4xl border-4 border-rose-500/50 bg-rose-50/30 text-rose-600 text-4xl font-black shadow-3xl backdrop-blur-xl ring-4 ring-rose-500/20",
          className
        )}
      >
        <span className="opacity-60">{t("out_of_stock") || "ناموجود"}</span>
      </Button>
    );
  }

  // حالت عادی
  return (
    <Button
      size="lg"
      onClick={addToCart}
      disabled={isPending}
      className={cn(
        "group relative h-28 w-full overflow-hidden rounded-4xl bg-gradient-to-br from-primary via-violet-600 to-primary text-white text-4xl font-black shadow-4xl ring-8 ring-primary/30 backdrop-blur-3xl transition-all duration-700 hover:shadow-5xl hover:scale-105 hover:ring-primary/50 active:scale-95",
        className
      )}
    >
      {/* براق hover */}
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />

      {/* پالس هنگام pending */}
      {isPending && (
        <>
          <span className="absolute inset-0 animate-ping rounded-4xl bg-white/20" />
          <span className="absolute inset-0 animate-ping animation-delay-300 rounded-4xl bg-white/10" />
        </>
      )}

      <span className="relative flex items-center justify-center gap-10">
        {isPending ? (
          <Loader2 className="h-16 w-16 animate-spin drop-shadow-2xl" />
        ) : (
          <ShoppingCart className="h-16 w-16 transition-all duration-700 group-hover:rotate-12 group-hover:scale-125 drop-shadow-2xl" />
        )}
        <span className="drop-shadow-2xl">
          {isPending ? t("adding") || "در حال افزودن..." : t("add_to_cart") || "افزودن به سبد خرید"}
        </span>
      </span>
    </Button>
  );
}