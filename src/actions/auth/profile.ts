"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession, update as updateSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

// تنظیمات Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export type UpdateProfileResult =
  | { success: true; message: string }
  | { success: false; error: string };

// ──────────────────────────────────────────────────────────────
// اسکیما — با بهبودهای امنیتی و اعتبارسنجی بیشتر
// ──────────────────────────────────────────────────────────────
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // ۵ مگابایت

const profileSchema = z
  .object({
    name: z.string().min(1, "نام الزامی است").max(100).trim(),
    phone: z
      .string()
      .regex(/^09[0-9]{9}$/, "فرمت شماره موبایل معتبر نیست")
      .optional()
      .nullable(),
    city: z.string().max(100).optional().nullable(),
    bio: z.string().max(500, "بیوگرافی حداکثر ۵۰۰ کاراکتر است").optional().nullable(),

    instagram: z.string().url({ message: "لینک اینستاگرام معتبر نیست" }).or(z.literal("")).optional().nullable(),
    linkedin: z.string().url().or(z.literal("")).optional().nullable(),
    github: z.string().url().or(z.literal("")).optional().nullable(),
    twitter: z.string().url().or(z.literal("")).optional().nullable(),
    website: z.string().url().or(z.literal("")).optional().nullable(),

    gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional().nullable(),
    birthDate: z
      .string()
      .refine((val) => !val || !isNaN(Date.parse(val)), "تاریخ تولد نامعتبر است")
      .optional()
      .nullable(),

    universityId: z.string().optional().nullable(),
    majorId: z.string().optional().nullable(),
    studentId: z.string().max(50).optional().nullable(),
    entranceYear: z.coerce.number().int().min(1300).max(1450).optional().nullable(),
    graduationYear: z.coerce.number().int().min(1300).max(1450).optional().nullable(),
    academicStatus: z.enum(["ACTIVE", "GRADUATED", "DROPPED_OUT", "SUSPENDED", "ON_LEAVE"]).optional().nullable(),

    skills: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    interests: z.array(z.string().trim().min(1).max(50)).max(20).optional(),

    profileVisibility: z.enum(["PUBLIC", "PRIVATE", "FRIENDS_ONLY"]).optional(),
    showEmail: z.coerce.boolean().optional(),
    showPhone: z.coerce.boolean().optional(),

    oldPassword: z.string().optional(),
    newPassword: z.string().min(6, "رمز عبور جدید حداقل ۶ کاراکتر").optional(),
    confirmNewPassword: z.string().optional(),

    image: z.any().optional(), // بعداً در کد چک می‌کنیم
    honeypot: z.string().optional(),
  })
  .refine((data) => !data.newPassword || data.newPassword === data.confirmNewPassword, {
    message: "رمز عبور جدید و تکرار آن مطابقت ندارند",
    path: ["confirmNewPassword"],
  })
  .refine((data) => !data.newPassword || !!data.oldPassword, {
    message: "برای تغییر رمز عبور، رمز فعلی الزامی است",
    path: ["oldPassword"],
  });

