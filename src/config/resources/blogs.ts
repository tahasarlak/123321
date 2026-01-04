// src/config/resources/blogs.ts
import { FileText, Eye, EyeOff, Trash2 } from "lucide-react";
import React from "react";
import {
  createEditAction,
  createPublishToggleAction,
  createDeleteAction,
  PUBLISH_BADGE_MAP,
  PUBLISH_STATUS_MAP,
} from "./shared";
import { fetchBlogs } from "@/actions/admin/blogs";

interface BlogPost {
  id: string;
  title?: string;
  author?: { name: string };
  published: boolean;
  publishedAt?: string | Date;
  tags?: string[];
}

export const blogsConfig = {
  label: "مقالات",
  singular: "مقاله",
  icon: FileText,
  color: "text-teal-600",
  createHref: "/dashboard/admin/blogs/create",

  stats: {
    published: { label: "منتشر شده", icon: Eye, color: "text-green-600" },
    draft: { label: "پیش‌نویس", icon: EyeOff, color: "text-orange-600" },
  },

  filters: [] as const,

  card: {
    title: (post: BlogPost) => post.title || "بدون عنوان",
    subtitle: (post: BlogPost) => post.author?.name || "ناشناس",
    avatar: (post: BlogPost) => post.title?.[0]?.toUpperCase() ?? "م",
    badge: (post: BlogPost) => PUBLISH_BADGE_MAP[post.published ? "published" : "draft"],
    tags: (post: BlogPost): { text: string; class: string }[] =>
      (post.tags ?? []).map((tag) => ({
        text: tag,
        class: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
      })),
    details: (post: BlogPost): { label: string; value: string }[] =>
      post.publishedAt
        ? [{ label: "تاریخ انتشار", value: new Date(post.publishedAt).toLocaleDateString("fa-IR") }]
        : [],
    status: (post: BlogPost) => PUBLISH_STATUS_MAP[post.published ? "published" : "draft"],
  },

  actions: (post: BlogPost, helpers?: any) => [
    createEditAction("blogs", post, helpers),
    createPublishToggleAction(post, helpers),
    createDeleteAction(post, helpers),
  ],

  bulkActions: [
    {
      label: "انتشار دسته‌جمعی",
      action: "publish",
      icon: React.createElement(Eye, { className: "w-6 h-6" }),
      color: "bg-green-600 text-white hover:bg-green-700",
    },
    {
      label: "لغو انتشار دسته‌جمعی",
      action: "unpublish",
      icon: React.createElement(EyeOff, { className: "w-6 h-6" }),
      color: "bg-orange-600 text-white hover:bg-orange-700",
    },
    {
      label: "حذف دسته‌جمعی",
      action: "delete",
      icon: React.createElement(Trash2, { className: "w-6 h-6" }),
      color: "bg-destructive text-white hover:bg-destructive/90",
    },
  ],

  fetchAction: fetchBlogs,

  // === فرم عمومی بدون ایمپورت کامپوننت و prisma ===
  form: {
    // کامپوننت در صفحات create/edit ایمپورت می‌شه
    fields: [
      { type: "text", name: "title", label: "عنوان مقاله", required: true },
      { type: "text", name: "slug", label: "اسلاگ", required: true },
      { type: "select", name: "authorId", label: "نویسنده", required: true, options: "preload.authors" },
      { type: "textarea", name: "excerpt", label: "خلاصه مقاله", required: true, rows: 4 },
      { type: "textarea", name: "content", label: "محتوای کامل (Markdown یا HTML)", required: true, rows: 15 },
      { type: "text", name: "tags", label: "تگ‌ها (با کاما جدا کنید)" },
      { type: "image", name: "image", label: "تصویر اصلی مقاله", required: true },
      { type: "checkbox", name: "published", label: "منتشر شده", defaultChecked: false },
    ],
    // preload و fetchOne در صفحات عمومی create/edit انجام می‌شه
    // schema و onSubmitAction هم در صفحات عمومی تعریف می‌شه
  },
} as const;