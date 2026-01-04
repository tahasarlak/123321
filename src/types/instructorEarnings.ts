// src/types/instructorEarnings.ts
export type EarningsItem = {
  courseId: string;
  title: string;
  revenue: number;
  students: number;
};

export type EarningsResult =
  | { success: true; earnings?: EarningsItem[]; total?: number; message?: string }
  | { success: false; error: string };