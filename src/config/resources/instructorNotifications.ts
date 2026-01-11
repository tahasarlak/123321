// src/config/resources/instructorNotifications.ts
import { Bell, Megaphone, Calendar, Users, Trash2 } from "lucide-react";
import { fetchInstructorNotifications } from "@/actions/auth/notifications";
import { ResourceHelpers } from "@/types/resource-types";

export type NotificationListItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  sentAt: string;
  recipientCount: number;
  sampleRecipient?: { name: string } | null;
};

export const instructorNotificationsConfig = {
  label: "اعلان‌های ارسالی",
  singular: "اعلان",
  icon: Megaphone,
  color: "text-orange-600",
  createHref: "/dashboard/instructor/notifications/send",
  stats: {
    total: { label: "کل اعلان‌ها", icon: Bell, color: "text-orange-600" },
  },
  filters: [
    {
      type: "select" as const,
      param: "courseId",
      label: "دوره",
      options: "[preload.courses]",
      defaultValue: "all",
    },
  ] as const,
  card: {
    title: (notif: NotificationListItem) => notif.title,
    subtitle: (notif: NotificationListItem) => notif.message.length > 60 ? notif.message.slice(0, 60) + "..." : notif.message,
    avatar: () => "ا",
    badge: (notif: NotificationListItem) => ({
      text: notif.type === "announcement" ? "اعلان" : notif.type,
      class: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    }),
    tags: (notif: NotificationListItem) => [
      {
        text: `${notif.recipientCount} گیرنده`,
        class: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        icon: Users,
      },
      notif.sampleRecipient && {
        text: `به: ${notif.sampleRecipient.name}`,
        class: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
      },
    ].filter(Boolean),
    details: (notif: NotificationListItem) => [
      {
        label: "ارسال شده در",
        value: new Date(notif.sentAt).toLocaleString("fa-IR"),
        icon: Calendar,
      },
      notif.link && {
        label: "لینک مرتبط",
        value: "دارد",
      },
    ].filter(Boolean),
  },
  actions: (notif: NotificationListItem, helpers?: Partial<ResourceHelpers>) => [
    {
      label: "ارسال مجدد",
      icon: Bell,
      colorClass: "text-green-600 bg-green-500/10",
      hoverBgClass: "hover:bg-green-500/20",
      onClick: () => {
        helpers?.router.push(`/dashboard/instructor/notifications/send?copy=${notif.id}`);
      },
    },
    // اگر بخوای حذف هم داشته باشی (اختیاری)
    // createDeleteAction(notif, helpers),
  ],
  bulkActions: [],
  fetchAction: fetchInstructorNotifications,
  fetchOne: null,
  form: {
    fields: [
      {
        type: "select",
        name: "courseId",
        label: "ارسال به همه دانشجویان دوره",
        options: "[preload.courses]",
        help: "اگر انتخاب کنید، به همه دانشجویان تأییدشده این دوره ارسال می‌شود",
      },
      {
        type: "select",
        name: "groupId",
        label: "یا به یک گروه خاص",
        options: "[preload.groups]",
        help: "اگر گروه انتخاب کنید، فقط به اعضای آن گروه ارسال می‌شود",
      },
      {
        type: "multiselect",
        name: "userIds",
        label: "یا دانشجویان خاص",
        options: "[preload.students]",
        help: "چند دانشجو را انتخاب کنید",
      },
      {
        type: "text",
        name: "title",
        label: "عنوان اعلان",
        required: true,
      },
      {
        type: "textarea",
        name: "message",
        label: "متن اعلان",
        required: true,
      },
      {
        type: "select",
        name: "type",
        label: "نوع اعلان",
        options: [
          { value: "announcement", label: "اعلان عمومی" },
          { value: "homework", label: "تکلیف" },
          { value: "exam", label: "امتحان" },
          { value: "session", label: "جلسه زنده" },
        ],
        defaultValue: "announcement",
      },
      {
        type: "text",
        name: "link",
        label: "لینک مرتبط (اختیاری)",
        placeholder: "/courses/my-course/lessons/123",
      },
      {
        type: "hidden",
        name: "honeypot",
        label: "",
      },
    ],
    preload: async () => {
      return { courses: [], groups: [], students: [] };
    },
  },
} as const;