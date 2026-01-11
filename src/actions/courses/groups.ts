// lib/actions/group.actions.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { notifyGroupEvent } from "./notification.actions"; // فرض بر وجود این اکشن

const PAGE_SIZE = 12;

// ── Helper: چک دسترسی ادمین یا مدرس/هم‌مدرس به دوره ─────────────
async function canAccessGroup(userId: string, courseId: string): Promise<boolean> {
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

// ── اسکیماها (بهبودیافته و ترجمه‌پذیر) ──────────────────────────
const getCreateGroupSchema = (t: (key: string) => string) =>
  z.object({
    courseId: z.string().cuid({ message: t("invalid_course_id") }),
    title: z.string().min(3, t("title_too_short")).max(150),
    capacity: z.coerce.number().int().min(1).max(500).nullable().optional(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i).optional().default("#3B82F6"),
    schedule: z.string().max(200).optional(),
    meetLink: z.string().url().optional().nullable(),
    startDate: z.string().datetime().optional().nullable(),
    endDate: z.string().datetime().optional().nullable(),
    assistantIds: z.array(z.string().cuid()).optional(),
    isActive: z.coerce.boolean().default(true),
    honeypot: z.string().optional(),
  });

const getEditGroupSchema = (t: (key: string) => string) =>
  getCreateGroupSchema(t).extend({
    id: z.string().cuid(),
  });

// ── ۱. لیست گروه‌های دوره برای مدرس/ادمین ─────────────────────────
export async function fetchInstructorGroups({
  search = "",
  page = 1,
  courseId: courseFilter,
  userId,
}: {
  search?: string;
  page?: number;
  courseId?: string;
  userId: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.id !== userId) {
    return { items: [], totalItems: 0, stats: {} };
  }

  const where: Prisma.CourseGroupWhereInput = {
    deletedAt: null,
    course: courseFilter && courseFilter !== "all" ? { id: courseFilter } : {},
  };

  if (search.trim()) {
    const term = search.trim();
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { course: { title: { contains: term, mode: "insensitive" } } },
    ];
  }

  // فقط گروه‌های دوره‌هایی که دسترسی دارد
  if (!(await hasAdminAccess(userId))) {
    where.course = {
      ...where.course,
      OR: [
        { instructorId: userId },
        { coInstructors: { some: { id: userId } } },
      ],
    };
  }

  const [groups, totalItems] = await Promise.all([
    prisma.courseGroup.findMany({
      where,
      include: {
        course: { select: { id: true, title: true, slug: true } },
        assistants: { select: { id: true, name: true, image: true } },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.courseGroup.count({ where }),
  ]);

  const items = groups.map(g => ({
    id: g.id,
    title: g.title,
    color: g.color,
    capacity: g.capacity,
    currentMembers: g._count.members,
    startDate: g.startDate?.toISOString() ?? null,
    endDate: g.endDate?.toISOString() ?? null,
    isActive: g.isActive,
    assistants: g.assistants,
    course: g.course,
    createdAt: g.createdAt.toISOString(),
  }));

  return {
    items,
    totalItems,
    stats: {
      total: totalItems,
      active: groups.filter(g => g.isActive).length,
      fullGroups: groups.filter(g => g.capacity && g._count.members >= g.capacity).length,
    },
  };
}

// ── ۲. ایجاد گروه جدید ─────────────────────────────────────────────
export async function createGroupAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("groups");

  if (!session?.user?.id) return { success: false, error: t("please_login") };

  const userId = session.user.id as string;

  const raw = Object.fromEntries(formData);
  const schema = getCreateGroupSchema(key => t(key));
  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const data = parsed.data;

  if (data.honeypot?.length) return { success: true };

  if (!(await canAccessGroup(userId, data.courseId))) {
    return { success: false, error: t("unauthorized") };
  }

  try {
    const group = await prisma.$transaction(async tx => {
      const newGroup = await tx.courseGroup.create({
        data: {
          courseId: data.courseId,
          title: data.title.trim(),
          capacity: data.capacity ?? null,
          color: data.color ?? "#3B82F6",
          schedule: data.schedule ?? null,
          meetLink: data.meetLink ?? null,
          startDate: data.startDate ? new Date(data.startDate) : null,
          endDate: data.endDate ? new Date(data.endDate) : null,
          isActive: data.isActive ?? true,
          assistants: data.assistantIds?.length
            ? { connect: data.assistantIds.map(id => ({ id })) }
            : undefined,
        },
        include: {
          course: { select: { title: true, slug: true } },
          _count: { select: { members: true } },
        },
      });

      // نوتیفیکیشن به دستیاران اضافه‌شده (اختیاری)
      if (data.assistantIds?.length) {
        // می‌توانید اینجا notifyGroupCreatedToAssistants بفرستید
      }

      return newGroup;
    });

    revalidatePath("/dashboard/instructor/groups");
    revalidatePath(`/dashboard/courses/${data.courseId}/groups`);

    return {
      success: true,
      message: t("group_created"),
      group,
    };
  } catch (err) {
    console.error("Error creating group:", err);
    return { success: false, error: t("server_error") };
  }
}

// ── ۳. ویرایش گروه ──────────────────────────────────────────────────
export async function editGroupAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("groups");

  if (!session?.user?.id) return { success: false, error: t("please_login") };

  const userId = session.user.id as string;

  const raw = Object.fromEntries(formData);
  const schema = getEditGroupSchema(key => t(key));
  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { id, courseId, assistantIds, ...updateData } = parsed.data;

  const group = await prisma.courseGroup.findUnique({
    where: { id },
    select: { courseId: true },
  });

  if (!group || !(await canAccessGroup(userId, group.courseId))) {
    return { success: false, error: t("unauthorized") };
  }

  // اگر دوره تغییر کرده، دسترسی به دوره جدید هم چک شود
  if (courseId && courseId !== group.courseId) {
    if (!(await canAccessGroup(userId, courseId))) {
      return { success: false, error: t("unauthorized_new_course") };
    }
  }

  try {
    const updated = await prisma.$transaction(async tx => {
      const groupUpdated = await tx.courseGroup.update({
        where: { id },
        data: {
          ...updateData,
          courseId: courseId ?? undefined,
          capacity: updateData.capacity ?? null,
          startDate: updateData.startDate ? new Date(updateData.startDate) : undefined,
          endDate: updateData.endDate ? new Date(updateData.endDate) : undefined,
          assistants: assistantIds !== undefined
            ? { set: assistantIds.map(id => ({ id })) }
            : undefined,
        },
        include: {
          course: { select: { title: true } },
          _count: { select: { members: true } },
        },
      });

      return groupUpdated;
    });

    revalidatePath("/dashboard/instructor/groups");
    revalidatePath(`/dashboard/courses/${updated.courseId}/groups`);

    return {
      success: true,
      message: t("group_updated"),
      group: updated,
    };
  } catch (err) {
    console.error("Error editing group:", err);
    return { success: false, error: t("server_error") };
  }
}

// ── ۴. حذف گروه (soft-delete) ───────────────────────────────────────
export async function deleteGroupAction(id: string) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("groups");

  if (!session?.user?.id) return { success: false, error: t("please_login") };

  const userId = session.user.id as string;

  const group = await prisma.courseGroup.findUnique({
    where: { id },
    select: {
      courseId: true,
      _count: { select: { members: true } },
    },
  });

  if (!group || !(await canAccessGroup(userId, group.courseId))) {
    return { success: false, error: t("unauthorized") };
  }

  if (group._count.members > 0) {
    return { success: false, error: t("group_has_members") };
  }

  await prisma.courseGroup.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/dashboard/instructor/groups");

  return { success: true, message: t("group_deleted") };
}