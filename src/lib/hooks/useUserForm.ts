import { useState, useEffect, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormValues, Major, University } from "@/types/user";
import {
  createUserByAdminSchema,
  updateUserByAdminSchema,
} from "@/lib/validations/adminUsers";

interface UseUserFormProps {
  userId?: string;
  initialRoles?: string[];
}

export function useUserForm({ userId, initialRoles = [] }: UseUserFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = !!userId;
  const [isPending, startTransition] = useTransition();
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // نقش‌های کاربر جاری (برای دسترسی SUPERADMIN)
  const sessionRoles =
    queryClient.getQueryData<string[]>(["user", "roles"]) || [];
  const isSuperAdmin = sessionRoles.includes("SUPERADMIN");

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(
      isEdit ? updateUserByAdminSchema : createUserByAdminSchema
    ),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      gender: null,
      roles: initialRoles.length > 0 ? initialRoles : ["USER"],
      bio: null,
      instagram: null,
      image: null,
      isActive: true,
      universityId: null,
      majorId: null,
      universityName: null,
      majorName: null,
      studentId: null,
      entranceYear: null,
      shortBio: null,
      website: null,
      twitter: null,
      linkedin: null,
      degree: null,
      academicRank: null,
      emailVerified: false,
    },
  });

  const selectedRoles = watch("roles") || [];

  const isInstructor = useMemo(
    () => selectedRoles.includes("INSTRUCTOR"),
    [selectedRoles]
  );
  const isBlogger = useMemo(
    () => selectedRoles.includes("BLOGGER"),
    [selectedRoles]
  );

  // پیش‌بارگذاری دانشگاه‌ها و رشته‌ها
  const { data: preloadData, isLoading: preloadLoading } = useQuery<{
    universities: University[];
    majors: Major[];
  }>({
    queryKey: ["admin-preload-instructor"],
    queryFn: async () => {
      const [unisRes, majorsRes] = await Promise.all([
        fetch("/api/admin/universities"),
        fetch("/api/admin/majors"),
      ]);
      if (!unisRes.ok || !majorsRes.ok) throw new Error("Failed to load");
      const universities = await unisRes.json();
      const majors = await majorsRes.json();
      return { universities, majors };
    },
    enabled: isInstructor || isEdit,
    staleTime: 5 * 60 * 1000, // ۵ دقیقه cache
  });

  // بارگذاری اطلاعات کاربر در حالت ویرایش
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await fetch(`/api/admin/users/${userId}`);
      if (!res.ok) throw new Error("Failed to load user");
      const json = await res.json();
      return json.user;
    },
    enabled: isEdit,
  });

  // پر کردن فرم با داده‌های کاربر
  useEffect(() => {
    if (userData) {
      reset({
        name: userData.name || "",
        email: userData.email || "",
        phone: userData.phone || "",
        gender: userData.gender || null,
        roles: userData.roles || [],
        bio: userData.bio || null,
        shortBio: userData.shortBio || null,
        instagram: userData.instagram || null,
        twitter: userData.twitter || null,
        linkedin: userData.linkedin || null,
        website: userData.website || null,
        image: userData.image || null,
        isActive: userData.isActive ?? true,
        emailVerified: !!userData.emailVerifiedAt,
        universityId: userData.universityId || null,
        majorId: userData.majorId || null,
        universityName: userData.universityName || null,
        majorName: userData.majorName || null,
        studentId: userData.studentId || null,
        entranceYear: userData.entranceYear || null,
        degree: userData.degree || null,
        academicRank: userData.academicRank || null,
      });
      setImageUrl(userData.image || null);
    }
  }, [userData, reset]);

  const onSubmit = handleSubmit((data) => {
    if ((isInstructor || isBlogger) && !imageUrl) {
      toast.error("آپلود تصویر پروفایل الزامی است");
      return;
    }

    startTransition(async () => {
      const body = {
        name: data.name.trim(),
        email: isSuperAdmin ? data.email.toLowerCase().trim() : undefined,
        phone: data.phone || null,
        gender: data.gender,
        roles: data.roles,
        password: !isEdit ? data.password : undefined,
        universityName: !isInstructor ? data.universityName : null,
        majorName: !isInstructor ? data.majorName : null,
        studentId: !isInstructor ? data.studentId : null,
        entranceYear: !isInstructor ? data.entranceYear : null,
        bio: data.bio?.trim() || null,
        instagram: data.instagram?.trim() || null,
        degree: isInstructor ? data.degree?.trim() || null : null,
        academicRank: isInstructor ? data.academicRank?.trim() || null : null,
        universityId: isInstructor ? data.universityId || null : null,
        majorId: isInstructor ? data.majorId || null : null,
        website: isBlogger ? data.website?.trim() || null : null,
        linkedin: isBlogger ? data.linkedin?.trim() || null : null,
        twitter: isBlogger ? data.twitter?.trim() || null : null,
        shortBio: isBlogger ? data.shortBio?.trim() || null : null,
        image: (isInstructor || isBlogger) ? imageUrl : data.image || null,
        isActive: data.isActive ?? true,
        emailVerified: data.emailVerified,
      };

      const endpoint = isEdit
        ? `/api/admin/users/${userId}`
        : "/api/admin/users/create";
      const method = isEdit ? "PATCH" : "POST";

      try {
        const res = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          toast.success(
            isEdit ? "کاربر به‌روزرسانی شد!" : "کاربر با موفقیت ایجاد شد!"
          );

          // مهم: invalidate لیست کاربران برای refresh شدن
          queryClient.invalidateQueries({ queryKey: ["admin-users"] });
          // اختیاری: invalidate کاربر خاص
          if (isEdit) {
            queryClient.invalidateQueries({ queryKey: ["admin-user", userId] });
          }

          router.push("/dashboard/admin/users");
        } else {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error || "خطا در ذخیره تغییرات");
        }
      } catch (error) {
        console.error("User form submission error:", error);
        toast.error("مشکل ارتباط با سرور");
      }
    });
  });

  return {
    control,
    errors,
    selectedRoles,
    isInstructor,
    isBlogger,
    imageUrl,
    setImageUrl,
    isPending,
    onSubmit,
    preloadData,
    preloadLoading,
    userLoading,
    isSuperAdmin,
    isEdit,
    watch,
    setValue,
  };
}