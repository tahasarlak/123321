// src/server/public/Handler/instructorGroups.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { getSocket } from "@/server/public/Socket/socket";
import { createGroupSchema, addStudentToGroupSchema } from "@/lib/validations/instructorGroups";
import { faInstructorGroupsMessages } from "@/lib/validations/instructorGroups/messages";
import type { GroupResult } from "@/types/instructorGroups";

async function isInstructorOrAdmin(userId: string, courseId: string): Promise<boolean> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true },
  });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { role: true } } },
  });
  const isAdmin = user?.roles.some(r => ["ADMIN", "SUPERADMIN"].includes(r.role));
  return isAdmin || course?.instructorId === userId;
}

export async function handleCreateGroup(data: unknown, userId: string): Promise<GroupResult> {
  const parsed = createGroupSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faInstructorGroupsMessages.server_error };

  const { courseId, title, capacity, honeypot } = parsed.data;
  if (honeypot && honeypot.length > 0) return { success: true };

  if (!(await isInstructorOrAdmin(userId, courseId))) return { success: false, error: faInstructorGroupsMessages.not_owner };

  const group = await prisma.courseGroup.create({
    data: {
      courseId,
      title,
      capacity,
    },
  });

  const io = getSocket();
  io?.to(`course_${courseId}`).emit("new_group", group);

  return { success: true, message: "گروه با موفقیت ایجاد شد", groups: [group] };
}

export async function handleAddStudentToGroup(data: unknown, userId: string): Promise<GroupResult> {
  const parsed = addStudentToGroupSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faInstructorGroupsMessages.server_error };

  const { groupId, userId: studentId, honeypot } = parsed.data;
  if (honeypot && honeypot.length > 0) return { success: true };

  const group = await prisma.courseGroup.findUnique({
    where: { id: groupId },
    include: { course: true },
  });

  if (!group || !(await isInstructorOrAdmin(userId, group.courseId))) return { success: false, error: faInstructorGroupsMessages.not_owner };

  await prisma.courseGroupMember.create({
    data: {
      groupId,
      userId: studentId,
    },
  });

  const io = getSocket();
  io?.to(`user_${studentId}`).emit("group_added", group);

  return { success: true, message: "دانشجو به گروه اضافه شد" };
}