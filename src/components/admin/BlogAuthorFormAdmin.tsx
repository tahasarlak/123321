"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  GraduationCap,
  BookOpen,
  IdCard,
  Calendar,
  PenTool,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createUserByAdminSchema } from "@/lib/validations/schemas/authSchemas";
import * as z from "zod";

// اسکیمای پایه
const baseSchema = createUserByAdminSchema.omit({ password: true, roles: true });

// تبدیل رشته خالی به null
const emptyToNull = (val: unknown) => (val === "" || val === undefined ? null : val);
const stringToNumberOrNull = (val: unknown) => {
  if (val === "" || val === undefined) return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
};

// اسکیمای فرم وبلاگ‌نویس
const blogAuthorFormSchema = baseSchema.extend({
  roles: z.array(z.string().min(1)).refine(
    (roles) => roles.includes("BLOG_AUTHOR"),
    { message: "نقش وبلاگ‌نویس (BLOG_AUTHOR) الزامی است" }
  ),
  password: z.string().optional(),
  phone: z.preprocess(emptyToNull, z.string().nullable()),
  universityName: z.preprocess(emptyToNull, z.string().nullable()),
  majorName: z.preprocess(emptyToNull, z.string().nullable()),
  studentId: z.preprocess(emptyToNull, z.string().nullable()),
  entranceYear: z.preprocess(stringToNumberOrNull, z.number().int().min(1300).max(1500).nullable()),
});

// اسکیما برای ایجاد (رمز عبور الزامی)
const createSchema = blogAuthorFormSchema.refine(
  (data) => !!data.password && data.password.trim() !== "",
  { message: "رمز عبور الزامی است", path: ["password"] }
);

const editSchema = blogAuthorFormSchema;

type SubmitData = z.infer<typeof blogAuthorFormSchema>;

interface Props {
  userId?: string;
}

interface UserData {
  id?: string;
  name?: string;
  email?: string;
  phone?: string | null;
  universityName?: string | null;
  majorName?: string | null;
  studentId?: string | null;
  entranceYear?: number | null;
  roles?: string[];
}

const defaultFormValues: SubmitData = {
  name: "",
  email: "",
  phone: null,
  password: "",
  universityName: null,
  majorName: null,
  studentId: null,
  entranceYear: null,
  roles: ["BLOG_AUTHOR"], // پیش‌فرض: وبلاگ‌نویس
};

// نقش‌های قابل انتخاب (علاوه بر BLOG_AUTHOR)
const additionalRoles = ["USER", "INSTRUCTOR", "ADMIN", "SUPERADMIN"] as const;

const roleLabels: Record<string, string> = {
  BLOG_AUTHOR: "وبلاگ‌نویس",
  USER: "کاربر عادی (دانشجو)",
  INSTRUCTOR: "استاد",
  ADMIN: "ادمین",
  SUPERADMIN: "سوپرادمین",
};

