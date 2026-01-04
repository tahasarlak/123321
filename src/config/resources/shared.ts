// src/config/resources/shared.ts
import { ResourceAction, ResourceHelpers } from "@/types/resource-types";
import {
  Crown,
  Shield,
  GraduationCap,
  PenTool,
  CheckCircle,
  Clock,
  Archive,
  AlertCircle,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Ban,
  XCircle,
} from "lucide-react";

import { ROLE_DISPLAY_CONFIG } from "@/config/roles"; // ← ایمپورت جدید


export const PUBLISH_BADGE_MAP = {
  published: { text: "منتشر شده", class: "bg-green-600 text-white" },
  draft: { text: "پیش‌نویس", class: "bg-orange-600 text-white" },
} as const;

export const PUBLISH_STATUS_MAP = {
  published: { text: "منتشر شده", icon: Eye, color: "text-green-600" },
  draft: { text: "پیش‌نویس", icon: EyeOff, color: "text-orange-600" },
} as const;

export const STOCK_BADGE_MAP = {
  inStock: { text: "موجود", class: "bg-green-600 text-white" },
  outOfStock: { text: "ناموجود", class: "bg-red-600 text-white" },
} as const;

export const ORDER_STATUS_BADGE_MAP = {
  PAID: { text: "پرداخت شده", class: "bg-green-600 text-white" },
  PROCESSING: { text: "در حال پردازش", class: "bg-blue-600 text-white" },
  SHIPPED: { text: "ارسال شده", class: "bg-indigo-600 text-white" },
  DELIVERED: { text: "تحویل شده", class: "bg-teal-600 text-white" },
  CANCELLED: { text: "لغو شده", class: "bg-red-600 text-white" },
  REFUNDED: { text: "مرجوع شده", class: "bg-orange-600 text-white" },
} as const;

// ── کلاس‌های مشترک برای اکشن‌ها ──────────────────────────────────────────────
export const COMMON_CLASSES = {
  edit: {
    colorClass: "text-blue-600 bg-blue-500/10 dark:text-blue-400",
    hoverBgClass: "hover:bg-blue-500/20",
    hoverRingClass: "hover:ring-blue-500/30",
    rippleClass: "bg-blue-500/20",
  },
  delete: {
    colorClass: "text-red-600 bg-red-500/10 dark:text-red-400",
    hoverBgClass: "hover:bg-red-500/20",
    hoverRingClass: "hover:ring-red-500/30",
    rippleClass: "bg-red-500/20",
  },
  toggle: (isOn: boolean) => ({
    colorClass: isOn
      ? "text-green-600 bg-green-500/10 dark:text-green-400"
      : "text-orange-600 bg-orange-500/10 dark:text-orange-400",
    hoverBgClass: isOn ? "hover:bg-green-500/20" : "hover:bg-orange-500/20",
    hoverRingClass: isOn ? "hover:ring-green-500/30" : "hover:ring-orange-500/30",
    rippleClass: isOn ? "bg-green-500/20" : "bg-orange-500/20",
  }),
} as const;

// ── توابع کمکی ────────────────────────────────────────────────────────────────
export const getUserMainRole = (
  roles: { role: string }[]
): keyof typeof ROLE_DISPLAY_CONFIG => {
  if (roles.some((r) => r.role === "SUPER_ADMIN")) return "SUPER_ADMIN";
  if (roles.some((r) => r.role === "ADMIN")) return "ADMIN";
  if (roles.some((r) => r.role === "INSTRUCTOR")) return "INSTRUCTOR";
  if (roles.some((r) => r.role === "BLOG_AUTHOR")) return "BLOG_AUTHOR";
  return "USER";
};

export const createEditAction = <T extends { id: string }>(
  pathPrefix: string,
  item: T,
  helpers?: ResourceHelpers
): ResourceAction<T> => ({
  label: "ویرایش",
  icon: Edit3,
  ...COMMON_CLASSES.edit,
  href: `/dashboard/admin/${pathPrefix}/edit/${item.id}`,
  onClick: () => helpers?.router?.push(`/dashboard/admin/${pathPrefix}/edit/${item.id}`),
});

export const createDeleteAction = <T extends { id: string }>(
  item: T,
  helpers?: ResourceHelpers
): ResourceAction<T> => ({
  label: "حذف",
  icon: Trash2,
  ...COMMON_CLASSES.delete,
  onClick: () => helpers?.onDelete?.([item.id]),
});

export const createPublishToggleAction = <
  T extends { id: string; isPublished?: boolean; published?: boolean }
>(
  item: T,
  helpers?: ResourceHelpers
): ResourceAction<T> => {
  const isPublished = item.isPublished ?? item.published ?? false;
  return {
    label: isPublished ? "لغو انتشار" : "انتشار",
    icon: isPublished ? EyeOff : Eye,
    ...COMMON_CLASSES.toggle(!isPublished),
    onClick: () => {
      if (isPublished) {
        helpers?.onUnpublishToggle?.([item.id]);
      } else {
        helpers?.onPublishToggle?.([item.id]);
      }
    },
  };
};

// ── وضعیت‌های مخصوص دوره‌های آموزشی ────────────────────────────────────────
export const COURSE_STATUS_BADGE_MAP = {
  published: { text: "منتشر شده", class: "bg-green-600 text-white" },
  draft: { text: "پیش‌نویس", class: "bg-orange-600 text-white" },
  pending_review: { text: "در انتظار تأیید", class: "bg-amber-600 text-white" },
  rejected: { text: "رد شده", class: "bg-red-600 text-white" },
  archived: { text: "آرشیو شده", class: "bg-gray-600 text-white" },
} as const;

export const COURSE_STATUS_STATUS_MAP = {
  published: { text: "منتشر شده", icon: Eye, color: "text-green-600" },
  draft: { text: "پیش‌نویس", icon: EyeOff, color: "text-orange-600" },
  pending_review: { text: "در انتظار تأیید", icon: Clock, color: "text-amber-600" },
  rejected: { text: "رد شده", icon: XCircle, color: "text-red-600" },
  archived: { text: "آرشیو شده", icon: Archive, color: "text-gray-500" },
} as const;

export const createBanToggleAction = (
  user: { id: string; isBanned: boolean },
  helpers?: ResourceHelpers
): ResourceAction<any> => ({
  label: user.isBanned ? "رفع مسدودیت" : "مسدود کردن",
  icon: user.isBanned ? UserCheck : UserX,
  ...COMMON_CLASSES.toggle(!user.isBanned),
  onClick: () =>
    user.isBanned
      ? helpers?.onUnbanToggle?.([user.id])
      : helpers?.onBanToggle?.([user.id]),
});

export const createOrderDetailsAction = (
  order: { id: string },
  helpers?: ResourceHelpers
): ResourceAction<any> => ({
  label: "جزئیات سفارش",
  icon: Edit3,
  ...COMMON_CLASSES.edit,
  href: `/dashboard/admin/orders/${order.id}`,
  onClick: () => helpers?.router?.push(`/dashboard/admin/orders/${order.id}`),
});