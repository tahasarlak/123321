// src/config/resources/shippingMethods.ts
import { Truck, CheckCircle, XCircle, Trash2 } from "lucide-react";
import React from "react";
import {
  createEditAction,
  createDeleteAction,
  COMMON_CLASSES,
} from "./shared";
import { fetchShippingMethods } from "@/actions/admin/shippingMethods";

interface ShippingMethod {
  id: string;
  title: string;
  description?: string;
  cost: number;
  isActive: boolean;
  priority: number;
  createdAt: string | Date;
}

export const shippingMethodsConfig = {
  label: "روش‌های ارسال",
  singular: "روش ارسال",
  icon: Truck,
  color: "text-orange-600",
  createHref: "/dashboard/admin/shipping-methods/create",

  stats: {
    active: { label: "فعال", icon: CheckCircle, color: "text-green-600" },
    inactive: { label: "غیرفعال", icon: XCircle, color: "text-red-600" },
  },

  filters: [] as const,

  card: {
    title: (method: ShippingMethod) => method.title,
    subtitle: (method: ShippingMethod) => method.description || "بدون توضیح",
    avatar: () => "🚚",
    badge: (method: ShippingMethod) => ({
      text: method.isActive ? "فعال" : "غیرفعال",
      class: method.isActive ? "bg-green-600 text-white" : "bg-red-600 text-white",
    }),
    tags: (method: ShippingMethod): { text: string; class: string }[] => [
      { text: `${method.cost.toLocaleString("fa-IR")} تومان`, class: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
      { text: `اولویت: ${method.priority}`, class: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
    ],
    details: (method: ShippingMethod): { label: string; value: string }[] => [
      { 
        label: "تاریخ ایجاد", 
        value: new Date(method.createdAt).toLocaleDateString("fa-IR") + 
               " - " + 
               new Date(method.createdAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }) 
      },
    ],
    status: (method: ShippingMethod) => ({
      text: method.isActive ? "فعال" : "غیرفعال",
      icon: method.isActive ? CheckCircle : XCircle,
      color: method.isActive ? "text-green-600" : "text-red-600",
    }),
  },

  actions: (method: ShippingMethod, helpers?: any) => [
    createEditAction("shipping-methods", method, helpers),
    {
      label: method.isActive ? "غیرفعال کردن" : "فعال کردن",
      icon: method.isActive ? XCircle : CheckCircle,
      ...COMMON_CLASSES.toggle(!method.isActive),
      onClick: () => helpers?.onBulkAction?.([method.id], method.isActive ? "deactivate" : "activate"),
    },
    createDeleteAction(method, helpers),
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
      color: "bg-red-600 text-white hover:bg-red-700",
    },
    {
      label: "حذف دسته‌جمعی",
      action: "delete",
      icon: React.createElement(Trash2, { className: "w-6 h-6" }),
      color: "bg-destructive text-white hover:bg-destructive/90",
    },
  ],

  fetchAction: fetchShippingMethods,

  // === فرم عمومی بدون prisma و بدون ایمپورت کامپوننت ===
  form: {
    fields: [
      { type: "text", name: "title", label: "عنوان روش ارسال", required: true, placeholder: "تیپاکس، پست پیشتاز، پیک موتوری" },
      { type: "textarea", name: "description", label: "توضیحات روش ارسال", required: true, rows: 4 },
      { type: "number", name: "cost", label: "هزینه ارسال (تومان)", required: true },
      { type: "number", name: "priority", label: "اولویت نمایش (عدد بالاتر = بالاتر)", required: true, defaultValue: 10 },
      { type: "checkbox", name: "isActive", label: "روش فعال", defaultChecked: true },
    ],
    // preload نیاز نداره — همه فیلدها دستی هستن
    // fetchOne در صفحه edit انجام می‌شه
    // schema و onSubmitAction در صفحات عمومی تعریف می‌شه
  },
} as const;