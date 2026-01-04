// src/components/ui/ReadMore.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useTranslations } from "next-intl";

interface ReadMoreProps {
  children?: string;
  maxHeight?: number;
  expandText?: string;
  collapseText?: string;
  className?: string;
  buttonClassName?: string;
  gradient?: boolean;
}

export default function ReadMore({
  children: rawContent = "",
  maxHeight = 400,
  expandText,
  collapseText,
  className,
  buttonClassName,
  gradient = true,
}: ReadMoreProps) {
  const t = useTranslations("common");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const isHtml = typeof rawContent === "string" && rawContent.trim().startsWith("<");

  const processedContent = isHtml
    ? rawContent
    : rawContent.trim()
    ? rawContent
        .replace(/\n\s*\n/g, "</p><p class='mb-12 leading-loose'>")
        .replace(/\n/g, "<br />")
        .split("</p><p")
        .map((p, i) =>
          i === 0
            ? `<p class="mb-12 leading-loose text-lg text-foreground/90">${p.trim()}</p>`
            : `<p class="mb-12 leading-loose text-lg text-foreground/90">${p.trim()}</p>`
        )
        .join("")
    : `<p class="text-muted-foreground italic text-center py-32 text-2xl">${t("no_description") || "توضیحات به‌زودی اضافه می‌شود..."}</p>`;

  useEffect(() => {
    if (!contentRef.current) return;
    const el = contentRef.current;
    el.style.maxHeight = "none";
    const fullHeight = el.scrollHeight;
    const needTruncate = fullHeight > maxHeight + 50;
    setIsTruncated(needTruncate);
    if (!needTruncate) setIsExpanded(true);
    if (needTruncate && !isExpanded) {
      el.style.maxHeight = `${maxHeight}px`;
    }
  }, [processedContent, maxHeight, isExpanded]);

  useEffect(() => {
    if (!contentRef.current || !isTruncated) return;
    const el = contentRef.current;
    if (isExpanded) {
      el.style.maxHeight = `${el.scrollHeight}px`;
      const onEnd = () => {
        el.style.maxHeight = "none";
        el.removeEventListener("transitionend", onEnd);
      };
      el.addEventListener("transitionend", onEnd);
    } else {
      el.style.maxHeight = `${el.scrollHeight}px`;
      void el.offsetHeight;
      el.style.maxHeight = `${maxHeight}px`;
    }
  }, [isExpanded, isTruncated, maxHeight]);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={contentRef}
        className="prose prose-lg max-w-none text-foreground/90 leading-loose break-words hyphens-auto transition-max-height duration-800 ease-in-out overflow-hidden"
        style={{ maxHeight: isTruncated && !isExpanded ? `${maxHeight}px` : "none" }}
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />

      {gradient && isTruncated && !isExpanded && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-background via-background/90 to-transparent" />
      )}

      {isTruncated && (
        <div className="mt-20 flex justify-center">
          <Button
            variant="outline"
            size="lg" // فیکس: xl نداریم → lg + className برای بزرگ‌تر
            onClick={() => setIsExpanded((prev) => !prev)}
            className={cn(
              "group relative flex h-24 min-w-96 items-center justify-center gap-8 rounded-full border-4 px-20 py-10 text-3xl font-black shadow-3xl backdrop-blur-3xl transition-all duration-700",
              "bg-card/95 hover:bg-gradient-to-r hover:from-primary/10 hover:via-violet-600/10 hover:to-primary/10",
              "border-primary/30 hover:border-primary/50",
              "text-foreground hover:text-primary hover:shadow-4xl hover:scale-105",
              buttonClassName
            )}
          >
            <span className="relative flex items-center gap-8">
              {isExpanded ? (collapseText || t("show_less")) : (expandText || t("show_more"))}
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 h-3 w-64 rounded-full bg-gradient-to-r from-primary via-violet-600 to-primary scale-x-0 transition-transform duration-700 group-hover:scale-x-100 shadow-xl" />
            </span>
            <ChevronDown
              className={cn(
                "h-12 w-12 transition-all duration-700",
                isExpanded && "rotate-180",
                "group-hover:scale-125 group-hover:text-primary drop-shadow-xl"
              )}
            />
          </Button>
        </div>
      )}
    </div>
  );
}