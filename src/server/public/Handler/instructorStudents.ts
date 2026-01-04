// src/server/public/Handler/instructorStudents.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import type { StudentResult } from "@/types/instructorStudents";

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

export async function handleGetStudents(courseId: string, userId: string, exportCSV: boolean = false): Promise<StudentResult> {
  if (!(await isInstructorOrAdmin(userId, courseId))) return { success: false, error: "دسترسی ممنوع" };

  const students = await prisma.enrollment.findMany({
    where: { courseId, status: "APPROVED" },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      group: { select: { title: true } },
    },
  });

  const formatted = students.map(s => ({
    id: s.user.id,
    name: s.user.name,
    email: s.user.email,
    phone: s.user.phone,
    group: s.group?.title || null,
    progress: s.progress,
  }));

  if (exportCSV) {
    const csv = "نام,ایمیل,موبایل,گروه,پیشرفت%\n" + formatted.map(f => `${f.name || ""},${f.email || ""},${f.phone || ""},${f.group || ""},${f.progress}`).join("\n");
    return { success: true, students: formatted, csv };
  }

  return { success: true, students: formatted };
}