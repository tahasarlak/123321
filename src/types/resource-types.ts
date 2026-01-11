// src/types/resource-types.ts
import type { LucideIcon } from "lucide-react";
import { ComponentType } from "react";
import type {
  RESOURCES_BY_ROLE,
} from "@/config/resources";
export type StatConfig = {
  label: string;
  icon: LucideIcon;
  color: string;
};
export type FilterOptionWithCount = FilterOption & { count?: number };
export type FilterStatsItem = { key: string; count: number };
export interface FiltersState {
  search: string;
  filters: Record<string, string>;
}
export type BulkAction = {
  label: string;
  action: string;
  icon: React.ReactNode;
  color: string;
};


export type FilterOption = {
  value: string;
  label: string;
  icon?: LucideIcon | ComponentType<any>; 
};

export type ResourceFilter = {
  type: "select";
  param: string;
  label?: string;
  placeholder?: string;     // اضافه شد
  defaultValue?: string;    // اضافه شد (برای مواردی مثل status که "all" دارن)
  options:
    | FilterOption[]
    | readonly FilterOption[]           // اجازه readonly array
    | ((stats: FilterStatsItem[]) => FilterOption[] | readonly FilterOption[]);
};

export interface FormField {
  type: "text" | "email" | "password" | "number" | "textarea" | "select" | "multi-select" | "checkbox" | "date" | "image" | "gallery";
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  createOnly?: boolean;
  editOnly?: boolean;
  options?: string | Array<{ value: string | number; label: string }>;
  rows?: number; // اضافه شده
}

export type BadgeConfig = { text: string; class: string };
export type TagConfig = { text: string; class: string };
export type DetailConfig = { label: string; value: string };
export type StatusConfig = {
  text: string;
  icon: LucideIcon;
  color: string;
};

export type ResourceAction<T = any> = {
  label: string;
  /** متن نمایش داده شده کنار آیکن (اگر size !== "icon") */
  text?: string;
  icon: ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => Promise<void> | void;
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  destructive?: boolean;
  disabled?: boolean;
};


export type ResourceHelpers = {
  router?: any;
  onBanToggle?: (ids: string[]) => Promise<any>;
  onUnbanToggle?: (ids: string[]) => Promise<any>;
  onPublishToggle?: (ids: string[]) => Promise<any>;
  onUnpublishToggle?: (ids: string[]) => Promise<any>;
  onDelete?: (ids: string[]) => Promise<any>;
};

export type ResourceConfig<T> = {
  label: string;
  singular: string;
  icon: any;
  color: string;
  createHref?: string;
  stats?: Record<string, StatConfig>;
  filters: readonly ResourceFilter[];
  card: {
    title: (item: T) => string;
    subtitle: (item: T) => string;
    avatar: (item: T) => string;
    badge: (item: T) => BadgeConfig;
    tags: (item: T) => TagConfig[];
    details: (item: T) => DetailConfig[];
    status?: (item: T) => StatusConfig;
  };
  actions: (item: T, helpers?: ResourceHelpers) => ResourceAction<T>[];
  bulkActions?: BulkAction[];
  fetchAction: (params: {
    search: string;
    page: number;
    searchParams: Record<string, string | string[] | undefined>;
  }) => Promise<{
    items: T[];
    totalItems: number;
    stats: { key: string; count: number }[];
  }>;
};

// نوع ترکیبی برای منابع دارای فرم
export type ResourceConfigWithForm<T = any> = ResourceConfig<T> & {
  form: {
    fields: readonly FormField[];
    preload?: () => Promise<Record<string, any>>;
    createAction?: (data: FormData) => Promise<any>;
    updateAction?: (data: FormData, id: string) => Promise<any>;
  };
};

// Type Guard واحد و درست
export function hasFormConfig<T>(config: any): config is ResourceConfigWithForm<T> {
  return (
    config &&
    typeof config === "object" &&
    "form" in config &&
    config.form &&
    typeof config.form === "object" &&
    Array.isArray(config.form.fields) &&
    config.form.fields.length > 0
  );
}

export interface CourseListItem {
  id: string;
  title?: string | null;
  slug?: string | null;
  code?: string | null;
  status: string;
  isPublished: boolean;
  price?: number | null;
  instructor?: {
    name?: string | null;
  } | null;
  level?: string | null;
  _count?: {
    buyers: number;
  };
  [key: string]: any;
}


export interface Role {
  value: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
  color?: string;
  badgeColor?: string;
  order: number;
}
export type StatItem = {
  key: string;
  count: number;
};

export type BulkActionItem = {
  label: string;
  action: string;
  icon: React.ReactNode;
  color: string;
};


export type TagItem = { text: string; class: string };
export type DetailItem = { label: string; value: string };
export type StatusItem = { text: string; icon: any; color: string };
