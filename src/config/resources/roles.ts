// src/config/resources/roles.ts
import { Shield, Crown, GraduationCap, PenTool, Users, CheckCircle, Trash2 } from "lucide-react";
import React from "react";
import {
  createEditAction,
  createDeleteAction,
} from "./shared";

interface Role {
  id: string;
  name: string;
  description?: string;
  userCount?: number;
}

export const rolesConfig = {
  label: "نقش‌ها",
  singular: "نقش",
  icon: Shield,
  color: "text-purple-600",
  createHref: "/dashboard/admin/roles/create",

  stats: {
    SUPER_ADMIN: { label: "سوپر ادمین", icon: Crown, color: "text-red-600" },
    ADMIN: { label: "ادمین", icon: Shield, color: "text-purple-600" },
    INSTRUCTOR: { label: "مدرس", icon: GraduationCap, color: "text-blue-600" },
    BLOG_AUTHOR: { label: "نویسنده بلاگ", icon: PenTool, color: "text-indigo-600" },
    USER: { label: "کاربر عادی", icon: Users, color: "text-foreground/70" },
  },

  filters: [] as const,

  card: {
    title: (role: Role) => role.name,
    subtitle: (role: Role) => role.description || "بدون توضیح",
    avatar: (role: Role) => role.name[0]?.toUpperCase() ?? "R",
    badge: (role: Role) => ({
      text: role.name,
      class: "bg-purple-600 text-white",
    }),
    tags: (role: Role): { text: string; class: string }[] => [
      { text: `${role.userCount || 0} کاربر`, class: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
    ],
    details: (role: Role): { label: string; value: string }[] => [
      { label: "تعداد کاربران با این نقش", value: (role.userCount || 0).toLocaleString("fa-IR") },
    ],
    status: undefined,
  },

  actions: (role: Role, helpers?: any) => [
    createEditAction("roles", role, helpers),
    createDeleteAction(role, helpers),
  ],

  bulkActions: [
    {
      label: "حذف دسته‌جمعی",
      action: "delete",
      icon: React.createElement(Trash2, { className: "w-6 h-6" }),
      color: "bg-destructive text-white hover:bg-destructive/90",
    },
  ],

  // فعلاً fetchAction نداریم — بعداً اضافه می‌کنیم
  // fetchAction: fetchRoles,

  form: {
    fields: [
      { type: "text", name: "name", label: "نام نقش (مثل ADMIN)", required: true },
      { type: "text", name: "label", label: "برچسب نمایش (مثل ادمین)", required: true },
      { type: "textarea", name: "description", label: "توضیحات نقش", rows: 4 },
      { type: "checkbox", name: "isActive", label: "نقش فعال", defaultChecked: true },
    ],
  },
} as const;