// src/config/resources/users.ts
import { Users, Crown, Shield, GraduationCap, PenTool, CheckCircle, AlertCircle, Ban } from "lucide-react";
import React from "react";
import {
  createEditAction,
  createBanToggleAction,
  createDeleteAction,
  getUserMainRole,
} from "./shared";
import { fetchUsers, fetchUserById } from "@/actions/admin/users";
import { ROLES, ROLE_DISPLAY_CONFIG } from "@/config/roles"; 
import { Gender } from "@prisma/client";
import { User } from "@/types/user";

const ROLE_PARAM_MAP: Record<string, string> = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  INSTRUCTOR: "instructor",
  BLOG_AUTHOR: "blog_author",
  USER: "user",
};

export const usersConfig = {
  label: "کاربران",
  singular: "کاربر",
  icon: Users,
  color: "text-primary",
  createHref: "/dashboard/admin/users/create",
  stats: {
    SUPER_ADMIN: { label: "سوپر ادمین", icon: Crown, color: "text-red-600" },
    ADMIN: { label: "ادمین", icon: Shield, color: "text-purple-600" },
    INSTRUCTOR: { label: "مدرس", icon: GraduationCap, color: "text-blue-600" },
    BLOG_AUTHOR: { label: "نویسنده بلاگ", icon: PenTool, color: "text-indigo-600" },
    USER: { label: "کاربر عادی", icon: Users, color: "text-foreground/70" },
  },
  filters: [
    {
      type: "select",
      param: "role",
      placeholder: "فیلتر بر اساس نقش",
      options: (stats: { key: string; count: number }[]) => {
        const statsMap = Object.fromEntries(stats.map((s) => [s.key, s.count]));
        return ROLES.map((role) => {
          const prismaKey = role.value; // حالا دقیقاً همونه: SUPER_ADMIN و غیره
          const paramValue = ROLE_PARAM_MAP[prismaKey] || prismaKey.toLowerCase();
          return {
            value: paramValue,
            label: `${role.label} (${statsMap[prismaKey] ?? 0})`,
            icon: role.icon && React.createElement(role.icon, { className: "w-4 h-4" }),
          };
        });
      },
    },
  ] as const,
  card: {
    title: (user: User) => user.name || "بدون نام",
    subtitle: (user: User) => user.email,
    avatar: (user: User) => user.name?.[0]?.toUpperCase() ?? "?",
    // استفاده از ROLE_DISPLAY_CONFIG به جای ROLE_BADGE_MAP قدیمی
    badge: (user: User) => {
      const mainRole = getUserMainRole(user.roles);
      const config = ROLE_DISPLAY_CONFIG[mainRole];
      return {
        text: config.text,
        class: config.class,
      };
    },
    tags: (user: User) =>
      [
        user.universityName && {
          text: user.universityName,
          class: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        },
        user.majorName && {
          text: user.majorName,
          class: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
        },
      ].filter(Boolean),
    details: (user: User) =>
      [
        user.studentId && { label: "شماره دانشجویی", value: user.studentId },
        user.entranceYear && { label: "سال ورود", value: user.entranceYear.toString() },
        { label: "وضعیت تحصیلی", value: user.academicStatus || "نامشخص" },
      ].filter(Boolean),
    status: (user: User) => ({
      text: user.isBanned ? "حساب مسدود شده" : "حساب فعال",
      icon: user.isBanned ? AlertCircle : CheckCircle,
      color: user.isBanned ? "text-destructive" : "text-green-600",
    }),
  },
  actions: (user: User, helpers?: any) => [
    createEditAction("users", user, helpers),
    createBanToggleAction(user, helpers),
    createDeleteAction(user, helpers),
  ],
  bulkActions: [
    {
      label: "مسدود کردن دسته‌جمعی",
      action: "ban",
      icon: React.createElement(Ban, { className: "w-6 h-6" }),
      color: "bg-destructive text-white hover:bg-destructive/90",
    },
    {
      label: "رفع مسدودیت دسته‌جمعی",
      action: "unban",
      icon: React.createElement(CheckCircle, { className: "w-6 h-6" }),
      color: "bg-green-600 text-white hover:bg-green-700",
    },
  ],
  fetchAction: fetchUsers,
  fetchOne: fetchUserById,
  form: {
    fields: [
      { type: "text", name: "name", label: "نام کامل", required: true },
      { type: "email", name: "email", label: "ایمیل", required: true },
      {
        type: "password",
        name: "password",
        label: "رمز عبور",
        required: true,
        createOnly: true,
      },
      { type: "text", name: "phone", label: "شماره موبایل" },
      {
        type: "select",
        name: "gender",
        label: "جنسیت",
        options: [
          { value: "", label: "انتخاب کنید" },
          { value: Gender.MALE, label: "مرد" },
          { value: Gender.FEMALE, label: "زن" },
          { value: Gender.OTHER, label: "سایر" },
        ],
      },
      {
        type: "multi-select",
        name: "roles",
        label: "نقش‌ها",
        required: true,
        options: ROLES.map((r) => ({ value: r.value, label: r.label })),
      },
      { type: "image", name: "image", label: "تصویر پروفایل" },
      { type: "textarea", name: "bio", label: "بیوگرافی" },
      { type: "text", name: "instagram", label: "اینستاگرام (بدون @)" },
      { type: "text", name: "studentId", label: "شماره دانشجویی" },
      { type: "number", name: "entranceYear", label: "سال ورود" },
      { type: "checkbox", name: "emailVerified", label: "ایمیل تأیید شده" },
      {
        type: "checkbox",
        name: "isActive",
        label: "حساب فعال",
        defaultChecked: true,
      },
    ],
  },
} as const;