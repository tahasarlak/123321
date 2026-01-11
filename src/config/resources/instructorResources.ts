import {
  BookOpen,
  BookMarked,
  Users,
  Calendar,
  FileText,
  DollarSign,
  Award,
  UserCheck,
  UserX,
  Trash2,
  Edit3,
  Download,
  Link2,
  Video,
  Clock,
  Eye,
  EyeOff,
  GripVertical,
} from "lucide-react";
import { createCustomAction } from "./shared";
import { fetchInstructorCertificates } from "@/actions/courses/certificates";
import { fetchInstructorCourses } from "@/actions/courses/courses";
import { fetchInstructorEnrollments } from "@/actions/courses/enrollments";
import { fetchInstructorGroups } from "@/actions/courses/groups";
import { fetchInstructorLessons } from "@/actions/courses/lessons";
import { fetchInstructorSessions } from "@/actions/courses/sessions";
import { fetchInstructorEarnings } from "@/actions/instructor/earnings";
import { fetchInstructorFiles } from "@/actions/public/upload";


export type InstructorResourceItem = {
  id: string;
  type:
    | "course"
    | "lesson"
    | "group"
    | "session"
    | "file"
    | "earning"
    | "certificate"
    | "enrollment";
  title: string;
  subtitle?: string;
  badge?: { text: string; class: string; icon?: any };
  image?: string;
  details?: Array<{ label: string; value: string; icon?: any }>;
  tags?: Array<{ text: string; class: string; icon?: any }>;
  raw?: any; // داده خام برای actions خاص
};

