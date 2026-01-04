// src/components/common//Breadcrumb.tsx 

import Link from "next/link";
import { ChevronLeft, Home } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface BreadcrumbItem {
  label: string;
  href: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumb({ items, className }: BreadcrumbProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex flex-wrap items-center gap-6 py-10", className)}
    >
      <ol className="inline-flex flex-wrap items-center gap-6 text-xl font-medium">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isFirst = index === 0;

          return (
            <li key={item.href + index} className="flex items-center gap-6">
              {/* جداکننده (به جز اولین آیتم) */}
              {index > 0 && (
                <ChevronLeft
                  className="h-7 w-7 text-muted-foreground/50 flex-shrink-0 transition-all duration-500 hover:text-primary"
                  aria-hidden="true"
                />
              )}

              {/* آیتم فعلی یا لینک */}
              {isLast ? (
                <span
                  className={cn(
                    "text-4xl font-black bg-gradient-to-r from-primary via-violet-600 to-primary bg-clip-text text-transparent drop-shadow-2xl",
                    "animate-in fade-in slide-in-from-bottom-4 duration-1000"
                  )}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-5 rounded-full px-10 py-6 text-2xl font-bold transition-all duration-700",
                    "hover:scale-110 hover:shadow-3xl hover:-translate-y-1",
                    isFirst
                      ? "bg-gradient-to-br from-primary/15 via-violet-600/10 to-primary/15 text-primary shadow-2xl ring-4 ring-primary/30 backdrop-blur-xl"
                      : "bg-card/90 text-foreground/80 backdrop-blur-xl shadow-xl ring-2 ring-border/50 hover:bg-primary/10 hover:text-primary hover:ring-primary/30"
                  )}
                >
                  {/* آیکون خانه فقط برای اولین آیتم */}
                  {isFirst && (
                    <Home className="h-10 w-10 text-primary transition-all duration-700 group-hover:scale-125 group-hover:rotate-12 drop-shadow-xl" />
                  )}

                  <span className="relative">
                    {item.label}

                    {/* خط زیرین انیمیشنی پرمیوم */}
                    <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 h-2 w-0 rounded-full bg-gradient-to-r from-primary via-violet-600 to-primary shadow-xl transition-all duration-700 group-hover:w-full group-hover:left-0 group-hover:translate-x-0" />
                  </span>

                  {/* براق hover */}
                  <span className="pointer-events-none absolute inset-0 -translate-x-full rounded-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}