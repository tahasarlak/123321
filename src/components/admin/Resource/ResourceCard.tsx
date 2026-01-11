"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";
import { RESOURCES_BY_ROLE } from "@/config/resources";
import ResourceActions from "./ResourceActions";
import {
  DetailItem,
  ResourceAction,
  TagItem,
} from "@/types/resource-types";

interface ResourceCardProps<T extends { id: string }> {
  item: T;
  resourceKey:
    | keyof typeof RESOURCES_BY_ROLE.admin
    | keyof typeof RESOURCES_BY_ROLE.instructor
    | keyof typeof RESOURCES_BY_ROLE.blogger;
  isSelected: boolean;
  onToggleSelect: () => void;
  disabled?: boolean;
  getActions: (item: T) => ResourceAction[];
}

export default function ResourceCard<T extends { id: string }>({
  item,
  resourceKey,
  isSelected,
  onToggleSelect,
  disabled = false,
  getActions,
}: ResourceCardProps<T>) {
  const commonT = useTranslations("common");

  // دسترسی ایمن بدون assertion خطرناک
  const config = (
    RESOURCES_BY_ROLE.admin[resourceKey as keyof typeof RESOURCES_BY_ROLE.admin] ??
    RESOURCES_BY_ROLE.instructor[resourceKey as keyof typeof RESOURCES_BY_ROLE.instructor] ??
    RESOURCES_BY_ROLE.blogger[resourceKey as keyof typeof RESOURCES_BY_ROLE.blogger]
  ) as any; // اینجا any کاملاً ایمنه چون فقط برای خواندن card استفاده می‌شه

  if (!config?.card) {
    return (
      <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-2xl">
        {commonT("cardConfigMissing")}
      </div>
    );
  }

  const card = config.card;

  const cardData = useMemo(() => {
    try {
      // استفاده از any برای فراخوانی توابع کارت — کاملاً استاندارد و ایمن
      const safeItem: any = item;

      const title = card.title(safeItem) ?? commonT("untitled");
      const subtitle = card.subtitle?.(safeItem) ?? "";
      const avatar = card.avatar(safeItem) ?? "–";
      const badge = card.badge?.(safeItem) ?? null;

      const tags: TagItem[] = (card.tags?.(safeItem) ?? []).filter(
        (tag: any): tag is TagItem =>
          tag != null &&
          typeof tag === "object" &&
          typeof tag.text === "string" &&
          typeof tag.class === "string"
      );

      const details: DetailItem[] = (card.details?.(safeItem) ?? []).filter(
        (detail: any): detail is DetailItem =>
          detail != null &&
          typeof detail === "object" &&
          typeof detail.label === "string" &&
          typeof detail.value === "string"
      );

      const status = card.status?.(safeItem) ?? null;

      return { title, subtitle, avatar, badge, tags, details, status };
    } catch (err) {
      console.warn(`Card render error for resource ${resourceKey}:`, err);
      return {
        title: commonT("errorLoadingItem"),
        subtitle: "",
        avatar: "⚠️",
        badge: null,
        tags: [],
        details: [],
        status: null,
      };
    }
  }, [item, card, commonT, resourceKey]);

  const StatusIcon = cardData.status?.icon;
  const actions = useMemo(() => getActions(item), [getActions, item]);

  const cardId = `resource-card-${resourceKey}-${item.id}`;

  return (
    <article
      className={cn(
        "group relative bg-card/95 backdrop-blur-xl rounded-3xl shadow-xl overflow-hidden border-2 transition-all duration-300",
        isSelected
          ? "border-primary ring-4 ring-primary/30 scale-[1.02] shadow-2xl"
          : "border-border hover:border-primary/50 hover:shadow-2xl hover:scale-[1.01]",
        disabled && "opacity-60 pointer-events-none"
      )}
      aria-selected={isSelected}
      role="article"
    >
      <div className="relative h-44 sm:h-48 bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center">
        <input
          type="checkbox"
          id={cardId}
          checked={isSelected}
          onChange={onToggleSelect}
          disabled={disabled}
          className={cn(
            "absolute top-5 left-5 w-7 h-7 rounded border-4 accent-primary z-10 cursor-pointer transition",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          aria-label={commonT("selectItem", { name: cardData.title })}
        />
        <label htmlFor={cardId} className="absolute inset-0 cursor-pointer" aria-hidden="true" />

        <div className="w-32 h-32 bg-background/85 rounded-full flex items-center justify-center text-6xl font-black text-primary/90 shadow-xl ring-1 ring-primary/20">
          {cardData.avatar}
        </div>
      </div>

      <div className="p-7 sm:p-8 space-y-6">
        <div>
          <h3 className="font-black text-2xl leading-tight truncate" id={`${cardId}-title`}>
            {cardData.title}
          </h3>
          <p className="mt-1.5 text-lg text-muted-foreground truncate">{cardData.subtitle}</p>
        </div>

        {(cardData.badge || cardData.tags.length > 0) && (
          <div className="flex flex-wrap gap-2.5">
            {cardData.badge && (
              <span
                className={cn(
                  "px-4 py-1.5 rounded-full text-base font-semibold",
                  cardData.badge.class
                )}
              >
                {cardData.badge.text}
              </span>
            )}
            {cardData.tags.map((tag: TagItem) => (
              <span
                key={tag.text}
                className={cn("px-4 py-1.5 rounded-full text-base font-medium", tag.class)}
              >
                {tag.text}
              </span>
            ))}
          </div>
        )}

        {cardData.details.length > 0 && (
          <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-base text-muted-foreground">
            {cardData.details.map((detail: DetailItem) => (
              <div key={detail.label} className="contents">
                <dt className="font-medium">{detail.label}:</dt>
                <dd className="font-bold text-foreground">{detail.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {cardData.status && StatusIcon && (
          <div
            className={cn("flex items-center gap-3 font-bold text-base", cardData.status.color)}
            aria-live="polite"
          >
            <StatusIcon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span>{cardData.status.text}</span>
          </div>
        )}

        <ResourceActions actions={actions} disabled={disabled} />
      </div>
    </article>
  );
}