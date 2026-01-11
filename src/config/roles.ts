// src/config/roles.ts
import { Role } from "@/types/resource-types";
import { LucideIcon, Crown, Shield, BookOpen, Gavel, User, PenTool } from "lucide-react";



export const ROLES = [
  {
    value: "SUPER_ADMIN",
    label: "سوپر ادمین",
    description: "دسترسی کامل به همه بخش‌ها",
    icon: Crown,
    color: "text-red-600",
    badgeColor: "bg-red-600",
    order: 1,
  },
  {
    value: "ADMIN",
    label: "ادمین",
    description: "مدیریت کاربران، دوره‌ها و محتوا",
    icon: Shield,
    color: "text-purple-600",
    badgeColor: "bg-purple-600",
    order: 2,
  },
  {
    value: "INSTRUCTOR",
    label: "استاد",
    description: "ایجاد و مدیریت دوره‌های آموزشی",
    icon: BookOpen,
    color: "text-emerald-600",
    badgeColor: "bg-emerald-600",
    order: 3,
  },
  {
    value: "MODERATOR",
    label: "مدیر انجمن",
    description: "مدیریت نظرات و انجمن‌ها",
    icon: Gavel,
    color: "text-orange-600",
    badgeColor: "bg-orange-600",
    order: 4,
  },
  {
    value: "BLOG_AUTHOR",
    label: "نویسنده بلاگ",
    description: "ایجاد و ویرایش پست‌های بلاگ",
    icon: PenTool,
    color: "text-indigo-600",
    badgeColor: "bg-indigo-600",
    order: 5,
  },
  {
    value: "USER",
    label: "کاربر عادی (دانشجو)",
    description: "دسترسی به دوره‌های ثبت‌نام شده",
    icon: User,
    color: "text-blue-600",
    badgeColor: "bg-muted-foreground/20",
    order: 6,
  },
] as const satisfies Role[];

// نقشه اصلی برای نمایش badge و اطلاعات نقش (type-safe و بدون خطا)
export const ROLE_DISPLAY_CONFIG = {
  SUPER_ADMIN: {
    text: "سوپر ادمین",
    class: "bg-red-600 text-white",
    icon: Crown,
    color: "text-red-600",
  },
  ADMIN: {
    text: "ادمین",
    class: "bg-purple-600 text-white",
    icon: Shield,
    color: "text-purple-600",
  },
  INSTRUCTOR: {
    text: "استاد",
    class: "bg-emerald-600 text-white",
    icon: BookOpen,
    color: "text-emerald-600",
  },
  MODERATOR: {
    text: "مدیر انجمن",
    class: "bg-orange-600 text-white",
    icon: Gavel,
    color: "text-orange-600",
  },
  BLOG_AUTHOR: {
    text: "نویسنده بلاگ",
    class: "bg-indigo-600 text-white",
    icon: PenTool,
    color: "text-indigo-600",
  },
  USER: {
    text: "کاربر عادی (دانشجو)",
    class: "bg-muted-foreground/20 text-foreground",
    icon: User,
    color: "text-blue-600",
  },
} as const;

// برای استفاده در سلکت‌ها و فرم‌های انتخاب نقش
export const ROLE_OPTIONS = ROLES.map((role) => ({
  value: role.value,
  label: role.label,
}));

// لیست رنگ‌های موجود برای انتخاب در فرم‌ها
export const AVAILABLE_COLORS = [
  { value: "text-red-600", label: "قرمز تند" },
  { value: "text-purple-600", label: "بنفش" },
  { value: "text-emerald-600", label: "سبز زمردی" },
  { value: "text-orange-600", label: "نارنجی" },
  { value: "text-indigo-600", label: "نیلی" },
  { value: "text-blue-600", label: "آبی" },
  { value: "text-amber-600", label: "کهربایی" },
  { value: "text-pink-600", label: "صورتی" },
  { value: "text-teal-600", label: "فیروزه‌ای" },
  { value: "text-gray-600", label: "خاکستری" },
] as const;