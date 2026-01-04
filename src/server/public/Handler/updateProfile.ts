// src/server/public/Handler/updateProfile.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { writeFile } from "fs/promises";
import { join } from "path";
import sharp from "sharp";
import { updateProfileSchema } from "@/lib/validations/updateProfile";
import { faUpdateProfileMessages } from "@/lib/validations/updateProfile/messages";
import type { ProfileResult } from "@/types/updateProfile";

async function isOwnerOrAdmin(userId: string, targetUserId: string): Promise<boolean> {
  if (userId === targetUserId) return true;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { role: true } } },
  });

  return user?.roles.some(r => ["ADMIN", "SUPERADMIN"].includes(r.role)) ?? false;
}

export async function handleUpdateProfile(data: unknown, userId: string): Promise<ProfileResult> {
  const parsed = updateProfileSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faUpdateProfileMessages.server_error };

  const {
    name,
    bio,
    phone,
    instagram,
    universityId,
    majorId,
    studentId,
    academicStatus,
    oldPassword,
    newPassword,
    image,
    honeypot,
  } = parsed.data;

  if (honeypot && honeypot.length > 0) return { success: true };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, error: faUpdateProfileMessages.unauthorized };

  // چک رمز فعلی اگر تغییر رمز خواست
  if (newPassword && !(await bcrypt.compare(oldPassword || "", user.password))) {
    return { success: false, error: faUpdateProfileMessages.old_password_wrong };
  }

  let imageUrl = user.image;

  // آپلود تصویر جدید اگر File باشه
  if (image && typeof image === "object" && image !== null && "size" in image && (image as any).size > 0) {
    const file = image as File;
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `profile-${userId}-${Date.now()}.webp`;
    const filepath = join(process.cwd(), "public/uploads/profiles", filename);
    const optimized = await sharp(buffer)
      .resize(400, 400, { fit: "cover", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    await writeFile(filepath, optimized);
    imageUrl = `/uploads/profiles/${filename}`;
  } else if (typeof image === "string" && image.trim()) {
    imageUrl = image.trim();
  }

  const updateData: any = {
    name,
    bio,
    phone,
    instagram,
    universityId: universityId || null,
    majorId: majorId || null,
    studentId,
    academicStatus,
    image: imageUrl,
  };

  if (newPassword) {
    updateData.password = await bcrypt.hash(newPassword, 12);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  return { success: true, message: "پروفایل با موفقیت ویرایش شد", user: updatedUser };
}