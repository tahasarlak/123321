// src/components/admin/EmptyState.tsx
import { PackageSearch } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function EmptyState({
  title = "هیچ موردی یافت نشد",
  description = "ممکن است جستجوی شما نتیجه‌ای نداشته باشد یا هنوز چیزی اضافه نشده باشد.",
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <PackageSearch className="w-24 h-24 text-muted-foreground/40 mb-8" />
      <h3 className="text-3xl font-black text-foreground mb-4">{title}</h3>
      <p className="text-xl text-muted-foreground max-w-md mb-10">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className={buttonVariants({ size: "lg" })}
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}