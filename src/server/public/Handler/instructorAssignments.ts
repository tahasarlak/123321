// src/server/public/Handler/instructorAssignments.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { getSocket } from "@/server/public/Socket/socket";
import { createAssignmentSchema, gradeSubmissionSchema } from "@/lib/validations/instructorAssignments";
import { faInstructorAssignmentsMessages } from "@/lib/validations/instructorAssignments/messages";
import type { AssignmentResult } from "@/types/instructorAssignments";

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

export async function handleCreateAssignment(data: unknown, userId: string): Promise<AssignmentResult> {
  const parsed = createAssignmentSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faInstructorAssignmentsMessages.server_error };

  const { courseId, title, description, dueDate, maxScore, honeypot } = parsed.data;
  if (honeypot && honeypot.length > 0) return { success: true };

  if (!(await isInstructorOrAdmin(userId, courseId))) return { success: false, error: faInstructorAssignmentsMessages.not_owner };

  const assignment = await prisma.assignment.create({
    data: {
      courseId,
      title,
      description,
      dueDate: new Date(dueDate),
      maxScore,
    },
    include: {
      _count: { select: { submissions: true } },
    },
  });

  const formattedAssignment = {
    id: assignment.id,
    title: assignment.title,
    description: assignment.description,
    dueDate: assignment.dueDate,
    maxScore: assignment.maxScore,
    submissionsCount: assignment._count.submissions,
  };

  const io = getSocket();
  io?.to(`course_${courseId}`).emit("new_assignment", formattedAssignment);

  return { success: true, message: "تکلیف ایجاد شد", assignment: formattedAssignment };
}

export async function handleGradeSubmission(data: unknown, userId: string): Promise<AssignmentResult> {
  const parsed = gradeSubmissionSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faInstructorAssignmentsMessages.server_error };

  const { submissionId, score, feedback, honeypot } = parsed.data;
  if (honeypot && honeypot.length > 0) return { success: true };

  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id: submissionId },
    include: { 
      assignment: { select: { courseId: true } },
      user: { select: { id: true, name: true } },
    },
  });

  if (!submission || !(await isInstructorOrAdmin(userId, submission.assignment.courseId))) return { success: false, error: faInstructorAssignmentsMessages.not_owner };

  const graded = await prisma.assignmentSubmission.update({
    where: { id: submissionId },
    data: { score, feedback, gradedAt: new Date() },
  });

  const formattedSubmission = {
    id: graded.id,
    user: { id: submission.user.id, name: submission.user.name },
    score: graded.score,
    feedback: graded.feedback,
    submittedAt: graded.submittedAt,
  };

  const io = getSocket();
  io?.to(`user_${submission.userId}`).emit("grade_updated", formattedSubmission);

  return { success: true, message: "نمره ثبت شد", submissions: [formattedSubmission] };
}