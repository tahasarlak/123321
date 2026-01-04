// src/components/ui/card.tsx
import * as React from "react";
import { cn } from "@/lib/utils/cn";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="article"
    data-slot="card"
    className={cn(
      "relative overflow-hidden rounded-3xl bg-card/95 backdrop-blur-2xl border border-border/50 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 transition-all duration-500",
      "hover:shadow-3xl hover:ring-primary/30 hover:-translate-y-2 hover:scale-[1.005]",
      "before:absolute before:inset-0 before:bg-gradient-to-t before:from-black/10 before:via-transparent before:to-transparent before:opacity-0 before:transition-opacity before:duration-700 hover:before:opacity-100",
      "after:absolute after:inset-0 after:bg-gradient-to-br after:from-primary/5 after:via-transparent after:to-violet-600/5 after:opacity-0 after:transition-opacity after:duration-1000 hover:after:opacity-100",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-header"
    className={cn("px-8 pt-10 pb-6 space-y-4", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    data-slot="card-title"
    className={cn(
      "text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/80 bg-clip-text text-transparent drop-shadow-sm",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    data-slot="card-description"
    className={cn("text-lg text-muted-foreground leading-relaxed", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-content"
    className={cn("px-8 pb-10 space-y-8", className)}
    {...props}
  />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-footer"
    className={cn(
      "px-8 py-8 border-t border-border/50 bg-gradient-to-t from-muted/30 to-transparent backdrop-blur-sm",
      className
    )}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

const CardAction = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-action"
    className={cn("absolute top-6 right-6 flex gap-3", className)}
    {...props}
  />
));
CardAction.displayName = "CardAction";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
};