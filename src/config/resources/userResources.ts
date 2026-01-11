import {
  BookOpen,
  Calendar,
  FileText,
  ClipboardList,
  Award,
  ShoppingBag,
  MessageSquare,
  Heart,
  Clock,
} from "lucide-react";

import { fetchStudentCourses } from "@/actions/student/courses";
import { fetchStudentCalendar } from "@/actions/student/calendar";
import { fetchStudentFiles } from "@/actions/student/files";
import { fetchStudentAssignments } from "@/actions/student/assignments";
import { fetchStudentCertificates } from "@/actions/student/certificates";
import { fetchStudentProducts } from "@/actions/student/products";
import { fetchStudentTickets } from "@/actions/student/tickets";
import { fetchStudentLikedPosts } from "@/actions/student/blog";

export type StudentResourceItem = {
  id: string;
  type:
    | "course"
    | "session"
    | "file"
    | "assignment"
    | "certificate"
    | "product"
    | "ticket"
    | "post";
  title: string;
  subtitle?: string;
  badge?: { text: string; class: string; icon?: any };
  image?: string;
  details?: Array<{ label: string; value: string; icon?: any }>;
  tags?: Array<{ text: string; class: string; icon?: any }>;
  raw?: any;
};

export const studentResourcesConfig = {
  label: "داشبورد من",
  description: "مدیریت دوره‌ها، کلاس‌ها، فایل‌ها، تکالیف، خریدها و فعالیت‌های شما",

  tabs: [
    {
      id: "courses",
      label: "دوره‌های من",
      icon: BookOpen,
      color: "text-blue-600",
      fetch: fetchStudentCourses,
    },
    {
      id: "calendar",
      label: "تقویم کلاس‌ها",
      icon: Calendar,
      color: "text-rose-600",
      fetch: fetchStudentCalendar,
    },
    {
      id: "files",
      label: "فایل‌های من",
      icon: FileText,
      color: "text-cyan-600",
      fetch: fetchStudentFiles,
    },
    {
      id: "assignments",
      label: "تکالیف و آزمون‌ها",
      icon: ClipboardList,
      color: "text-amber-600",
      fetch: fetchStudentAssignments,
    },
    {
      id: "certificates",
      label: "گواهینامه‌های من",
      icon: Award,
      color: "text-purple-600",
      fetch: fetchStudentCertificates,
    },
    {
      id: "products",
      label: "محصولات خریداری‌شده",
      icon: ShoppingBag,
      color: "text-green-600",
      fetch: fetchStudentProducts,
    },
    {
      id: "tickets",
      label: "تیکت‌های پشتیبانی",
      icon: MessageSquare,
      color: "text-indigo-600",
      fetch: fetchStudentTickets,
    },
    {
      id: "liked-posts",
      label: "پست‌های مورد علاقه",
      icon: Heart,
      color: "text-pink-600",
      fetch: fetchStudentLikedPosts,
    },
  ],

  card: {
    title: (item: StudentResourceItem) => item.title,
    subtitle: (item: StudentResourceItem) => item.subtitle || "",
    avatar: () => "د",
    badge: (item: StudentResourceItem) => item.badge || { text: item.type, class: "bg-gray-100 text-gray-800" },
    image: (item: StudentResourceItem) => item.image || item.raw?.image || item.raw?.course?.image,
    tags: (item: StudentResourceItem) => item.tags || [],
    details: (item: StudentResourceItem) => item.details || [],
  },

  actions: (item: StudentResourceItem, helpers?: any) => {
    const actions = [];

    switch (item.type) {
      case "course":
        actions.push({
          label: "ورود به دوره",
          icon: BookOpen,
          onClick: () => helpers?.router.push(`/courses/${item.raw?.slug}`),
        });
        break;

      case "session":
        if (item.raw?.isLive) {
          actions.push({
            label: "ورود به کلاس زنده",
            icon: Video,
            colorClass: "text-green-600",
            onClick: () => window.open(item.raw?.meetLink || `/courses/${item.raw?.course?.slug}/sessions/${item.id}`, "_blank"),
          });
        } else if (item.raw?.recordingLink) {
          actions.push({
            label: "مشاهده ضبط",
            icon: Video,
            onClick: () => window.open(item.raw.recordingLink, "_blank"),
          });
        }
        break;

      case "file":
        actions.push({
          label: "دانلود فایل",
          icon: Download,
          colorClass: "text-green-600",
          onClick: () => window.open(item.raw.url, "_blank"),
        });
        break;

      case "assignment":
        actions.push({
          label: "ارسال تکلیف",
          icon: ClipboardList,
          onClick: () => helpers?.router.push(`/assignments/${item.id}/submit`),
        });
        break;

      case "certificate":
        actions.push({
          label: "مشاهده گواهینامه",
          icon: Award,
          onClick: () => window.open(`/certificates/${item.id}`, "_blank"),
        });
        break;

      case "product":
        actions.push({
          label: "جزئیات محصول",
          icon: ShoppingBag,
          onClick: () => helpers?.router.push(`/products/${item.raw?.slug}`),
        });
        break;

      case "ticket":
        actions.push({
          label: "مشاهده تیکت",
          icon: MessageSquare,
          onClick: () => helpers?.router.push(`/support/tickets/${item.id}`),
        });
        break;

      case "post":
        actions.push({
          label: "مشاهده پست",
          icon: BookOpen,
          onClick: () => helpers?.router.push(`/blog/${item.raw?.slug}`),
        });
        break;
    }

    return actions;
  },

  createHref: (currentTab: string): string | undefined => {
    const map: Record<string, string> = {
      tickets: "/support/tickets/create",
    };
    return map[currentTab];
  },
} as const;