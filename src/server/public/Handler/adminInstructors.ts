// src/server/public/Handler/adminInstructors.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { writeFile } from "fs/promises";
import { join } from "path";
import sharp from "sharp";
import { createInstructorSchema } from "@/lib/validations/adminInstructors";
import { faAdminInstructorsMessages } from "@/lib/validations/adminInstructors/messages";
import type { InstructorResult } from "@/types/adminInstructors";

async function hasAdminAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { role: true } } },
  });
  return user?.roles.some((r) => ["ADMIN", "SUPERADMIN"].includes(r.role)) ?? false;
}

export async function handleCreateInstructor(data: Record<string, any>, adminUserId: string): Promise<InstructorResult> {
  if (!(await hasAdminAccess(adminUserId))) return { success: false, error: faAdminInstructorsMessages.unauthorized };

  const parsed = createInstructorSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faAdminInstructorsMessages.required_fields };

  const {
    name,
    email,
    phone,
    password,
    bio,
    gender,
    birthDate,
    universityId,
    majorId,
    studentId,
    entranceYear,
    currentTermId,
    academicStatus,
    instagram,
    image,
    honeypot,
  } = parsed.data;

  if (honeypot && honeypot.length > 0) return { success: true };

  let imageUrl: string | null = null;

  // پردازش تصویر اگر File باشه (چک کامل تایپ)
  if (
    image &&
    typeof image === "object" &&
    image !== null &&
    "size" in image &&
    typeof (image as any).size === "number" &&
    (image as any).size > 0 &&
    "arrayBuffer" in image
  ) {
    const file = image as unknown as File;
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `instructor-${Date.now()}.webp`;
    const filepath = join(process.cwd(), "public/uploads/instructors", filename);
    const optimized = await sharp(buffer)
      .resize(400, 400, { fit: "cover", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    await writeFile(filepath, optimized);
    imageUrl = `/uploads/instructors/${filename}`;
  } else if (typeof image === "string" && image.trim()) {
    imageUrl = image.trim();
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      password: hashedPassword,
      image: imageUrl,
      bio: bio || null,
      gender,
      birthDate: birthDate ? new Date(birthDate) : null,
      instagram: instagram || null,
      studentId: studentId || null,
      entranceYear,
      academicStatus,
      university: universityId ? { connect: { id: universityId } } : undefined,
      major: majorId ? { connect: { id: majorId } } : undefined,
      currentTerm: currentTermId ? { connect: { id: currentTermId } } : undefined,
      roles: { create: { role: "INSTRUCTOR" } },
    },
  });

  return { success: true, message: "مدرس با موفقیت ایجاد شد" };
}