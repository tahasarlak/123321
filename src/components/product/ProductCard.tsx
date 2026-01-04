// src/components/product/ProductCard.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Package, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import LikeButton from "@/components/common/LikeButton";
import DiscountBadge from "../common/DiscountBadge";

interface ProductCardProps {
  id: string;
  title: string;
  slug?: string;
  price: number;
  image?: string | null;
  stock: number;
  brand?: string | null;
  reviewsCount?: number;
  isLiked?: boolean;
  discountPercent?: number;
  maxDiscountAmount?: number;
}

export default function ProductCard({
  id,
  title,
  slug,
  price,
  image,
  stock,
  brand,
  reviewsCount = 0,
  isLiked = false,
  discountPercent = 0,
  maxDiscountAmount,
}: ProductCardProps) {
  const t = useTranslations("product");
  const [adding, setAdding] = useState(false);

  const productUrl = slug ? `/products/${slug}` : `/products/${id}`;
  const inStock = stock > 0;
  const hasDiscount = discountPercent > 0;

  let finalPrice = price;
  if (hasDiscount) {
    const discountAmount = (price * discountPercent) / 100;
    const capped = maxDiscountAmount ? Math.min(discountAmount, maxDiscountAmount) : discountAmount;
    finalPrice = Math.round(price - capped);
  }

  const imageUrl = image || "/images/placeholder-product.jpg";

  const handleAddToCart = async () => {
    if (!inStock) {
      toast.error(t("out_of_stock") || "این محصول موجود نیست");
      return;
    }

    setAdding(true);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id, quantity: 1 }),
      });

      if (res.ok) {
        toast.success(t("added_to_cart") || "به سبد خرید اضافه شد");
      } else {
        toast.error(t("add_error") || "خطا در افزودن به سبد خرید");
      }
    } catch {
      toast.error(t("network_error") || "مشکل ارتباط با سرور");
    } finally {
      setAdding(false);
    }
  };

  return (
    <Card className="group relative overflow-hidden rounded-4xl bg-card/98 backdrop-blur-3xl shadow-3xl ring-4 ring-border/30 transition-all duration-1000 hover:shadow-5xl hover:ring-primary/40 hover:-translate-y-6 hover:scale-[1.02]">
      {/* لایک */}
      <div className="absolute top-8 right-8 z-50">
        <LikeButton id={id} type="product" initialLiked={isLiked} />
      </div>

      {/* تخفیف */}
      {hasDiscount && (
        <div className="absolute top-8 left-8 z-50">
          <DiscountBadge discount={{ type: "PERCENTAGE", value: discountPercent }} />
        </div>
      )}

      {/* تصویر */}
      <Link href={productUrl} className="block relative">
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-muted/40 to-muted/20">
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-all duration-1500 group-hover:scale-115"
            loading="lazy"
          />
          {!inStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-xl">
              <span className="text-6xl md:text-7xl font-black text-white drop-shadow-3xl">
                {t("out_of_stock") || "ناموجود"}
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* محتوا */}
      <div className="space-y-8 p-10">
        {brand && (
          <p className="text-lg font-bold uppercase tracking-wider text-primary drop-shadow-md">
            {brand}
          </p>
        )}
        <Link href={productUrl}>
          <h3 className="line-clamp-2 text-3xl md:text-4xl font-black text-foreground transition-all duration-700 group-hover:text-primary drop-shadow-md">
            {title}
          </h3>
        </Link>

        {reviewsCount > 0 && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Star className="h-10 w-10 fill-yellow-400 text-yellow-400 drop-shadow-xl" />
              <span className="text-2xl font-bold text-foreground">
                {reviewsCount.toLocaleString("fa-IR")}
              </span>
            </div>
            <span className="text-xl text-muted-foreground">{t("reviews") || "نظر"}</span>
          </div>
        )}

        <div className="flex items-center gap-6">
          <Package className={cn("h-12 w-12", inStock ? "text-emerald-600" : "text-rose-600")} />
          <span className={cn("text-2xl font-bold", inStock ? "text-emerald-600" : "text-rose-600")}>
            {inStock ? t("in_stock") || "موجود در انبار" : t("out_of_stock") || "ناموجود"}
          </span>
        </div>

        <div className="border-t-4 border-dashed border-primary/20 pt-8 space-y-4">
          {hasDiscount ? (
            <>
              <p className="text-3xl text-muted-foreground line-through opacity-70">
                {price.toLocaleString("fa-IR")} {t("toman") || "تومان"}
              </p>
              <p className="text-6xl font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 bg-clip-text text-transparent drop-shadow-2xl">
                {finalPrice.toLocaleString("fa-IR")} {t("toman") || "تومان"}
              </p>
            </>
          ) : (
            <p className="text-6xl font-black bg-gradient-to-r from-primary via-violet-600 to-primary bg-clip-text text-transparent drop-shadow-2xl">
              {price.toLocaleString("fa-IR")} {t("toman") || "تومان"}
            </p>
          )}
        </div>

        <Button
          onClick={handleAddToCart}
          disabled={!inStock || adding}
          className={cn(
            "group/btn relative h-24 w-full overflow-hidden rounded-4xl text-3xl font-black shadow-4xl transition-all duration-700",
            inStock
              ? "bg-gradient-to-r from-primary via-violet-600 to-primary text-white hover:shadow-5xl hover:scale-105"
              : "bg-muted/50 text-muted-foreground cursor-not-allowed"
          )}
        >
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-1000 group-hover/btn:translate-x-full" />
          <span className="relative flex items-center justify-center gap-8">
            {adding ? (
              t("adding") || "در حال افزودن..."
            ) : (
              <>
                <ShoppingCart className="h-14 w-14 transition-all duration-700 group-hover/btn:scale-125 group-hover/btn:rotate-12 drop-shadow-2xl" />
                {t("add_to_cart") || "افزودن به سبد خرید"}
              </>
            )}
          </span>
        </Button>
      </div>
    </Card>
  );
}