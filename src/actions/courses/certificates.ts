// lib/actions/certificate.actions.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { notifyCertificateIssued } from "./notification.actions";

const PAGE_SIZE = 12;

// ── Helper: چک دسترسی ادمین ───────────────────────────────────────
async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { role: true } } },
  });
  return user?.roles.some(r => ["ADMIN", "SUPER_ADMIN"].includes(r.role)) ?? false;
}

// ── Helper: چک دسترسی مدرس/کو-اینستراکتور به دوره ───────────────
async function canAccessCourse(userId: string, courseId: string): Promise<boolean> {
  const [roles, course] = await Promise.all([
    prisma.userRole.findMany({
      where: { userId },
      select: { role: true },
    }),
    prisma.course.findUnique({
      where: { id: courseId },
      select: {
        instructorId: true,
        coInstructors: { select: { id: true } },
      },
    }),
  ]);

  if (!course) return false;

  const userRoles = roles.map(r => r.role);
  if (userRoles.some(r => ["ADMIN", "SUPER_ADMIN"].includes(r))) return true;

  const coIds = course.coInstructors.map(c => c.id);
  return course.instructorId === userId || coIds.includes(userId);
}

// ── اسکیماها (بهبود یافته) ────────────────────────────────────────
const getTemplateSchema = (t: (key: string) => string) =>
  z.object({
    id: z.string().cuid().optional(),
    title: z.string().min(3, t("title_too_short")).max(150),
    description: z.string().max(1000).optional(),
    htmlTemplate: z.string().min(200, t("template_too_short")),
    cssStyles: z.string().optional(),
    previewImage: z.string().url().optional().nullable(),
    isDefault: z.coerce.boolean().default(false),
    honeypot: z.string().optional(),
  });

const getManualIssueSchema = (t: (key: string) => string) =>
  z.object({
    studentId: z.string().cuid({ message: t("invalid_student_id") }),
    courseId: z.string().cuid({ message: t("invalid_course_id") }),
    templateId: z.string().cuid().optional(),
    honeypot: z.string().optional(),
  });

// ── ۱. دریافت لیست قالب‌های گواهینامه (فقط ادمین) ─────────────────
export async function fetchCertificateTemplates({
  search = "",
  page = 1,
  userId,
}: {
  search?: string;
  page?: number;
  userId: string;
}) {
  if (!(await isAdmin(userId))) {
    return { items: [], totalItems: 0 };
  }

  const where = search
    ? { title: { contains: search.trim(), mode: "insensitive" } }
    : { deletedAt: null };

  const [templates, totalItems] = await Promise.all([
    prisma.certificateTemplate.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      select: {
        id: true,
        title: true,
        description: true,
        isDefault: true,
        previewImage: true,
        createdAt: true,
        _count: { select: { certificates: true } },
      },
    }),
    prisma.certificateTemplate.count({ where }),
  ]);

  return { items: templates, totalItems };
}

// ── ۲. ایجاد قالب جدید (فقط ادمین) ────────────────────────────────
export async function createTemplateAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("certificates");

  if (!session?.user?.id || !(await isAdmin(session.user.id as string))) {
    return { success: false, error: t("admin_only") };
  }

  const userId = session.user.id as string;

  const raw = Object.fromEntries(formData);
  const parsed = getTemplateSchema(key => t(key)).safeParse(raw);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { title, description, htmlTemplate, cssStyles, previewImage, isDefault, honeypot } = parsed.data;

  if (honeypot?.length) return { success: true };

  try {
    const template = await prisma.$transaction(async tx => {
      if (isDefault) {
        await tx.certificateTemplate.updateMany({
          data: { isDefault: false },
        });
      }

      return await tx.certificateTemplate.create({
        data: {
          title: title.trim(),
          description,
          htmlTemplate,
          cssStyles: cssStyles || null,
          previewImage,
          isDefault,
          createdById: userId,
        },
      });
    });

    revalidatePath("/dashboard/admin/certificate-templates");

    return {
      success: true,
      message: t("template_created"),
      template,
    };
  } catch (err) {
    console.error("خطا در ایجاد قالب گواهینامه:", err);
    return { success: false, error: t("server_error") };
  }
}

