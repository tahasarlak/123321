// src/server/public/Handler/adminInstructors.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { writeFile } from "fs/promises";
import { join } from "path";
import sharp from "sharp";
import { createInstructorSchema } from "@/lib/validations/adminInstructors";
import { faAdminInstructorsMessages } from "@/lib/validations/adminInstructors/messages";
import type { InstructorResult } from "@/types/adminInstructors";

const PAGE_SIZE = 12;

async function hasAdminAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { role: true } } },
  });
  return user?.roles.some((r) => ["ADMIN", "SUPERADMIN"].includes(r.role)) ?? false;
}

// دریافت لیست مدرسان + آمار
export async function handleFetchInstructors({
  search = "",
  page = 1,
  searchParams = {},
}: {
  search?: string;
  page?: number;
  searchParams?: Record<string, string | string[] | undefined>;
}): Promise<{
  items: any[];
  totalItems: number;
  stats: { key: string; count: number }[];
}> {
  const where: Prisma.UserWhereInput = {
    roles: { some: { role: "INSTRUCTOR" } },
  };

  if (search.trim()) {
    const trimmedSearch = search.trim();
    where.OR = [
      { name: { contains: trimmedSearch, mode: "insensitive" } },
      { bio: { contains: trimmedSearch, mode: "insensitive" } },
      { expertise: { contains: trimmedSearch, mode: "insensitive" } },
      { email: { contains: trimmedSearch, mode: "insensitive" } },
    ];
  }

  const [instructorsRaw, totalInstructors] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        roles: { select: { role: true } },
        university: { select: { name: true } },
        major: { select: { name: true } },
        currentTerm: { select: { name: true } },
        _count: { select: { courses: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  const items = instructorsRaw.map((i) => ({
    id: i.id,
    name: i.name,
    email: i.email,
    phone: i.phone,
    image: i.image,
    bio: i.bio,
    expertise: i.expertise,
    gender: i.gender,
    university: i.university?.name,
    major: i.major?.name,
    currentTerm: i.currentTerm?.name,
    academicStatus: i.academicStatus,
    isActive: i.isActive,
    coursesCount: i._count.courses,
    createdAt: i.createdAt,
  }));

  const active = instructorsRaw.filter((i) => i.isActive).length;
  const inactive = totalInstructors - active;

  const stats = [
    { key: "active", count: active },
    { key: "inactive", count: inactive },
    { key: "total", count: totalInstructors },
  ];

  return { items, totalItems: totalInstructors, stats };
}

// عملیات گروهی
export async function handleBulkInstructorAction(
  selectedIds: string[],
  action: "activate" | "deactivate" | "delete"
): Promise<{ success: boolean; message: string }> {
  if (selectedIds.length === 0) {
    return { success: false, message: "هیچ مدرسی انتخاب نشده است." };
  }

  try {
    if (action === "delete") {
      await prisma.user.deleteMany({
        where: { id: { in: selectedIds }, roles: { some: { role: "INSTRUCTOR" } } },
      });
      return {
        success: true,
        message: `${selectedIds.length} مدرس با موفقیت حذف شدند.`,
      };
    }

    const isActive = action === "activate";
    await prisma.user.updateMany({
      where: { id: { in: selectedIds }, roles: { some: { role: "INSTRUCTOR" } } },
      data: { isActive },
    });

    return {
      success: true,
      message: `${selectedIds.length} مدرس با موفقیت ${isActive ? "فعال" : "غیرفعال"} شدند.`,
    };
  } catch (error) {
    console.error("خطا در عملیات گروهی مدرسان:", error);
    return { success: false, message: "خطایی در انجام عملیات گروهی رخ داد." };
  }
}

// خروجی CSV
export async function handleExportInstructorsCsv(): Promise<string> {
  try {
    const instructors = await prisma.user.findMany({
      where: { roles: { some: { role: "INSTRUCTOR" } } },
      include: {
        university: true,
        major: true,
        currentTerm: true,
        _count: { select: { courses: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "نام",
      "ایمیل",
      "تلفن",
      "بیوگرافی",
      "تخصص",
      "دانشگاه",
      "رشته",
      "ترم جاری",
      "وضعیت تحصیلی",
      "تعداد دوره‌ها",
      "وضعیت",
      "تاریخ ثبت‌نام",
    ];

    const rows = instructors.map((i) => [
      i.name || "-",
      i.email,
      i.phone || "-",
      (i.bio || "-").replace(/\n/g, " "),
      i.expertise || "-",
      i.university?.name || "-",
      i.major?.name || "-",
      i.currentTerm?.name || "-",
      i.academicStatus || "-",
      i._count.courses.toString(),
      i.isActive ? "فعال" : "غیرفعال",
      new Date(i.createdAt).toLocaleDateString("fa-IR"),
    ]);

    const csvLines = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return `\uFEFF${csvLines}`;
  } catch (error) {
    console.error("خطا در خروجی CSV مدرسان:", error);
    throw new Error("خطایی در تولید فایل CSV رخ داد.");
  }
}

// ایجاد مدرس (ایجاد کاربر + نقش INSTRUCTOR + آپلود تصویر)
export async function handleCreateInstructor(
  data: Record<string, any>,
  adminUserId: string
): Promise<InstructorResult> {
  if (!(await hasAdminAccess(adminUserId))) {
    return { success: false, error: faAdminInstructorsMessages.unauthorized };
  }

  const parsed = createInstructorSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: faAdminInstructorsMessages.required_fields };
  }

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
    expertise,
    image,
    honeypot,
  } = parsed.data;

  if (honeypot && honeypot.length > 0) return { success: true };

  let imageUrl: string | null = null;

  // پردازش تصویر آپلود شده
  if (
    image &&
    typeof image === "object" &&
    image !== null &&
    "size" in image &&
    (image as any).size > 0 &&
    "arrayBuffer" in image
  ) {
    const file = image as File;
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
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || null,
      password: hashedPassword,
      image: imageUrl,
      bio: bio || null,
      expertise: expertise || null,
      gender,
      birthDate: birthDate ? new Date(birthDate) : null,
      instagram: instagram || null,
      studentId: studentId || null,
      entranceYear: entranceYear ? Number(entranceYear) : null,
      academicStatus,
      isActive: true,
      university: universityId ? { connect: { id: universityId } } : undefined,
      major: majorId ? { connect: { id: majorId } } : undefined,
      currentTerm: currentTermId ? { connect: { id: currentTermId } } : undefined,
      roles: {
        create: { role: "INSTRUCTOR" },
      },
    },
  });

  revalidatePath("/dashboard/admin/instructors");

  return { success: true, message: "مدرس با موفقیت ایجاد شد" };
}

// تغییر وضعیت تک مدرس
export async function handleToggleInstructor(
  instructorId: string,
  adminUserId: string
): Promise<InstructorResult> {
  if (!(await hasAdminAccess(adminUserId))) {
    return { success: false, error: faAdminInstructorsMessages.unauthorized };
  }

  const instructor = await prisma.user.findUnique({
    where: { id: instructorId },
    select: { isActive: true },
  });

  if (!instructor) {
    return { success: false, error: "مدرس یافت نشد." };
  }

  await prisma.user.update({
    where: { id: instructorId },
    data: { isActive: !instructor.isActive },
  });

  revalidatePath("/dashboard/admin/instructors");

  return {
    success: true,
    message: `مدرس اکنون ${!instructor.isActive ? "فعال" : "غیرفعال"} است.`,
  };
}

// حذف تک مدرس
export async function handleDeleteInstructor(
  instructorId: string,
  adminUserId: string
): Promise<InstructorResult> {
  if (!(await hasAdminAccess(adminUserId))) {
    return { success: false, error: faAdminInstructorsMessages.unauthorized };
  }

  const instructor = await prisma.user.findUnique({
    where: { id: instructorId },
    select: { image: true },
  });

  if (!instructor) {
    return { success: false, error: "مدرس یافت نشد." };
  }

  // حذف تصویر اگر محلی باشد
  if (instructor.image && instructor.image.startsWith("/uploads/instructors/")) {
    const fullPath = join(process.cwd(), "public", instructor.image);
    try {
      await fs.unlink(fullPath);
    } catch (err) {
      console.warn("تصویر مدرس حذف نشد:", fullPath);
    }
  }

  await prisma.user.delete({
    where: { id: instructorId },
  });

  revalidatePath("/dashboard/admin/instructors");

  return { success: true, message: "مدرس با موفقیت حذف شد" };
}