// src/config/resources/blogs.ts

import { FileText, Eye, EyeOff, Trash2, Users } from "lucide-react";
import {
  createEditAction,
  createPublishToggleAction,
  createDeleteAction,
} from "./shared";
import { getBlogPostById } from "@/actions/bloger/blogs";
import { ResourceHelpers } from "@/types/resource-types";

export type BlogPostListItem = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  thumbnail?: string | null;
  views?: number;
  likes?: number;
  comments?: number;
  published: boolean;
  createdAt: Date;
  author?: { name: string } | null;
  category?: { name: string } | null;
  tags?: string[];
};

const PUBLISH_BADGE_MAP = {
  published: { text: "منتشر شده", class: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  draft: { text: "پیش‌نویس", class: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
};

const PUBLISH_STATUS_MAP = {
  published: { text: "منتشر شده", color: "text-green-600" },
  draft: { text: "پیش‌نویس", color: "text-orange-600" },
};

export const blogsConfig = {
  label: "مقالات و پست‌ها",
  singular: "پست",
  icon: FileText,
  color: "text-purple-600",

  createHref: null, // داینامیک در صفحه ست می‌شه: /dashboard/[role]/blogs/create

  stats: {
    published: { label: "منتشر شده", icon: Eye, color: "text-green-600" },
    draft: { label: "پیش‌نویس", icon: EyeOff, color: "text-orange-600" },
  },

  filters: [
    {
      type: "select" as const,
      param: "status",
      label: "وضعیت",
      options: [
        { value: "all", label: "همه" },
        { value: "published", label: "منتشر شده" },
        { value: "draft", label: "پیش‌نویس" },
      ],
      defaultValue: "all",
    },
  ] as const,

  card: {
    title: (post: BlogPostListItem) => post.title || "بدون عنوان",
    subtitle: (post: BlogPostListItem) => post.slug,
    avatar: (post: BlogPostListItem) => post.title[0]?.toUpperCase() ?? "پ",

    badge: (post: BlogPostListItem) => PUBLISH_BADGE_MAP[post.published ? "published" : "draft"],

    tags: (post: BlogPostListItem) => [
      post.author && {
        text: post.author.name,
        class: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
      },
      post.category && {
        text: post.category.name,
        class: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
      },
      post.views !== undefined && {
        text: `${post.views} بازدید`,
        class: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
      },
    ].filter(Boolean) as any,

    details: (post: BlogPostListItem) => [
      post.likes !== undefined && { label: "لایک", value: post.likes.toLocaleString("fa-IR") },
      post.comments !== undefined && { label: "نظر", value: post.comments.toLocaleString("fa-IR") },
    ].filter(Boolean),

    status: (post: BlogPostListItem) => PUBLISH_STATUS_MAP[post.published ? "published" : "draft"],
  },

  actions: (post: BlogPostListItem, helpers?: Partial<ResourceHelpers> & { role?: "admin" | "blogger" }) => [
    createEditAction("blogs", post, helpers),
    createPublishToggleAction(post, helpers),
    createDeleteAction(post, helpers),
  ],

  bulkActions: [
    {
      label: "انتشار دسته‌جمعی",
      action: "publish",
      icon: Eye,
      color: "bg-green-600 text-white hover:bg-green-700",
    },
    {
      label: "لغو انتشار دسته‌جمعی",
      action: "unpublish",
      icon: EyeOff,
      color: "bg-orange-600 text-white hover:bg-orange-700",
    },
    {
      label: "حذف دسته‌جمعی",
      action: "delete",
      icon: Trash2,
      color: "bg-destructive text-white hover:bg-destructive/90",
    },
  ],

  // fetchAction داینامیک — در صفحه داینامیک ست می‌شه
  fetchAction: null as any,

  fetchOne: getBlogPostById,

  form: {
    fields: [
      { type: "text", name: "title", label: "عنوان پست", required: true },
      { type: "text", name: "slug", label: "اسلاگ (اختیاری)", editOnly: true },
      { type: "textarea", name: "excerpt", label: "خلاصه پست (اختیاری)" },
      { type: "textarea", name: "content", label: "محتوای پست", required: true, rows: 15 },
      { type: "image", name: "thumbnail", label: "تصویر شاخص (کاور)" },
      {
        type: "select",
        name: "categoryId",
        label: "دسته‌بندی",
        required: true,
        options: "preload.categories",
      },
      {
        type: "multi-select",
        name: "tagIds",
        label: "تگ‌ها (اختیاری)",
        options: "preload.tags",
      },
      {
        type: "checkbox",
        name: "published",
        label: "منتشر شود",
        defaultChecked: false,
      },
      { type: "hidden", name: "honeypot", label: "" },
    ],
    preload: async () => ({
      categories: [], // در صفحه واقعی لود می‌شه
      tags: [],
    }),
  },
} as const;