// ── ۳. ویرایش قالب ─────────────────────────────────────────────────
export async function editTemplateAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("certificates");

  if (!session?.user?.id || !(await isAdmin(session.user.id as string))) {
    return { success: false, error: t("admin_only") };
  }

  const raw = Object.fromEntries(formData);
  const parsed = getTemplateSchema(key => t(key)).safeParse(raw);

  if (!parsed.success || !parsed.data.id) {
    return { success: false, error: "داده نامعتبر" };
  }

  const { id, title, description, htmlTemplate, cssStyles, previewImage, isDefault } = parsed.data;

  try {
    await prisma.$transaction(async tx => {
      if (isDefault) {
        await tx.certificateTemplate.updateMany({
          where: { NOT: { id } },
          data: { isDefault: false },
        });
      }

      await tx.certificateTemplate.update({
        where: { id },
        data: {
          title: title.trim(),
          description,
          htmlTemplate,
          cssStyles: cssStyles || null,
          previewImage,
          isDefault,
        },
      });
    });

    revalidatePath("/dashboard/admin/certificate-templates");

    return { success: true, message: t("template_updated") };
  } catch (err) {
    console.error("خطا در ویرایش قالب:", err);
    return { success: false, error: t("server_error") };
  }
}

// ── ۴. حذف قالب (soft-delete) ───────────────────────────────────────
export async function deleteTemplateAction(id: string) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("certificates");

  if (!session?.user?.id || !(await isAdmin(session.user.id as string))) {
    return { success: false, error: t("admin_only") };
  }

  const template = await prisma.certificateTemplate.findUnique({
    where: { id },
    select: { _count: { select: { certificates: true } } },
  });

  if (!template) return { success: false, error: t("template_not_found") };

  if (template._count.certificates > 0) {
    return { success: false, error: t("template_in_use") };
  }

  await prisma.certificateTemplate.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/dashboard/admin/certificate-templates");

  return { success: true, message: t("template_deleted") };
}

// ── ۵. صدور دستی گواهینامه توسط مدرس/ادمین ────────────────────────
export async function issueCertificateManualAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("certificates");

  if (!session?.user?.id) return { success: false, error: t("please_login") };

  const instructorId = session.user.id as string;

  const raw = Object.fromEntries(formData);
  const parsed = getManualIssueSchema(key => t(key)).safeParse(raw);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { studentId, courseId, templateId, honeypot } = parsed.data;

  if (honeypot?.length) return { success: true };

  if (!(await canAccessCourse(instructorId, courseId))) {
    return { success: false, error: t("unauthorized") };
  }

  // چک صدور تکراری
  const existing = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId: studentId, courseId } },
  });

  if (existing) {
    return { success: false, error: t("certificate_already_issued") };
  }

  // انتخاب قالب (اولویت: انتخاب شده → پیش‌فرض فعال → اولین فعال)
  let template = templateId
    ? await prisma.certificateTemplate.findUnique({ where: { id: templateId } })
    : await prisma.certificateTemplate.findFirst({ where: { isDefault: true, isActive: true } });

  if (!template) {
    template = await prisma.certificateTemplate.findFirst({ where: { isActive: true } });
  }

  if (!template) {
    return { success: false, error: t("no_active_template") };
  }

  const [student, course] = await Promise.all([
    prisma.user.findUnique({
      where: { id: studentId },
      select: { name: true, email: true },
    }),
    prisma.course.findUnique({
      where: { id: courseId },
      select: { title: true },
    }),
  ]);

  if (!student || !course) {
    return { success: false, error: t("student_or_course_not_found") };
  }

  try {
    const certificate = await prisma.$transaction(async tx => {
      const newCert = await tx.certificate.create({
        data: {
          userId: studentId,
          courseId,
          templateId: template!.id,
          score: 100,
          grade: "عالی",
          completionDate: new Date(),
          verificationCode: randomUUID().slice(0, 12).toUpperCase(),
          pdfAccessToken: randomUUID(),
          pdfTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          customFields: {
            name: student.name || "دانشجو",
            courseTitle: course.title || "دوره",
            issueDate: new Date().toLocaleDateString("fa-IR"),
          },
        },
        include: { user: true, course: true, template: true },
      });

      // به‌روزرسانی تعداد گواهینامه‌های صادر شده در دوره (denormalized)
      await tx.course.update({
        where: { id: courseId },
        data: { issuedCertificatesCount: { increment: 1 } },
      });

      return newCert;
    });

    // ارسال نوتیفیکیشن به دانشجو
    await notifyCertificateIssued(studentId, courseId);

    revalidatePath("/dashboard/instructor/certificates");
    revalidatePath("/dashboard/student/certificates");

    return {
      success: true,
      message: t("certificate_issued"),
      certificate,
    };
  } catch (err) {
    console.error("خطا در صدور گواهینامه:", err);
    return { success: false, error: t("server_error") };
  }
}

