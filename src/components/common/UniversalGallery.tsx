// src/components/common/UniversalGallery.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import LikeButton from "./LikeButton";
import { useLocale } from "next-intl";

export interface UniversalGalleryProps {
  images?: string[];
  discountBadge?: {
    type: "PERCENTAGE" | "FIXED";
    value: number;
  };
  likeId: string;
  likeType: "post" | "course" | "product";
  initialLiked?: boolean;
}

export default function UniversalGallery({
  images = [],
  discountBadge,
  likeId,
  likeType,
  initialLiked = false,
}: UniversalGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string>("");
  const locale = useLocale();
  const isRTL = locale === "fa";

  // Ref برای هر thumbnail
  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (images.length > 0 && !selectedImage) {
      setSelectedImage(images[0]);
    }
  }, [images, selectedImage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (images.length <= 1) return;
      const currentIndex = images.indexOf(selectedImage);
      if (currentIndex === -1) return;
      let nextIndex: number | null = null;
      if (e.key === "ArrowRight" || (!isRTL && e.key === "ArrowLeft")) {
        nextIndex = (currentIndex + 1) % images.length;
      } else if (e.key === "ArrowLeft" || (isRTL && e.key === "ArrowRight")) {
        nextIndex = (currentIndex - 1 + images.length) % images.length;
      }
      if (nextIndex !== null) {
        setSelectedImage(images[nextIndex]);
        thumbnailRefs.current[nextIndex]?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImage, images, isRTL]);

  const hasDiscount = !!discountBadge;
  const hasMultipleImages = images.length > 1;

  if (images.length === 0) {
    return (
      <Card className="flex aspect-square items-center justify-center rounded-4xl bg-gradient-to-br from-muted/60 to-muted/30 backdrop-blur-3xl border border-border/60 shadow-3xl ring-2 ring-white/20 transition-all duration-700 hover:ring-primary/40 hover:shadow-4xl">
        <div className="text-center space-y-6">
          <div className="h-28 w-28 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-violet-600/20 flex items-center justify-center shadow-2xl">
            <Image src="/icons/image-off.svg" alt="تصویری موجود نیست" width={80} height={80} className="opacity-40" />
          </div>
          <div>
            <p className="text-3xl font-black text-foreground/80">تصویری موجود نیست</p>
            <p className="text-lg text-muted-foreground mt-2">به‌زودی اضافه می‌شود</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-10 w-full" dir={isRTL ? "rtl" : "ltr"}>
      {/* تصویر اصلی */}
      <Card
        className={cn(
          "group relative overflow-hidden rounded-4xl shadow-4xl ring-4 ring-primary/10 bg-card/98 backdrop-blur-3xl",
          "transition-all duration-1000 hover:shadow-5xl hover:ring-primary/40 hover:-translate-y-3 hover:scale-[1.015]"
        )}
      >
        <div className="relative aspect-square w-full">
          <Image
            src={selectedImage || "/placeholder.jpg"}
            alt="تصویر اصلی"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1400px) 70vw, 50vw"
            className="object-cover transition-all duration-1500 ease-out group-hover:scale-110"
            priority
            quality={98}
          />
          {hasDiscount && (
            <Badge
              variant="destructive"
              size="xl"
              className={cn(
                "absolute z-40 rounded-full px-10 py-6 text-2xl font-black tracking-tighter shadow-4xl border-4 border-white/50 backdrop-blur-3xl animate-pulse",
                "bg-gradient-to-br from-rose-600 via-red-600 to-rose-700",
                isRTL ? "left-8 top-8" : "right-8 top-8"
              )}
            >
              {discountBadge.type === "PERCENTAGE"
                ? `−${discountBadge.value}%`
                : `−${discountBadge.value.toLocaleString("fa-IR")} تومان`}
            </Badge>
          )}
          <div
            className={cn(
              "absolute z-40 rounded-full bg-white/90 backdrop-blur-3xl p-5 shadow-4xl ring-4 ring-white/40 transition-all duration-500 hover:bg-white hover:shadow-5xl hover:scale-115 hover:ring-white/60",
              isRTL ? "right-8 top-8" : "left-8 top-8"
            )}
          >
            <LikeButton id={likeId} type={likeType} initialLiked={initialLiked} size={32} />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 transition-opacity duration-1000 group-hover:opacity-100" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-violet-600/10 opacity-0 transition-opacity duration-1000 group-hover:opacity-100" />
        </div>
      </Card>

      {/* تامبنیل‌ها */}
      {hasMultipleImages && (
        <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-6">
          {images.map((img, index) => {
            const isSelected = selectedImage === img;
            return (
              <button
                key={index}
                ref={(el) => {
                  thumbnailRefs.current[index] = el;
                }}
                onClick={() => setSelectedImage(img)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedImage(img);
                  }
                }}
                aria-label={`نمایش تصویر ${index + 1}`}
                aria-pressed={isSelected}
                tabIndex={0}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-3xl border-4 transition-all duration-700 focus:outline-none focus:ring-4 focus:ring-primary/50 focus:scale-110",
                  isSelected
                    ? "border-primary shadow-4xl ring-8 ring-primary/40 scale-110 z-40"
                    : "border-border/50 hover:border-primary/80 hover:shadow-3xl hover:scale-105 hover:z-20 bg-muted/30"
                )}
              >
                <Image
                  src={img}
                  alt={`تصویر ${index + 1}`}
                  fill
                  className="object-cover transition-transform duration-1200 group-hover:scale-125"
                  sizes="(max-width: 768px) 20vw, 12vw"
                  loading="lazy"
                />
                {isSelected && <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-primary/30 to-transparent rounded-3xl" />}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
                {isSelected && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/95 backdrop-blur-2xl px-5 py-3 shadow-3xl">
                    <span className="text-xl font-black text-primary drop-shadow-2xl">
                      {index + 1}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}