// src/types/instructorEnrollments.ts
export type EnrollmentItem = {
  id: string;
  user: { id: string; name: string | null; email: string | null };
  status: string;
  enrolledAt: Date;
};

export type EnrollmentResult =
  | { success: true; enrollments?: EnrollmentItem[]; message?: string }
  | { success: false; error: string };