// ── ۶. صدور خودکار هنگام تکمیل دوره ───────────────────────────────
export async function issueCertificateForCompletedCourse(courseId: string, userId: string) {
  const t = await getTranslations("certificates");

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { progress: true, status: true },
  });

  if (!enrollment || enrollment.progress < 100 || enrollment.status !== "APPROVED") {
    return { success: false, error: t("course_not_completed") };
  }

  const existing = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });

  if (existing) {
    return { success: true, message: t("already_issued"), certificate: existing };
  }

  const template = await prisma.certificateTemplate.findFirst({
    where: { isDefault: true, isActive: true },
  });

  if (!template) {
    return { success: false, error: t("no_default_template") };
  }

  const [student, course] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.course.findUnique({ where: { id: courseId }, select: { title: true } }),
  ]);

  const certificate = await prisma.$transaction(async tx => {
    const newCert = await tx.certificate.create({
      data: {
        userId,
        courseId,
        templateId: template.id,
        score: 100,
        grade: "عالی",
        completionDate: new Date(),
        verificationCode: randomUUID().slice(0, 12).toUpperCase(),
        pdfAccessToken: randomUUID(),
        pdfTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        customFields: {
          name: student?.name || "دانشجو",
          courseTitle: course?.title || "دوره",
          issueDate: new Date().toLocaleDateString("fa-IR"),
        },
      },
    });

    await tx.course.update({
      where: { id: courseId },
      data: { issuedCertificatesCount: { increment: 1 } },
    });

    return newCert;
  });

  await notifyCertificateIssued(userId, courseId);

  revalidatePath("/dashboard/student/certificates");

  return { success: true, certificate };
}

// ── ۷. دریافت گواهینامه‌های کاربر فعلی ─────────────────────────────
export async function getMyCertificates(userId?: string) {
  const session = await getServerSession(authOptions);
  const currentUserId = userId || session?.user?.id;

  if (!currentUserId) return [];

  return await prisma.certificate.findMany({
    where: { userId: currentUserId },
    include: {
      course: { select: { title: true, image: true, slug: true } },
      template: { select: { title: true, previewImage: true } },
    },
    orderBy: { issuedAt: "desc" },
  });
}
export async function updateCertificateAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("certificates");

  if (!session?.user?.id) return { success: false, error: t("please_login") };

  const userId = session.user.id as string;

  const schema = z.object({
    certificateId: z.string().cuid(),
    score: z.coerce.number().min(0).max(100).optional(),
    grade: z.string().max(50).optional(),
    note: z.string().max(1000).optional(),
    isPublic: z.coerce.boolean().optional(),
    honeypot: z.string().optional(),
  });

  const raw = Object.fromEntries(formData);
  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    return { success: false, error: "داده‌های نامعتبر" };
  }

  const { certificateId, score, grade, note, isPublic, honeypot } = parsed.data;

  if (honeypot?.length) return { success: true };

  const cert = await prisma.certificate.findUnique({
    where: { id: certificateId },
    select: { courseId: true },
  });

  if (!cert || !(await canAccessCourse(userId, cert.courseId))) {
    return { success: false, error: t("unauthorized") };
  }

  // فقط ادمین می‌تواند isPublic را تغییر دهد
  const isAdminUser = await isAdmin(userId);
  const updateData: Prisma.CertificateUpdateInput = {
    score: score !== undefined ? score : undefined,
    grade: grade || undefined,
    note: note || undefined,
    ...(isAdminUser && isPublic !== undefined ? { isPublic } : {}),
  };

  const updated = await prisma.certificate.update({
    where: { id: certificateId },
    data: updateData,
  });

  revalidatePath(`/dashboard/certificates/${certificateId}`);
  revalidatePath("/dashboard/instructor/certificates");

  return {
    success: true,
    message: t("certificate_updated"),
    certificate: updated,
  };
}