export default function BlogAuthorFormAdmin({ userId }: Props = {}) {
  const router = useRouter();
  const isEdit = !!userId;
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  const schema = isEdit ? editSchema : createSchema;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<SubmitData>({
    resolver: zodResolver(schema),
    defaultValues: defaultFormValues,
  });

  const selectedRoles = watch("roles") || [];

  // بارگیری اطلاعات در حالت ویرایش
  useEffect(() => {
    if (!isEdit) return;

    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}`);
        if (!res.ok) throw new Error("کاربر یافت نشد");
        const data: UserData = await res.json();

        reset({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone ?? null,
          password: "",
          universityName: data.universityName ?? null,
          majorName: data.majorName ?? null,
          studentId: data.studentId ?? null,
          entranceYear: data.entranceYear ?? null,
          roles: data.roles?.includes("BLOG_AUTHOR") ? data.roles : ["BLOG_AUTHOR", ...(data.roles || [])],
        });
      } catch {
        toast.error("خطا در بارگیری اطلاعات وبلاگ‌نویس");
        router.push("/admin/blog-authors");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId, isEdit, reset, router]);

  // تغییر نقش (چک‌باکس)
  const toggleRole = (role: string) => {
    if (role === "BLOG_AUTHOR") {
      toast.error("نقش وبلاگ‌نویس را نمی‌توان حذف کرد");
      return;
    }

    if (selectedRoles.includes(role)) {
      setValue("roles", selectedRoles.filter((r) => r !== role));
    } else {
      setValue("roles", [...selectedRoles, role]);
    }
  };

  const onSubmit: SubmitHandler<SubmitData> = async (data) => {
    try {
      const body: any = {
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        roles: data.roles,
      };

      if (data.phone) body.phone = data.phone.trim();
      if (data.universityName) body.universityName = data.universityName.trim();
      if (data.majorName) body.majorName = data.majorName.trim();
      if (data.studentId) body.studentId = data.studentId.trim();
      if (data.entranceYear !== null) body.entranceYear = data.entranceYear;

      if (!isEdit) {
        if (!data.password?.trim()) {
          toast.error("رمز عبور الزامی است");
          return;
        }
        body.password = data.password.trim();
      }

      if (isEdit && data.password?.trim()) {
        body.password = data.password.trim();
      }

      const endpoint = isEdit
        ? `/api/admin/users/${userId}`
        : "/api/admin/blog-authors/create"; // می‌تونی endpoint جداگانه داشته باشی یا از همین users/create استفاده کنی

      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(isEdit ? "وبلاگ‌نویس با موفقیت به‌روزرسانی شد!" : "وبلاگ‌نویس جدید با موفقیت ایجاد شد!");
        router.push("/admin/blog-authors");
        router.refresh();
      } else {
        const error = await res.json();
        const errorMsg = error.error || "خطا در ذخیره اطلاعات";
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error(err);
      toast.error("مشکل در ارتباط با سرور");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground text-xl">در حال بارگیری اطلاعات وبلاگ‌نویس...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-3xl mx-auto">
      {/* نام و ایمیل */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <User className="w-4 h-4" />
            نام و نام خانوادگی *
          </label>
          <input
            {...register("name")}
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="نام کامل وبلاگ‌نویس"
          />
          {errors.name?.message && <p className="text-red-500 text-sm">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Mail className="w-4 h-4" />
            ایمیل *
          </label>
          <input
            {...register("email")}
            type="email"
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="author@domain.com"
          />
          {errors.email?.message && <p className="text-red-500 text-sm">{errors.email.message}</p>}
        </div>
      </div>

      {/* موبایل و رمز عبور */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Phone className="w-4 h-4" />
            شماره موبایل (اختیاری)
          </label>
          <input
            {...register("phone")}
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="09123456789"
          />
        </div>

        <div className="space-y-2 relative">
          <label className="text-sm font-medium flex items-center gap-2">
            <Lock className="w-4 h-4" />
            {isEdit ? "رمز عبور جدید (اختیاری)" : "رمز عبور *"}
          </label>
          <input
            {...register("password")}
            type={showPassword ? "text" : "password"}
            className="w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="رمز عبور قوی"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute left-3 top-10 text-muted-foreground hover:text-primary"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
          {errors.password?.message && <p className="text-red-500 text-sm">{errors.password.message}</p>}
        </div>
      </div>

      {/* اطلاعات تحصیلی (اختیاری) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            دانشگاه (اختیاری)
          </label>
          <input
            {...register("universityName")}
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="نام دانشگاه"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            رشته تحصیلی (اختیاری)
          </label>
          <input
            {...register("majorName")}
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="نام رشته"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <IdCard className="w-4 h-4" />
            شماره دانشجویی (اختیاری)
          </label>
          <input
            {...register("studentId")}
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="شماره دانشجویی"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            سال ورود (اختیاری)
          </label>
          <input
            {...register("entranceYear", { valueAsNumber: true })}
            type="number"
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="مثلاً ۱۴۰۲"
          />
          {errors.entranceYear?.message && <p className="text-red-500 text-sm">{errors.entranceYear.message}</p>}
        </div>
      </div>

      {/* نقش‌ها — BLOG_AUTHOR ثابت + نقش‌های اضافی */}
      <div className="space-y-4">
        <label className="text-sm font-medium flex items-center gap-2">
          <PenTool className="w-4 h-4" />
          نقش‌های کاربر
        </label>

        {/* نمایش نقش ثابت BLOG_AUTHOR */}
        <div className="mb-4">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
            <PenTool className="w-4 h-4" />
            وبلاگ‌نویس (اجباری)
          </span>
        </div>

        {/* نقش‌های اضافی قابل انتخاب */}
        <p className="text-sm text-muted-foreground mb-2">نقش‌های اضافی (اختیاری):</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {additionalRoles.map((role) => (
            <label key={role} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedRoles.includes(role)}
                onChange={() => toggleRole(role)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm">{roleLabels[role]}</span>
            </label>
          ))}
        </div>

        {errors.roles?.message && <p className="text-red-500 text-sm">{errors.roles.message}</p>}
      </div>

      {/* دکمه ذخیره */}
      <div className="flex justify-end pt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-lg font-bold hover:scale-105 transition shadow-lg disabled:opacity-70"
        >
          {isSubmitting
            ? "در حال ذخیره..."
            : isEdit
            ? "به‌روزرسانی وبلاگ‌نویس"
            : "ایجاد وبلاگ‌نویس جدید"}
        </button>
      </div>
    </form>
  );
}