export async function updateProfileAction(formData: FormData): Promise<UpdateProfileResult> {
  const t = await getTranslations("profile");
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { success: false, error: t("auth_required") };
  }

  const userId = session.user.id as string;

  const rawData = Object.fromEntries(formData);
  const parseResult = profileSchema.safeParse(rawData);

  if (!parseResult.success) {
    const errors = parseResult.error.flatten().fieldErrors;
    const errorMsg = Object.values(errors).flat().join("، ");
    return { success: false, error: errorMsg || t("invalid_data") };
  }

  const data = parseResult.data;

  // Honeypot ساده
  if (data.honeypot && data.honeypot.length > 0) {
    return { success: true, message: t("profile_updated") };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      password: true,
      image: true,
      phone: true,
      name: true,
      email: true,
    },
  });

  if (!user) {
    return { success: false, error: t("user_not_found") };
  }

  // ─── چک تکراری بودن شماره تلفن ──────────────────────────────
  if (data.phone && data.phone !== user.phone) {
    const existing = await prisma.user.findFirst({
      where: { phone: data.phone },
      select: { id: true },
    });
    if (existing) {
      return { success: false, error: t("phone_already_taken") };
    }
  }

  // ─── چک رمز عبور قدیمی ──────────────────────────────────────
  let newHashedPassword: string | undefined;
  if (data.newPassword) {
    const isOldValid = await bcrypt.compare(data.oldPassword!, user.password ?? "");
    if (!isOldValid) {
      return { success: false, error: t("incorrect_current_password") };
    }
    newHashedPassword = await bcrypt.hash(data.newPassword, 12);
  }

  // ─── مدیریت تصویر پروفایل ───────────────────────────────────
  let imageUrl = user.image;
  const newImage = data.image;

  if (newImage && newImage instanceof File && newImage.size > 0) {
    // محدودیت حجم
    if (newImage.size > MAX_IMAGE_SIZE) {
      return { success: false, error: t("image_too_large", { max: "5MB" }) };
    }

    // چک نوع فایل
    if (!newImage.type.startsWith("image/")) {
      return { success: false, error: t("invalid_image_type") };
    }

    const buffer = Buffer.from(await newImage.arrayBuffer());

    try {
      if (process.env.CLOUDINARY_CLOUD_NAME) {
        // Cloudinary
        const uploadResult = await new Promise<any>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "avatars",
              public_id: `user-${userId}`,
              overwrite: true,
              invalidate: true,
              resource_type: "image",
              transformation: [
                { width: 400, height: 400, crop: "fill", gravity: "face" },
                { quality: "auto", fetch_format: "auto" },
              ],
            },
            (err, result) => (err ? reject(err) : resolve(result))
          );
          stream.end(buffer);
        });

        imageUrl = uploadResult.secure_url;
      } else {
        // ذخیره لوکال
        const filename = `profile-${userId}.webp`;
        const filepath = path.join(process.cwd(), "public/uploads/profiles", filename);

        await fs.mkdir(path.dirname(filepath), { recursive: true });

        await sharp(buffer)
          .resize(400, 400, { fit: "cover", withoutEnlargement: true })
          .webp({ quality: 82 })
          .toFile(filepath);

        imageUrl = `/uploads/profiles/${filename}`;
      }
    } catch (err) {
      console.error("Image upload/processing failed:", err);
      return { success: false, error: t("image_upload_failed") };
    }
  }

  // ─── داده‌های به‌روزرسانی ───────────────────────────────────
  const updateData: any = {
    name: data.name.trim(),
    phone: data.phone || null,
    city: data.city || null,
    bio: data.bio || null,
    instagram: data.instagram || null,
    linkedin: data.linkedin || null,
    github: data.github || null,
    twitter: data.twitter || null,
    website: data.website || null,
    gender: data.gender || null,
    birthDate: data.birthDate ? new Date(data.birthDate) : null,
    universityId: data.universityId || null,
    majorId: data.majorId || null,
    studentId: data.studentId || null,
    entranceYear: data.entranceYear || null,
    graduationYear: data.graduationYear || null,
    academicStatus: data.academicStatus || null,
    skills: data.skills?.length ? data.skills : null,
    interests: data.interests?.length ? data.interests : null,
    profileVisibility: data.profileVisibility || "PUBLIC",
    showEmail: data.showEmail ?? false,
    showPhone: data.showPhone ?? false,
    image: imageUrl,
  };

  if (newHashedPassword) {
    updateData.password = newHashedPassword;
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // لاگ فعالیت
    await prisma.activityLog.create({
      data: {
        userId,
        action: "PROFILE_UPDATED",
        entity: "User",
        entityId: userId,
        details: {
          updatedFields: Object.keys(updateData).filter((k) => k !== "password"),
        },
      },
    });

    // به‌روزرسانی session — مهم!
    const sessionUpdate: any = {
      name: data.name.trim(),
      image: imageUrl,
    };

    // اگر فیلدهای بیشتری در session استفاده می‌کنید، اینجا اضافه کنید
    if (sessionUpdate.name || sessionUpdate.image) {
      await updateSession({
        ...session,
        user: {
          ...session.user,
          ...sessionUpdate,
        },
      });
    }

    // Revalidate مسیرهای مهم
    const paths = [
      "/profile",
      "/profile/edit",
      "/dashboard",
      "/instructor/dashboard",
      "/student/dashboard",
      "/",
    ];

    paths.forEach((p) => revalidatePath(p));

    return { success: true, message: t("profile_updated_success") };
  } catch (error: any) {
    console.error("[UPDATE_PROFILE] Error:", error);
    return { success: false, error: t("server_error") };
  }
}