export const instructorResourcesConfig = {
  label: "داشبورد مدرس",
  description: "مدیریت کامل دوره‌ها، درس‌ها، گروه‌ها، جلسات، فایل‌ها، درخواست‌های ثبت‌نام، درآمد و گواهینامه‌ها",

  tabs: [
    {
      id: "courses",
      label: "دوره‌های من",
      icon: BookOpen,
      color: "text-blue-600",
      fetch: fetchInstructorCourses,
    },
    {
      id: "lessons",
      label: "درس‌ها",
      icon: BookMarked,
      color: "text-teal-600",
      fetch: fetchInstructorLessons,
    },
    {
      id: "groups",
      label: "گروه‌های کلاسی",
      icon: Users,
      color: "text-emerald-600",
      fetch: fetchInstructorGroups,
    },
    {
      id: "sessions",
      label: "جلسات کلاس",
      icon: Calendar,
      color: "text-rose-600",
      fetch: fetchInstructorSessions,
    },
    {
      id: "enrollments",
      label: "درخواست‌های ثبت‌نام",
      icon: Users,
      color: "text-amber-600",
      fetch: fetchInstructorEnrollments,
    },
    {
      id: "files",
      label: "فایل‌های ضمیمه",
      icon: FileText,
      color: "text-cyan-600",
      fetch: fetchInstructorFiles,
    },
    {
      id: "earnings",
      label: "درآمد من",
      icon: DollarSign,
      color: "text-green-600",
      fetch: fetchInstructorEarnings,
    },
    {
      id: "certificates",
      label: "گواهینامه‌ها",
      icon: Award,
      color: "text-purple-600",
      fetch: fetchInstructorCertificates,
    },
  ],

  card: {
    title: (item: InstructorResourceItem) => item.title,
    subtitle: (item: InstructorResourceItem) => item.subtitle || "",
    avatar: (item: InstructorResourceItem) => {
      const firstLetter =
        item.title?.[0]?.toUpperCase() ||
        (item.raw?.user?.name?.[0]?.toUpperCase()) ||
        "م";
      return firstLetter;
    },
    badge: (item: InstructorResourceItem) => item.badge || { text: item.type, class: "bg-gray-100 text-gray-800" },
    image: (item: InstructorResourceItem) => item.image,
    tags: (item: InstructorResourceItem) => item.tags || [],
    details: (item: InstructorResourceItem) => item.details || [],
  },

  actions: (item: InstructorResourceItem, helpers?: any) => {
    const actions = [];

    // ویرایش برای بخش‌های قابل ویرایش
    if (["course", "lesson", "group", "session", "file"].includes(item.type)) {
      actions.push(
        createCustomAction({
          label: "ویرایش",
          icon: Edit3,
          onClick: () => helpers?.router.push(`/dashboard/instructor/${item.type}s/${item.id}/edit`),
        })
      );
    }

    // actions خاص هر نوع
    switch (item.type) {
      case "session":
        if (item.raw?.meetLink) {
          actions.push(
            createCustomAction({
              label: "ورود به جلسه",
              icon: Video,
              colorClass: "text-green-600",
              onClick: () => window.open(item.raw.meetLink, "_blank"),
            }),
            createCustomAction({
              label: "کپی لینک",
              icon: Link2,
              onClick: () => navigator.clipboard.writeText(item.raw.meetLink),
            })
          );
        }
        if (item.raw?.recordingLink) {
          actions.push(
            createCustomAction({
              label: "مشاهده ضبط",
              icon: Video,
              colorClass: "text-blue-600",
              onClick: () => window.open(item.raw.recordingLink, "_blank"),
            })
          );
        }
        break;

      case "lesson":
        actions.push(
          createCustomAction({
            label: "مدیریت محتوا",
            icon: BookOpen,
            onClick: () => helpers?.router.push(`/dashboard/instructor/lessons/${item.id}/content`),
          })
        );
        break;

      case "file":
        actions.push(
          createCustomAction({
            label: "دانلود",
            icon: Download,
            colorClass: "text-green-600",
            onClick: () => window.open(item.raw.url, "_blank"),
          }),
          createCustomAction({
            label: "کپی لینک",
            icon: Link2,
            onClick: () => navigator.clipboard.writeText(`${window.location.origin}${item.raw.url}`),
          })
        );
        break;

      case "enrollment":
        if (item.raw?.status === "PENDING") {
          actions.push(
            createCustomAction({
              label: "تأیید",
              icon: UserCheck,
              colorClass: "text-green-600",
              onClick: async () => {
                if (confirm("این درخواست را تأیید می‌کنید؟")) {
                  const { changeEnrollmentStatusAction } = await import("@/actions/courses/enrollments");
                  const result = await changeEnrollmentStatusAction({ enrollmentId: item.id, action: "APPROVE" });
                  if (result.success) helpers?.router.refresh();
                }
              },
            }),
            createCustomAction({
              label: "رد",
              icon: UserX,
              colorClass: "text-red-600",
              onClick: async () => {
                if (confirm("این درخواست را رد می‌کنید؟")) {
                  const { changeEnrollmentStatusAction } = await import("@/actions/courses/enrollments");
                  const result = await changeEnrollmentStatusAction({ enrollmentId: item.id, action: "REJECT" });
                  if (result.success) helpers?.router.refresh();
                }
              },
            })
          );
        }
        break;
    }

    // حذف برای همه به جز درآمد و گواهینامه
    if (!["earning", "certificate"].includes(item.type)) {
      actions.push(
        createCustomAction({
          label: "حذف",
          icon: Trash2,
          colorClass: "text-red-600",
          onClick: async () => {
            if (confirm("مطمئن هستید؟")) {
              helpers?.router.refresh();
            }
          },
        })
      );
    }

    return actions;
  },

  // ایجاد جدید بر اساس تب
  createHref: (currentTab: string): string | undefined => {
    const map: Record<string, string> = {
      courses: "/dashboard/instructor/courses/create",
      lessons: "/dashboard/instructor/lessons/create",
      groups: "/dashboard/instructor/groups/create",
      sessions: "/dashboard/instructor/sessions/create",
      files: "/dashboard/instructor/files/upload",
    };
    return map[currentTab];
  },
} as const;