// src/actions/user/profile.ts

"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { profileSchema, ProfileFormData } from "@/lib/validations/user/profile";
import { getCurrentUser } from "@/lib/utils/server";

export type UpdateProfileResult =
  | { success: true; message: string }
  | { success: false; error: string };

export async function updateProfileAction(formData: FormData): Promise<UpdateProfileResult> {
  // چک دسترسی و گرفتن کاربر
  const user = await getCurrentUser();
  const userId = user.id;

  // استخراج اطلاعات از FormData
  const rawData = {
    name: formData.get("name") as string | null,
    phone: formData.get("phone") as string | null,
    city: formData.get("city") as string | null,
    bio: formData.get("bio") as string | null,
    gender: formData.get("gender") as "MALE" | "FEMALE" | "OTHER" | null,
    birthDate: formData.get("birthDate") as string | null,
    imageUrl: formData.get("imageUrl") as string | null,
  };

  // اعتبارسنجی
  const validated = profileSchema.safeParse(rawData);
  if (!validated.success) {
    const errors = validated.error.flatten().fieldErrors;
    const errorMessages = Object.values(errors)
      .flat()
      .filter(Boolean)
      .join("، ");

    return {
      success: false,
      error: errorMessages || "اطلاعات وارد شده معتبر نیست",
    };
  }

  const data = validated.data;

  // ساخت data برای Prisma — فقط فیلدهای تغییرکرده
  const updateData: any = {
    name: data.name?.trim(),
  };

  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.city !== undefined) updateData.city = data.city;
  if (data.bio !== undefined) updateData.bio = data.bio;
  if (data.birthDate !== undefined) updateData.birthDate = data.birthDate;
  if (data.imageUrl !== undefined) {
    // چک امنیتی اضافی برای imageUrl
    if (data.imageUrl && !data.imageUrl.startsWith("/avatars/")) {
      return { success: false, error: "آدرس عکس نامعتبر است" };
    }
    updateData.image = data.imageUrl;
  }

  // gender فقط اگر مقدار جدید داشته باشه بروز می‌شه
  if (data.gender !== null) {
    updateData.gender = data.gender;
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // ری‌والیدیت مسیرهای مرتبط — با "page" برای Next.js جدید
    revalidatePath("/profile", "page");
    revalidatePath("/profile/edit", "page");
    revalidatePath("/dashboard", "page");
    revalidatePath("/instructor/dashboard", "page");
    revalidatePath("/", "layout"); // صفحه اصلی معمولاً layout داره

    return { success: true, message: "پروفایل با موفقیت به‌روزرسانی شد" };
  } catch (error: any) {
    console.error("خطا در آپدیت پروفایل:", error);
    return {
      success: false,
      error: error.message || "خطایی در ذخیره اطلاعات رخ داد",
    };
  }
}