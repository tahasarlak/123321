"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { ComponentType, memo, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { ResourceAction } from "@/types/resource-types";


interface ResourceActionsProps {
  actions: ResourceAction[];
  disabled?: boolean; // برای کنترل کلی از بیرون (مثل کارت disabled)
}

const ResourceActions = memo(function ResourceActions({
  actions,
  disabled = false,
}: ResourceActionsProps) {
  const tCommon = useTranslations("common");
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null);

  const handleClick = async (action: ResourceAction) => {
    if (!action.onClick || action.href) return;

    const label = action.label;
    setLoadingLabel(label);

    try {
      await action.onClick();
    } catch (error) {
      toast.error(`${label} ناموفق بود`, {
        description: tCommon("actionFailedDesc"),
      });
    } finally {
      setLoadingLabel(null);
    }
  };

  if (actions.length === 0) return null;

  return (
    <div
      className="flex items-center gap-3 flex-wrap"
      role="group"
      aria-label={tCommon("actions") || "عملیات"}
    >
      {actions.map((action) => {
        const Icon = action.icon;
        const isLoading = loadingLabel === action.label;
        const isDisabled = disabled || action.disabled || isLoading;
        const variant = action.destructive ? "destructive" : action.variant ?? "ghost";
        const size = action.size ?? "icon";
        const isIconOnly = size === "icon";

        // اندازه آیکن بر اساس size
        const iconSizeClass = {
          default: "h-5 w-5",
          sm: "h-4 w-4",
          lg: "h-6 w-6",
          icon: "h-5 w-5", // برای icon-only بزرگتر و بهتر دیده بشه
        }[size];

        // متن نمایش داده شده: اولویت با text، در غیر اینصورت label (فقط اگر icon-only نباشه)
        const displayText = !isIconOnly ? (action.text ?? action.label) : null;

        const buttonContent = (
          <span className={cn("flex items-center", displayText ? "gap-2.5" : "gap-0")}>
            {isLoading ? (
              <Loader2 className={cn("animate-spin", iconSizeClass)} />
            ) : (
              <Icon className={iconSizeClass} />
            )}
            {displayText && <span className="font-medium">{displayText}</span>}
          </span>
        );

        const sharedClasses = cn(
          buttonVariants({ variant, size }),
          "relative overflow-hidden transition-all duration-200",
          "hover:scale-105 active:scale-95 focus-visible:ring-4 focus-visible:ring-primary/50",
          isDisabled && "opacity-60 cursor-not-allowed"
        );

        // Ripple effect بهتر و سازگار با همه variantها
        const ripple = (
          <span
            className={cn(
              "absolute inset-0 opacity-0 transition-opacity duration-200 pointer-events-none",
              "group-hover:opacity-15 group-active:opacity-25",
              variant === "destructive" ? "bg-destructive/50" : "bg-primary/30"
            )}
            aria-hidden="true"
          />
        );

        // Tooltip: همیشه از label یا text استفاده کن
        const tooltip = displayText ?? action.label;

        const uniqueKey = action.href
          ? `link-${action.label}-${action.href}`
          : `btn-${action.label}`;

        const buttonElement = (
          <div className="relative group"> {/* group واقعی برای ripple */}
            {buttonContent}
            {ripple}
          </div>
        );

        if (action.href) {
          return (
            <Link
              key={uniqueKey}
              href={action.href}
              className={cn(sharedClasses, "inline-flex items-center justify-center")}
              aria-label={action.label}
              title={tooltip}
            >
              {buttonElement}
            </Link>
          );
        }

        return (
          <Button
            key={uniqueKey}
            variant={variant}
            size={size}
            onClick={() => handleClick(action)}
            disabled={isDisabled}
            aria-label={action.label}
            title={tooltip}
            className={sharedClasses}
          >
            {buttonElement}
          </Button>
        );
      })}
    </div>
  );
});

ResourceActions.displayName = "ResourceActions";

export default ResourceActions;