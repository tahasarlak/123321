// src/components/admin/AdminGrid.tsx
"use client";

import { ReactNode, useMemo } from "react";
import { cn } from "@/lib/utils/cn";
import EmptyState from "../user-form/sections/EmptyState";
import React from "react";

interface AdminGridProps {
  columns?: {
    default?: 1 | 2 | 3 | 4 | 5 | 6;
    sm?: 1 | 2 | 3 | 4 | 5 | 6;
    md?: 1 | 2 | 3 | 4 | 5 | 6;
    lg?: 1 | 2 | 3 | 4 | 5 | 6;
    xl?: 1 | 2 | 3 | 4 | 5 | 6;
  };
  gap?: "sm" | "md" | "lg" | "xl";
  children: ReactNode;
  className?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  emptyActionHref?: string;
}

const breakpointMap = {
  default: "",
  sm: "sm:",
  md: "md:",
  lg: "lg:",
  xl: "xl:",
} as const;

const getColClass = (count: number | undefined, prefix: string): string => {
  if (!count) return "";
  return `${prefix}grid-cols-${count}`;
};

const gapClasses = {
  sm: "gap-6",
  md: "gap-10",
  lg: "gap-12",
  xl: "gap-16",
} as const;

export default function AdminGrid({
  columns = { default: 1, md: 2, lg: 3, xl: 4 },
  gap = "lg",
  children,
  className,
  emptyTitle = "هیچ موردی یافت نشد",
  emptyDescription = "ممکن است جستجوی شما نتیجه‌ای نداشته باشد یا هنوز چیزی اضافه نشده باشد.",
  emptyActionLabel,
  emptyActionHref,
}: AdminGridProps) {
  const gridClasses = useMemo(() => {
    const classes = ["grid", "auto-rows-fr"];

    (Object.keys(breakpointMap) as Array<keyof typeof breakpointMap>).forEach((bp) => {
      const count = bp === "default" ? columns.default : columns[bp as keyof typeof columns];
      const prefix = breakpointMap[bp];
      const colClass = getColClass(count, prefix);
      if (colClass) classes.push(colClass);
    });

    classes.push(gapClasses[gap]);
    return classes.join(" ");
  }, [columns, gap]);

  const hasChildren = React.Children.count(children) > 0;

  if (!hasChildren) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        actionHref={emptyActionHref}
      />
    );
  }

  return (
    <div className={cn(gridClasses, className)} role="grid" aria-label="لیست آیتم‌ها">
      {children}
    </div>
  );
}