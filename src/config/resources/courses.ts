import { BookOpen, CheckCircle, Clock, Archive, Eye, EyeOff, Trash2, XCircle } from "lucide-react";
import {
  createEditAction,
  createPublishToggleAction,
  createDeleteAction,
  COURSE_STATUS_BADGE_MAP,
  COURSE_STATUS_STATUS_MAP,
} from "./shared";
import { fetchCourses, approveCourse, rejectCourse } from "@/actions/admin/courses";
import { CourseListItem, ResourceHelpers } from "@/types/resource-types";

export const coursesConfig = {
  label: "دوره‌های آموزشی",
  singular: "دوره",
  icon: BookOpen,
  color: "text-blue-600",
  createHref: "/dashboard/admin/courses/create",
  stats: {
    published: { label: "منتشر شده", icon: CheckCircle, color: "text-green-600" },
    draft: { label: "پیش‌نویس", icon: Clock, color: "text-orange-600" },
    pending_review: { label: "در انتظار تأیید", icon: Clock, color: "text-amber-600" },
    rejected: { label: "رد شده", icon: XCircle, color: "text-red-600" },
    archived: { label: "آرشیو شده", icon: Archive, color: "text-gray-500" },
  },
  filters: [
    {
      type: "select",
      param: "status",
      label: "وضعیت دوره",
      options: [
        { value: "all", label: "همه دوره‌ها" },
        { value: "published", label: "منتشر شده" },
        { value: "draft", label: "پیش‌نویس" },
        { value: "pending_review", label: "در انتظار تأیید" },
        { value: "rejected", label: "رد شده" },
        { value: "archived", label: "آرشیو شده" },
      ],
      defaultValue: "all",
    },
  ] as const,
  card: {
    title: (course: CourseListItem) => course.title || "بدون عنوان",
    subtitle: (course: CourseListItem) => course.slug || "بدون اسلاگ",
    avatar: (course: CourseListItem) => course.title?.[0]?.toUpperCase() ?? "د",
    badge: (course: CourseListItem) => {
      const key = course.status?.toLowerCase() as keyof typeof COURSE_STATUS_BADGE_MAP;
      return COURSE_STATUS_BADGE_MAP[key] ?? COURSE_STATUS_BADGE_MAP.draft;
    },
    tags: (course: CourseListItem) =>
      [
        course.instructor && {
          text: course.instructor.name,
          class: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
        },
        course.level && {
          text: course.level,
          class: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
        },
      ].filter(Boolean) as any,
    details: (course: CourseListItem) => [
      {
        label: "قیمت",
        value: course.price ? `${course.price.toLocaleString("fa-IR")} تومان` : "رایگان",
      },
      {
        label: "تعداد دانشجو",
        value: (course._count?.buyers ?? 0).toLocaleString("fa-IR"),
      },
    ],
    status: (course: CourseListItem) => {
      const key = course.status?.toLowerCase() as keyof typeof COURSE_STATUS_STATUS_MAP;
      return COURSE_STATUS_STATUS_MAP[key] ?? COURSE_STATUS_STATUS_MAP.draft;
    },
  },
  actions: (course: CourseListItem, helpers?: Partial<ResourceHelpers> & { refresh?: () => void }) => {
    const baseActions = [
      createEditAction("courses", course, helpers),
      createDeleteAction(course, helpers),
    ];

    if (course.status === "PENDING_REVIEW") {
      return [
        ...baseActions,
        {
          label: "تأیید و انتشار",
          icon: CheckCircle,
          colorClass: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",
          hoverBgClass: "hover:bg-emerald-500/20",
          hoverRingClass: "hover:ring-emerald-500/30",
          rippleClass: "bg-emerald-500/20",
          onClick: async () => {
            const result = await approveCourse(course.id);
            if (result.success) {
              helpers?.refresh?.();
            }
          },
        },
        {
          label: "رد کردن",
          icon: XCircle,
          colorClass: "text-red-600 bg-red-500/10 dark:text-red-400",
          hoverBgClass: "hover:bg-red-500/20",
          hoverRingClass: "hover:ring-red-500/30",
          rippleClass: "bg-red-500/20",
          onClick: async () => {
            const reason = window.prompt("دلیل رد دوره را وارد کنید:");
            if (reason !== null && reason.trim() !== "") {
              const result = await rejectCourse(course.id, reason);
              if (result.success) {
                helpers?.refresh?.();
              }
            }
          },
        },
      ];
    }

    return [...baseActions, createPublishToggleAction(course, helpers)];
  },
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
  fetchAction: fetchCourses,
  form: {
    fields: [
      { type: "text", name: "title", label: "عنوان دوره", required: true },
      { type: "text", name: "slug", label: "اسلاگ", required: true },
      {
        type: "select",
        name: "instructorId",
        label: "استاد",
        required: true,
        options: "preload.instructors",
      },
      {
        type: "select",
        name: "level",
        label: "سطح دوره",
        required: true,
        options: [
          { value: "مبتدی", label: "مبتدی" },
          { value: "متوسط", label: "متوسط" },
          { value: "پیشرفته", label: "پیشرفته" },
          { value: "حرفه‌ای", label: "حرفه‌ای" },
        ],
      },
      { type: "number", name: "price", label: "قیمت (تومان)", required: true },
      {
        type: "textarea",
        name: "description",
        label: "توضیحات کامل دوره",
        required: true,
        rows: 8,
      },
      { type: "image", name: "image", label: "تصویر کاور دوره", required: true },
      {
        type: "checkbox",
        name: "isPublished",
        label: "منتشر شده",
        defaultChecked: false,
      },
    ],
  },
} as const;