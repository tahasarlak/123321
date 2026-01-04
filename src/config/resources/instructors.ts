// src/config/resources/instructors.ts
import { GraduationCap, CheckCircle, XCircle, Trash2 } from "lucide-react";
import React from "react";
import {
  createEditAction,
  createDeleteAction,
  COMMON_CLASSES,
} from "./shared";
import { fetchInstructors } from "@/actions/admin/instructors";

interface Instructor {
  id: string;
  name: string;
  bio?: string;
  expertise?: string;
  isActive: boolean;
  coursesCount?: number;
  createdAt: string | Date;
}

export const instructorsConfig = {
  label: "مدرسان",
  singular: "مدرس",
  icon: GraduationCap,
  color: "text-emerald-600",
  createHref: "/dashboard/admin/instructors/create",

  stats: {
    active: { label: "فعال", icon: CheckCircle, color: "text-green-600" },
    inactive: { label: "غیرفعال", icon: XCircle, color: "text-red-600" },
  },

  filters: [] as const,

  card: {
    title: (instructor: Instructor) => instructor.name,
    subtitle: (instructor: Instructor) => instructor.expertise || "بدون تخصص مشخص",
    avatar: (instructor: Instructor) => instructor.name[0]?.toUpperCase() ?? "م",
    badge: (instructor: Instructor) => ({
      text: instructor.isActive ? "فعال" : "غیرفعال",
      class: instructor.isActive ? "bg-green-600 text-white" : "bg-red-600 text-white",
    }),
    tags: (instructor: Instructor): { text: string; class: string }[] => [
      { text: `${instructor.coursesCount || 0} دوره`, class: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
    ],
    details: (instructor: Instructor): { label: string; value: string }[] => [
      instructor.bio && { label: "بیوگرافی", value: instructor.bio },
      { label: "تاریخ ایجاد", value: new Date(instructor.createdAt).toLocaleDateString("fa-IR") },
    ].filter(Boolean) as any,
    status: (instructor: Instructor) => ({
      text: instructor.isActive ? "فعال" : "غیرفعال",
      icon: instructor.isActive ? CheckCircle : XCircle,
      color: instructor.isActive ? "text-green-600" : "text-red-600",
    }),
  },

  actions: (instructor: Instructor, helpers?: any) => [
    createEditAction("instructors", instructor, helpers),
    {
      label: instructor.isActive ? "غیرفعال کردن" : "فعال کردن",
      icon: instructor.isActive ? XCircle : CheckCircle,
      ...COMMON_CLASSES.toggle(!instructor.isActive),
      onClick: () => helpers?.onBulkAction?.([instructor.id], instructor.isActive ? "deactivate" : "activate"),
    },
    createDeleteAction(instructor, helpers),
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

  fetchAction: fetchInstructors,

  // === فرم عمومی بدون prisma و بدون ایمپورت کامپوننت ===
  form: {
    fields: [
      { type: "text", name: "name", label: "نام کامل مدرس", required: true },
      { type: "email", name: "email", label: "ایمیل", required: true },
      { type: "password", name: "password", label: "رمز عبور", required: true, createOnly: true },
      { type: "text", name: "phone", label: "شماره موبایل" },
      { type: "image", name: "image", label: "تصویر پروفایل مدرس", required: true },
      { type: "textarea", name: "bio", label: "بیوگرافی کامل (رزومه تدریس)", required: true, rows: 8 },
      { type: "text", name: "expertise", label: "حوزه تخصصی (مثلاً ایمپلنت، ارتودنسی)" },
      { type: "text", name: "degree", label: "مدرک تحصیلی (مثلاً دکتری تخصصی)" },
      { type: "text", name: "academicRank", label: "رتبه علمی (مثلاً استاد)" },
      { type: "text", name: "instagram", label: "اینستاگرام (بدون @)" },
      { type: "select", name: "universityId", label: "دانشگاه", options: "preload.universities" },
      { type: "select", name: "majorId", label: "رشته تحصیلی", options: "preload.majors" },
      { type: "checkbox", name: "emailVerified", label: "ایمیل تأیید شده" },
      { type: "checkbox", name: "isActive", label: "مدرس فعال", defaultChecked: true },
      // نقش INSTRUCTOR به صورت خودکار در server action اضافه می‌شه
    ],
    // preload و fetchOne در صفحات عمومی create/edit انجام می‌شه
    // schema و onSubmitAction در صفحات عمومی تعریف می‌شه
  },
} as const;