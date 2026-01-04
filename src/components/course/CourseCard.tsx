// src/components/course/CourseCard.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Users, Clock } from "lucide-react";
import LikeButton from "../common/LikeButton";
import DiscountBadge from "../common/DiscountBadge";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils/cn";

interface CourseCardProps {
  id: string;
  title: string;
  instructor: string;
  price: any;
  oldPrice?: any;
  duration: string;
  students: number;
  image?: string;
  isLive?: boolean;
  reviewsCount?: number;
  isLiked?: boolean;
}

export default function CourseCard({
  id,
  title,
  instructor,
  price,
  oldPrice,
  duration,
  students,
  image = "/placeholder-course.jpg",
  isLive = false,
  reviewsCount = 0,
  isLiked = false,
}: CourseCardProps) {
  const t = useTranslations("course");
  const locale = useLocale();
  const isRTL = locale === "fa";

  const priceIRR = Number(price?.IRR || 0);
  const oldPriceIRR = Number(oldPrice?.IRR || 0);
  const discountPercent = oldPriceIRR > priceIRR ? Math.round(((oldPriceIRR - priceIRR) / oldPriceIRR) * 100) : 0;

  return (
    <div className="group relative bg-card rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-700 overflow-hidden transform hover:-translate-y-6 border border-border/50">
      {/* Like Button */}
      <div className={cn("absolute top-6 z-20", isRTL ? "left-6" : "right-6")}>
        <LikeButton id={id} type="course" initialLiked={isLiked} size={32} />
      </div>

      {/* Discount Badge */}
      {discountPercent > 0 && (
        <div className={cn("absolute top-6 z-10", isRTL ? "right-6" : "left-6")}>
          <DiscountBadge discount={{ type: "PERCENTAGE", value: discountPercent }} />
        </div>
      )}

      {/* Live Badge */}
      {isLive && (
        <div className={cn("absolute top-6 z-10", isRTL ? "right-6" : "left-6")}>
          <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-8 py-4 rounded-full font-black text-2xl shadow-2xl flex items-center gap-3 animate-pulse">
            <span className="w-4 h-4 bg-white rounded-full animate-ping" />
            {t("live") || "LIVE"}
          </div>
        </div>
      )}

      {/* Image */}
      <Link href={`/courses/${id}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10">
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-1000"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={false}
            placeholder="blur"
            blurDataURL="/placeholder.jpg"
          />
        </div>
      </Link>

      {/* Content */}
      <div className="p-8 space-y-6">
        {/* Title */}
        <Link href={`/courses/${id}`}>
          <h3 className="text-2xl font-black text-foreground line-clamp-2 group-hover:text-primary transition duration-300">
            {title}
          </h3>
        </Link>

        {/* Instructor */}
        <p className="text-lg font-bold text-primary">{instructor}</p>

        {/* Info */}
        <div className="flex items-center justify-between text-muted-foreground">
          <div className="flex items-center gap-3">
            <Clock size={22} />
            <span className="font-medium">{duration}</span>
          </div>
          <div className="flex items-center gap-3">
            <Users size={22} />
            <span className="font-medium">{students.toLocaleString("fa-IR")} {t("students") || "دانشجو"}</span>
          </div>
        </div>

        {/* Reviews (temporary stars) */}
        <div className="flex items-center gap-3">
          <div className="flex text-yellow-500 text-xl">{"★★★★★"}</div>
          <span className="text-muted-foreground font-medium">
            ({reviewsCount.toLocaleString("fa-IR")} {t("reviews") || "نظر"})
          </span>
        </div>

        {/* Price */}
        <div className="pt-6 border-t border-border/30">
          {discountPercent > 0 ? (
            <div className="space-y-3">
              <p className="text-3xl text-muted-foreground line-through">
                {oldPriceIRR.toLocaleString("fa-IR")} {t("toman") || "تومان"}
              </p>
              <p className="text-5xl font-black text-success">
                {priceIRR.toLocaleString("fa-IR")} {t("toman") || "تومان"}
              </p>
            </div>
          ) : (
            <p className="text-5xl font-black text-primary">
              {priceIRR.toLocaleString("fa-IR")} {t("toman") || "تومان"}
            </p>
          )}
        </div>

        {/* Action Button */}
        <Link
          href={`/courses/${id}`}
          className="block text-center bg-gradient-to-r from-primary to-secondary text-white py-6 rounded-2xl font-black text-2xl hover:shadow-3xl hover:scale-105 transition-all shadow-2xl"
        >
          {t("enroll_button") || "مشاهده و ثبت‌نام"}
        </Link>
      </div>
    </div>
  );
}