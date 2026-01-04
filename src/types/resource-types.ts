import type { LucideIcon } from "lucide-react";

export type StatConfig = {
  label: string;
  icon: LucideIcon;
  color: string;
};

export type BulkAction = {
  label: string;
  action: string;
  icon: React.ReactNode;
  color: string;
};
export type FilterOption = {
  value: string;
  label: string;
};

export type ResourceFilter = {
  type: "select";
  param: string;
  label?: string; 
  options:
    | FilterOption[]
    | ((stats: { key: string; count: number }[]) => FilterOption[]);
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
  icon: LucideIcon;
  colorClass: string;
  hoverBgClass: string;
  hoverRingClass: string;
  rippleClass: string;
  onClick?: (item: T, helpers?: ResourceHelpers) => void | Promise<void>; 
  href?: string; 
};
// در src/types/resource-types.ts
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
  icon: any; // LucideIcon
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
export interface CourseListItem {
  id: string;
  title?: string | null;
  slug?: string | null;
  code?: string | null;
  status: string;               // "DRAFT" | "PENDING_REVIEW" | ...
  isPublished: boolean;
  price?: number | null;
  instructor?: {
    name?: string | null;
  } | null;
  level?: string | null;
  _count?: {
    buyers: number;
  };
  [key: string]: any;           // برای انعطاف‌پذیری موقت
}