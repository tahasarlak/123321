// src/types/instructorAssignments.ts
export type AssignmentItem = {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date;
  maxScore: number;
  submissionsCount: number;
};

export type SubmissionItem = {
  id: string;
  user: { id: string; name: string };
  score: number | null;
  feedback: string | null;
  submittedAt: Date;
};

export type AssignmentResult =
  | { success: true; assignment?: AssignmentItem; submissions?: SubmissionItem[]; message?: string }
  | { success: false; error: string };