// src/components/admin/AdminGrid.tsx یا ResourceGrid.tsx
"use client";

import { ReactNode, useMemo } from "react";
import { cn } from "@/lib/utils/cn";
import React from "react";
import EmptyState from "../user-form/sections/EmptyState";

interface AdminGridProps {
  /** تعداد ستون‌ها در breakpoints مختلف */
  columns?: {
    default?: 1 | 2 | 3 | 4 | 5 | 6;
    sm?: 1 | 2 | 3 | 4 | 5 | 6;
    md?: 1 | 2 | 3 | 4 | 5 | 6;
    lg?: 1 | 2 | 3 | 4 | 5 | 6;
    xl?: 1 | 2 | 3 | 4 | 5 | 6;
  };
  /** فاصله بین آیتم‌ها */
  gap?: "sm" | "md" | "lg" | "xl";
  children: ReactNode;
  className?: string;
  /** پیام وقتی لیست خالیه */
  emptyMessage?: string;
  /** آیا در حال لود هست؟ */
  isLoading?: boolean;
}

const breakpointMap: Record<string, string> = {
  default: "",
  sm: "sm:",
  md: "md:",
  lg: "lg:",
  xl: "xl:",
};

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
  emptyMessage = "هیچ موردی یافت نشد",
  isLoading = false,
}: AdminGridProps) {
  const gridClasses = useMemo(() => {
    const classes: string[] = ["grid", "auto-rows-fr"];

    (Object.keys(breakpointMap) as Array<keyof typeof breakpointMap>).forEach((bp) => {
      const count = bp === "default" ? columns.default : columns[bp as keyof typeof columns];
      const prefix = breakpointMap[bp];
      const colClass = getColClass(count, prefix);
      if (colClass) classes.push(colClass);
    });

    classes.push(gapClasses[gap]);

    return classes.filter(Boolean).join(" ");
  }, [columns, gap]);

  // اگر children خالی باشه و لودینگ نباشه → EmptyState
  const hasChildren = React.Children.count(children) > 0;

  if (!hasChildren && !isLoading) {
    return <EmptyState title={emptyMessage} />;
  }

  return (
    <div
      className={cn(gridClasses, className)}
      role="grid"
      aria-label="لیست آیتم‌ها"
    >
      {children}
    </div>
  );
}