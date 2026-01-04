// src/components/common/ShareButton.tsx
"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface ShareButtonProps {
  title: string;
  size?: "default" | "lg" | "xl";
  className?: string;
}

export default function ShareButton({
  title,
  size = "default",
  className,
}: ShareButtonProps) {
  const t = useTranslations("common");
  const [copied, setCopied] = useState(false);

  const sizeMap = {
    default: "h-16 w-16 p-4",
    lg: "h-20 w-20 p-5",
    xl: "h-24 w-24 p-6",
  };

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // کاربر کنسل کرد — هیچی نکن
      }
    } else {
      // fallback به کپی لینک
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("link_copied") || "لینک با موفقیت کپی شد!", { duration: 3000 });
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <button
      onClick={handleShare}
      aria-label={t("share") || "اشتراک‌گذاری"}
      className={cn(
        "group relative rounded-full bg-gradient-to-br from-primary/10 via-violet-600/10 to-primary/10 p-1 shadow-3xl ring-4 ring-primary/20 backdrop-blur-3xl transition-all duration-700 hover:shadow-4xl hover:scale-110 hover:ring-primary/40",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-white/90 dark:bg-white/10 backdrop-blur-3xl transition-all duration-700",
          sizeMap[size],
          "group-hover:bg-gradient-to-br group-hover:from-primary/20 group-hover:to-violet-600/20"
        )}
      >
        {copied ? (
          <Check className="h-10 w-10 text-emerald-600 drop-shadow-xl" />
        ) : (
          <Share2
            className={cn(
              "text-primary transition-all duration-700 group-hover:scale-125",
              size === "default" && "h-10 w-10",
              size === "lg" && "h-12 w-12",
              size === "xl" && "h-14 w-14"
            )}
          />
        )}
      </div>

      {/* پالس hover */}
      <span className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-1000 group-hover:opacity-100 ring-12 ring-primary/30" />

      {/* ذرات چک هنگام کپی */}
      {copied && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ animation: `floatUp 1s ${i * 80}ms ease-out forwards` }}
            >
              <Check className="h-6 w-6 text-emerald-500 fill-emerald-500 opacity-0 animate-fade-in" />
            </div>
          ))}
        </div>
      )}
    </button>
  );
}