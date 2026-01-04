// src/types/adminFinance.ts
export type InstructorEarnings = {
  instructorId: string;
  instructorName: string | null;
  instructorImage: string | null;
  totalCourses: number;
  totalStudents: number;
  totalRevenue: number;
};

export type FinanceStats = {
  totalRevenue: number;
  todayRevenue: number;
  monthRevenue: number;
  yearRevenue: number;
  totalPaidOrders: number;
  todayPaidOrders: number;
  instructorsEarnings: InstructorEarnings[];
};

export type FinanceResult =
  | { success: true; data: FinanceStats }
  | { success: false; error: string };