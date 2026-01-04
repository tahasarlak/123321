// src/components/ui/badge.tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-bold whitespace-nowrap transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-60 shadow-lg backdrop-blur-xl",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-primary/20 hover:bg-primary/90 hover:shadow-xl hover:scale-105",
        secondary:
          "bg-secondary text-secondary-foreground border-secondary/20 hover:bg-secondary/90 hover:shadow-xl hover:scale-105",
        destructive:
          "bg-gradient-to-br from-rose-600 to-red-600 text-white border-rose-600/30 shadow-2xl hover:shadow-3xl hover:scale-110",
        outline:
          "border-2 border-primary/50 bg-background/80 text-primary hover:bg-primary/10 hover:border-primary hover:shadow-xl hover:scale-105",
        success:
          "bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-emerald-600/30 shadow-2xl hover:shadow-3xl hover:scale-110",
        premium:
          "bg-gradient-to-br from-violet-600 via-purple-600 to-pink-600 text-white border-purple-600/30 shadow-2xl hover:shadow-3xl hover:scale-110 animate-pulse",
      },
      size: {
        default: "h-10 px-6 text-sm",
        sm: "h-8 px-4 text-xs",
        lg: "h-12 px-8 text-base",
        xl: "h-16 px-12 text-lg font-black",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

function Badge({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp
      role="status"
      aria-live="polite"
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };

