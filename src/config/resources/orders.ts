// src/config/resources/orders.ts
import { ShoppingCart, Package, Truck, CheckCircle, XCircle, Trash2 } from "lucide-react";
import React from "react";
import {
  createOrderDetailsAction,
  ORDER_STATUS_BADGE_MAP,
} from "./shared";
import { fetchOrders } from "@/actions/admin/orders";

interface Order {
  id: string;
  user?: { name?: string; email?: string };
  status: string;
  finalAmount: number;
  createdAt: string | Date;
  items: any[];
}

export const ordersConfig = {
  label: "سفارشات",
  singular: "سفارش",
  icon: ShoppingCart,
  color: "text-emerald-600",

  // سفارشات ایجاد دستی ندارن
  createHref: undefined,

  stats: {
    paid: { label: "پرداخت شده", icon: CheckCircle, color: "text-green-600" },
    processing: { label: "در حال پردازش", icon: Package, color: "text-blue-600" },
    shipped: { label: "ارسال شده", icon: Truck, color: "text-indigo-600" },
    delivered: { label: "تحویل شده", icon: CheckCircle, color: "text-teal-600" },
    cancelled: { label: "لغو شده", icon: XCircle, color: "text-red-600" },
    refunded: { label: "مرجوع شده", icon: XCircle, color: "text-orange-600" },
  },

  filters: [] as const,

  card: {
    title: (order: Order) => `سفارش #${order.id}`,
    subtitle: (order: Order) => order.user?.name || order.user?.email || "نامشخص",
    avatar: () => "س",
    badge: (order: Order) =>
      ORDER_STATUS_BADGE_MAP[order.status as keyof typeof ORDER_STATUS_BADGE_MAP] || {
        text: order.status,
        class: "bg-gray-600 text-white",
      },
    tags: (order: Order): { text: string; class: string }[] => [
      { text: `${order.finalAmount.toLocaleString("fa-IR")} تومان`, class: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
      { text: `${order.items.length} آیتم`, class: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
    ],
    details: (order: Order): { label: string; value: string }[] => [
      { 
        label: "تاریخ سفارش", 
        value: new Date(order.createdAt).toLocaleDateString("fa-IR") + 
               " - " + 
               new Date(order.createdAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }) 
      },
    ],
    status: undefined, // وضعیت از badge نمایش داده می‌شه
  },

  actions: (order: Order, helpers?: any) => [
    createOrderDetailsAction(order, helpers),
  ],

  bulkActions: [
    {
      label: "پرداخت شده",
      action: "PAID",
      icon: React.createElement(CheckCircle, { className: "w-6 h-6" }),
      color: "bg-green-600 text-white hover:bg-green-700",
    },
    {
      label: "در حال پردازش",
      action: "PROCESSING",
      icon: React.createElement(Package, { className: "w-6 h-6" }),
      color: "bg-blue-600 text-white hover:bg-blue-700",
    },
    {
      label: "ارسال شده",
      action: "SHIPPED",
      icon: React.createElement(Truck, { className: "w-6 h-6" }),
      color: "bg-indigo-600 text-white hover:bg-indigo-700",
    },
    {
      label: "تحویل شده",
      action: "DELIVERED",
      icon: React.createElement(CheckCircle, { className: "w-6 h-6" }),
      color: "bg-teal-600 text-white hover:bg-teal-700",
    },
    {
      label: "لغو شده",
      action: "CANCELLED",
      icon: React.createElement(XCircle, { className: "w-6 h-6" }),
      color: "bg-red-600 text-white hover:bg-red-700",
    },
    {
      label: "مرجوع شده",
      action: "REFUNDED",
      icon: React.createElement(XCircle, { className: "w-6 h-6" }),
      color: "bg-orange-600 text-white hover:bg-orange-700",
    },
  ],

  fetchAction: fetchOrders,

  // جزئیات سفارش برای صفحه احتمالی جزئیات در آینده
  // fetchOne در server action جداگانه یا صفحه جزئیات استفاده می‌شه
  // اینجا نگه داشتم تا اگر بعداً نیاز شد، آماده باشه
  // اما چون در کانفیگ کلاینت‌ساید استفاده می‌شه، prisma حذف شد
  // fetchOne: async (id: string) => { ... } → حذف شد تا خطای dns نده

  // فرم ایجاد/ویرایش نداریم — سفارشات دستی ساخته نمی‌شن
  // پس form اضافه نمی‌کنیم
} as const;