// src/config/resources/discounts.ts
import { Percent, Tag, CheckCircle, XCircle, Trash2 } from "lucide-react";
import React from "react";
import {
  createEditAction,
  createDeleteAction,
  COMMON_CLASSES,
} from "./shared";
import { fetchDiscounts } from "@/actions/admin/discounts";

interface Discount {
  id: string;
  code: string;
  title?: string;
  type: "PERCENT" | "FIXED";
  value: number;
  minimumAmount?: number;
  startsAt?: string | Date;
  endsAt?: string | Date;
  isActive: boolean;
  _count?: { usages: number };
}

export const discountsConfig = {
  label: "کدهای تخفیف",
  singular: "کد تخفیف",
  icon: Percent,
  color: "text-purple-600",
  createHref: "/dashboard/admin/discounts/create",

  stats: {
    active: { label: "فعال", icon: CheckCircle, color: "text-green-600" },
    inactive: { label: "غیرفعال", icon: XCircle, color: "text-orange-600" },
  },

  filters: [] as const,

  card: {
    title: (discount: Discount) => discount.code,
    subtitle: (discount: Discount) => discount.title || "بدون عنوان",
    avatar: () => "%",
    badge: (discount: Discount) => ({
      text: discount.isActive ? "فعال" : "غیرفعال",
      class: discount.isActive ? "bg-green-600 text-white" : "bg-orange-600 text-white",
    }),
    tags: (discount: Discount): { text: string; class: string }[] => [
      { text: discount.type === "PERCENT" ? "درصدی" : "مقداری", class: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
      discount.value > 0 && {
        text: discount.type === "PERCENT" ? `${discount.value}%` : `${discount.value.toLocaleString("fa-IR")} تومان`,
        class: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300"
      },
    ].filter(Boolean) as any,
    details: (discount: Discount): { label: string; value: string }[] => [
      discount.minimumAmount && { label: "حداقل خرید", value: `${discount.minimumAmount.toLocaleString("fa-IR")} تومان` },
      discount.startsAt && { label: "شروع", value: new Date(discount.startsAt).toLocaleDateString("fa-IR") },
      discount.endsAt && { label: "پایان", value: new Date(discount.endsAt).toLocaleDateString("fa-IR") },
      { label: "تعداد استفاده", value: (discount._count?.usages ?? 0).toLocaleString("fa-IR") },
    ].filter(Boolean) as any,
    status: (discount: Discount) => ({
      text: discount.isActive ? "فعال" : "غیرفعال",
      icon: discount.isActive ? CheckCircle : XCircle,
      color: discount.isActive ? "text-green-600" : "text-orange-600",
    }),
  },

  actions: (discount: Discount, helpers?: any) => [
    createEditAction("discounts", discount, helpers),
    {
      label: discount.isActive ? "غیرفعال کردن" : "فعال کردن",
      icon: discount.isActive ? XCircle : CheckCircle,
      ...COMMON_CLASSES.toggle(!discount.isActive),
      onClick: () => helpers?.onBulkAction?.([discount.id], discount.isActive ? "deactivate" : "activate"),
    },
    createDeleteAction(discount, helpers),
  ],

  bulkActions: [
    {
      label: "فعال کردن دسته‌جمعی",
      action: "activate",
      icon: React.createElement(CheckCircle, { className: "w-6 h-6" }),
      color: "bg-green-600 text-white hover:bg-green-700",
    },
    {
      label: "غیرفعال کردن دسته‌جمعی",
      action: "deactivate",
      icon: React.createElement(XCircle, { className: "w-6 h-6" }),
      color: "bg-orange-600 text-white hover:bg-orange-700",
    },
    {
      label: "حذف دسته‌جمعی",
      action: "delete",
      icon: React.createElement(Trash2, { className: "w-6 h-6" }),
      color: "bg-destructive text-white hover:bg-destructive/90",
    },
  ],

  fetchAction: fetchDiscounts,

  // === فرم عمومی بدون prisma و بدون ایمپورت کامپوننت ===
  form: {
    fields: [
      { type: "text", name: "code", label: "کد تخفیف", required: true, placeholder: "BLACKFRIDAY2025" },
      { type: "text", name: "title", label: "عنوان (اختیاری)" },
      { type: "select", name: "type", label: "نوع تخفیف", required: true, options: [
        { value: "PERCENT", label: "درصدی" },
        { value: "FIXED", label: "مقداری (تومان)" },
      ]},
      { type: "number", name: "value", label: "مقدار تخفیف", required: true },
      { type: "number", name: "minimumAmount", label: "حداقل مبلغ خرید برای اعمال تخفیف" },
      { type: "date", name: "startsAt", label: "تاریخ شروع اعتبار" },
      { type: "date", name: "endsAt", label: "تاریخ پایان اعتبار" },
      { type: "checkbox", name: "isActive", label: "کد فعال", defaultChecked: true },
    ],
    // preload نیاز نداره — همه فیلدها دستی هستن
    // fetchOne در صفحه edit انجام می‌شه
    // schema و onSubmitAction در صفحات عمومی تعریف می‌شه
  },
} as const;