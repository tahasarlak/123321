// src/components/common/ItemsGrid.tsx
import { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface ItemsGridProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  columns?: 2 | 3 | 4 | 5 | 6;
  gap?: "sm" | "md" | "lg";
  className?: string;
}

export default function ItemsGrid({
  title,
  subtitle,
  children,
  columns = 4,
  gap = "lg",
  className,
}: ItemsGridProps) {
  const colClasses = {
    2: "grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
    6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
  };

  const gapClasses = {
    sm: "gap-8",
    md: "gap-12",
    lg: "gap-16",
  };

  return (
    <section className={cn("mt-48 scroll-mt-32", className)} id={title.replace(/\s+/g, "-").toLowerCase()}>
      {/* هدر لوکس */}
      <div className="relative mb-32 text-center overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-transparent to-transparent opacity-60" />
        <h2 className={cn(
          "relative inline-block bg-gradient-to-r from-primary via-violet-600 to-primary bg-clip-text text-7xl md:text-8xl lg:text-9xl font-black text-transparent leading-tight tracking-tight",
          "drop-shadow-2xl"
        )}>
          {title}
        </h2>
        {subtitle && (
          <p className="mx-auto mt-12 max-w-6xl text-3xl md:text-4xl text-foreground/85 font-medium leading-relaxed drop-shadow-md">
            {subtitle}
          </p>
        )}
        <div className="relative mx-auto mt-16 h-3 w-96 md:w-[28rem] lg:w-[36rem] rounded-full bg-gradient-to-r from-primary via-violet-600 to-primary shadow-2xl shadow-primary/40 overflow-hidden">
          <div className="absolute inset-0 bg-white/30 translate-x-[-100%] animate-shine" />
        </div>
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute left-1/3 top-1/3 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl animate-pulse animation-delay-1000" />
          <div className="absolute right-1/3 bottom-1/3 w-80 h-80 bg-primary/15 rounded-full blur-3xl animate-pulse animation-delay-2000" />
        </div>
      </div>

      {/* گرید */}
      <div className={cn("grid auto-rows-fr place-items-center", colClasses[columns], gapClasses[gap])}>
        {children}
      </div>
    </section>
  );
}