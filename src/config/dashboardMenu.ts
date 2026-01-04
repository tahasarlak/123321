// src/config/dashboardMenu.ts
import {
  Home,
  Users,
  BookOpen,
  ShoppingCart,
  DollarSign,
  Settings,
  GraduationCap,
  PlayCircle,
} from "lucide-react";

export interface MenuItemConfig {
  label: string;
  href?: string;
  icon: string; // فقط string — چون در DashboardLayoutClient از iconMap استفاده می‌شه
  roles: string[];
  badgeKey?: "pendingCourses" | "pendingEnrollments" | "pendingOrders";
  subItems?: SubMenuItemConfig[];
}

interface SubMenuItemConfig {
  label: string;
  href: string;
  badgeKey?: "pendingCourses" | "pendingEnrollments" | "pendingOrders";
}

export const DASHBOARD_MENU: MenuItemConfig[] = [
  // ادمین و سوپرادمین
  {
    label: "داشبورد مدیریت",
    href: "/dashboard",
    icon: "home",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    label: "مدیریت کاربران",
    icon: "users",
    roles: ["SUPER_ADMIN", "ADMIN"],
    subItems: [
      { label: "همه کاربران", href: "/dashboard/admin/users" },
      { label: "اساتید", href: "/dashboard/admin/users?role=instructor" },
      { label: "وبلاگ‌نویسان", href: "/dashboard/admin/users?role=blog_author" },
      // اگر بخوای ادمین‌ها و سوپرادمین‌ها رو هم اضافه کنی:
      // { label: "ادمین‌ها", href: "/dashboard/admin/users?role=admin" },
      // { label: "سوپر ادمین‌ها", href: "/dashboard/admin/users?role=super_admin" },
    ],
  },
  {
    label: "دوره‌های آموزشی",
    icon: "book-open",
    roles: ["SUPER_ADMIN", "ADMIN"],
    subItems: [
      { label: "همه دوره‌ها", href: "/dashboard/admin/courses" },
      {
        label: "در انتظار بررسی",
        href: "/dashboard/admin/courses/pending",
        badgeKey: "pendingCourses",
      },
      {
        label: "ثبت‌نام‌ها",
        href: "/dashboard/admin/enrollments",
        badgeKey: "pendingEnrollments",
      },
    ],
  },
  {
    label: "فروشگاه و سفارشات",
    icon: "shopping-cart",
    roles: ["SUPER_ADMIN", "ADMIN"],
    subItems: [
      {
        label: "سفارشات",
        href: "/dashboard/admin/orders",
        badgeKey: "pendingOrders",
      },
      { label: "محصولات", href: "/dashboard/admin/products" },
    ],
  },
  {
    label: "مالی",
    icon: "dollar-sign",
    roles: ["SUPER_ADMIN", "ADMIN"],
    subItems: [
      { label: "تسویه حساب‌ها", href: "/dashboard/admin/finance" },
      { label: "گزارش‌ها", href: "/dashboard/admin/analytics" },
    ],
  },
  {
    label: "تنظیمات",
    icon: "settings",
    roles: ["SUPER_ADMIN", "ADMIN"],
    subItems: [
      { label: "تنظیمات کلی", href: "/dashboard/admin/settings" },
      { label: "لاگ فعالیت‌ها", href: "/dashboard/admin/activity-logs" },
    ],
  },

  // استاد
  {
    label: "داشبورد شخصی",
    href: "/dashboard",
    icon: "home",
    roles: ["INSTRUCTOR"],
  },
  {
    label: "پنل تدریس",
    icon: "graduation-cap",
    roles: ["INSTRUCTOR"],
    subItems: [
      { label: "دوره‌های من", href: "/dashboard/instructor/courses" },
      { label: "ایجاد دوره جدید", href: "/dashboard/instructor/create-course" },
      { label: "آمار و درآمد", href: "/dashboard/instructor/analytics" },
      { label: "دانشجویان", href: "/dashboard/instructor/students" },
    ],
  },

  // کاربر عادی
  {
    label: "داشبورد شخصی",
    href: "/dashboard",
    icon: "home",
    roles: ["USER"],
  },
  {
    label: "دوره‌های من",
    href: "/dashboard/my-courses",
    icon: "play-circle",
    roles: ["USER"],
  },
  {
    label: "مرور دوره‌ها",
    href: "/courses",
    icon: "book-open",
    roles: ["USER"],
  },
  {
    label: "سبد خرید",
    href: "/cart",
    icon: "shopping-cart",
    roles: ["USER"],
  },
];