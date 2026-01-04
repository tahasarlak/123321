// src/config/resources/notifications.ts
import { Bell, Users, Clock, CheckCircle, AlertCircle } from "lucide-react";
import React from "react";
import { fetchNotifications } from "@/actions/admin/notifications";

interface Notification {
  id: string;
  title: string;
  message?: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "OFFER";
  sentAt: string | Date;
  readCount?: number;
  totalRecipients?: number;
}

export const notificationsConfig = {
  label: "نوتیفیکیشن‌ها",
  singular: "نوتیفیکیشن",
  icon: Bell,
  color: "text-pink-600",

  // ایجاد دستی نداریم — فقط از فرم ارسال جهانی در صفحه لیست استفاده می‌شه
  createHref: undefined,

  stats: {
    total: { label: "تعداد کل", icon: Users, color: "text-blue-600" },
    recent: { label: "ارسال شده در ۷ روز اخیر", icon: Clock, color: "text-orange-600" },
  },

  filters: [] as const,

  card: {
    title: (notif: Notification) => notif.title,
    subtitle: (notif: Notification) => notif.message || "بدون متن",
    avatar: () => "🔔",
    badge: (notif: Notification) => {
      const typeMap = {
        INFO: { text: "اطلاع‌رسانی", class: "bg-blue-600 text-white" },
        SUCCESS: { text: "موفقیت", class: "bg-green-600 text-white" },
        WARNING: { text: "هشدار", class: "bg-yellow-600 text-white" },
        ERROR: { text: "خطا", class: "bg-red-600 text-white" },
        OFFER: { text: "تخفیف ویژه", class: "bg-pink-600 text-white" },
      };
      return typeMap[notif.type] || { text: notif.type, class: "bg-gray-600 text-white" };
    },
    tags: (notif: Notification): { text: string; class: string }[] => [
      notif.totalRecipients && {
        text: `${notif.totalRecipients.toLocaleString("fa-IR")} گیرنده`,
        class: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
      },
      notif.readCount !== undefined && {
        text: `${notif.readCount.toLocaleString("fa-IR")} خوانده شده`,
        class: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
      },
    ].filter(Boolean) as any,
    details: (notif: Notification): { label: string; value: string }[] => [
      { 
        label: "تاریخ ارسال", 
        value: new Date(notif.sentAt).toLocaleDateString("fa-IR") + 
               " - " + 
               new Date(notif.sentAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }) 
      },
    ],
    status: (notif: Notification) => ({
      text: notif.readCount && notif.totalRecipients 
        ? `${Math.round((notif.readCount / notif.totalRecipients) * 100)}% خوانده شده` 
        : "در حال ارسال",
      icon: notif.readCount && notif.totalRecipients && notif.readCount === notif.totalRecipients 
        ? CheckCircle 
        : AlertCircle,
      color: notif.readCount && notif.totalRecipients && notif.readCount === notif.totalRecipients 
        ? "text-green-600" 
        : "text-orange-600",
    }),
  },

  // عملیات روی تک نوتیفیکیشن (مثلاً جزئیات یا حذف اگر لازم بود)
  actions: () => [
    // فعلاً هیچ عملیاتی نداریم — فقط نمایش
    // اگر بخوای جزئیات یا حذف اضافه کنی، اینجا بذار
  ],

  bulkActions: [] as const,

  fetchAction: fetchNotifications,

  // فرم ایجاد/ویرایش نداریم — ارسال از فرم جهانی در صفحه لیست انجام می‌شه
  // پس form و fetchOne اضافه نمی‌کنیم
} as const;