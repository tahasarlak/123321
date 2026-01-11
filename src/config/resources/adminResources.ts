import { fetchInstructors } from "@/actions/admin/instructors";
import { fetchAdminCourses } from "@/actions/courses/courses";
import {
  Users,
  GraduationCap,
  BookOpen,
  DollarSign,
  CheckCircle,
  XCircle,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  Ban,
  UserCheck,
} from "lucide-react";
import { createCustomAction } from "./shared";


export type AdminResourceItem = {
  id: string;
  type: "user" | "instructor" | "course" | "withdrawal";
  title: string;
  subtitle?: string;
  badge?: { text: string; class: string; icon?: any };
  image?: string;
  details?: Array<{ label: string; value: string; icon?: any }>;
  tags?: Array<{ text: string; class: string }>;
  raw?: any;
};

export const adminResourcesConfig = {
  label: "داشبورد مدیریت",
  description: "مدیریت کاربران، مدرسان، دوره‌ها، برداشت درآمد و تنظیمات سایت",

  tabs: [
    {
      id: "users",
      label: "کاربران",
      icon: Users,
      color: "text-indigo-600",
      fetch: fetchAdminUsers,
    },
    {
      id: "instructors",
      label: "مدرسان",
      icon: GraduationCap,
      color: "text-emerald-600",
      fetch: fetchInstructors,
    },
    {
      id: "courses",
      label: "دوره‌ها",
      icon: BookOpen,
      color: "text-blue-600",
      fetch: fetchAdminCourses,
    },
    {
      id: "withdrawals",
      label: "درخواست‌های برداشت",
      icon: DollarSign,
      color: "text-green-600",
      fetch: fetchWithdrawalRequests,
    },
    // {
    //   id: "stats",
    //   label: "آمار سایت",
    //   icon: BarChart3,
    //   color: "text-purple-600",
    //   fetch: fetchSiteStats,
    // },
  ],

  card: {
    title: (item: AdminResourceItem) => item.title,
    subtitle: (item: AdminResourceItem) => item.subtitle || "",
    avatar: (item: AdminResourceItem) => {
      const name = item.raw?.name || item.title;
      return name?.[0]?.toUpperCase() || "ا";
    },
    badge: (item: AdminResourceItem) => item.badge || { text: item.type, class: "bg-gray-100 text-gray-800" },
    image: (item: AdminResourceItem) => item.image || item.raw?.image,
    tags: (item: AdminResourceItem) => item.tags || [],
    details: (item: AdminResourceItem) => item.details || [],
  },

  actions: (item: AdminResourceItem, helpers?: any) => {
    const actions = [];

    // ویرایش برای همه
    actions.push(
      createCustomAction({
        label: "ویرایش",
        icon: Edit3,
        onClick: () => helpers?.router.push(`/dashboard/admin/${item.type}s/${item.id}/edit`),
      })
    );

    switch (item.type) {
      case "course":
        if (item.raw?.status === "PENDING_REVIEW") {
          actions.push(
            createCustomAction({
              label: "تأیید و انتشار",
              icon: CheckCircle,
              colorClass: "text-emerald-600",
              onClick: async () => {
                if (confirm("این دوره را تأیید و منتشر می‌کنید؟")) {
                  const { approveCourse } = await import("@/actions/courses/courses");
                  const res = await approveCourse(item.id);
                  if (res.success) helpers?.router.refresh();
                }
              },
            }),
            createCustomAction({
              label: "رد کردن",
              icon: XCircle,
              colorClass: "text-red-600",
              onClick: async () => {
                const reason = prompt("دلیل رد دوره را وارد کنید:");
                if (reason?.trim()) {
                  const { rejectCourse } = await import("@/actions/courses/courses");
                  const res = await rejectCourse(item.id, reason);
                  if (res.success) helpers?.router.refresh();
                }
              },
            })
          );
        } else {
          actions.push(
            createCustomAction({
              label: item.raw?.status === "PUBLISHED" ? "لغو انتشار" : "انتشار",
              icon: item.raw?.status === "PUBLISHED" ? EyeOff : Eye,
              onClick: async () => {
                const { togglePublishCourse } = await import("@/actions/courses/courses");
                await togglePublishCourse(item.id);
                helpers?.router.refresh();
              },
            })
          );
        }
        break;

      case "instructor":
        actions.push(
          createCustomAction({
            label: item.raw?.isActive ? "غیرفعال کردن" : "فعال کردن",
            icon: item.raw?.isActive ? Ban : UserCheck,
            colorClass: item.raw?.isActive ? "text-red-600" : "text-green-600",
            onClick: async () => {
              const { toggleInstructorStatus } = await import("@/actions/admin/instructors");
              await toggleInstructorStatus(item.id);
              helpers?.router.refresh();
            },
          })
        );
        break;

      case "withdrawal":
        if (item.raw?.status === "PENDING") {
          actions.push(
            createCustomAction({
              label: "تأیید و پرداخت",
              icon: CheckCircle,
              colorClass: "text-green-600",
              onClick: async () => {
                if (confirm("این درخواست برداشت را تأیید و پرداخت می‌کنید؟")) {
                  const { approveWithdrawal } = await import("@/actions/admin/withdrawals");
                  const res = await approveWithdrawal(item.id);
                  if (res.success) helpers?.router.refresh();
                }
              },
            }),
            createCustomAction({
              label: "رد کردن",
              icon: XCircle,
              colorClass: "text-red-600",
              onClick: async () => {
                const note = prompt("دلیل رد را وارد کنید:");
                if (note) {
                  const { rejectWithdrawal } = await import("@/actions/admin/withdrawals");
                  const res = await rejectWithdrawal(item.id, note);
                  if (res.success) helpers?.router.refresh();
                }
              },
            })
          );
        }
        break;
    }

    // حذف برای همه
    actions.push(
      createCustomAction({
        label: "حذف",
        icon: Trash2,
        colorClass: "text-red-600",
        onClick: async () => {
          if (confirm("مطمئن هستید؟ این عمل برگشت‌ناپذیر است.")) {
            helpers?.router.refresh();
          }
        },
      })
    );

    return actions;
  },

  createHref: (currentTab: string): string | undefined => {
    const map: Record<string, string> = {
      users: "/dashboard/admin/users/create",
      instructors: "/dashboard/admin/instructors/create",
      courses: null, // ادمین دوره ایجاد نمی‌کنه، فقط تأیید می‌کنه
    };
    return map[currentTab];
  },
} as const;