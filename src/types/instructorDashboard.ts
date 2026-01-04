// src/types/instructorDashboard.ts
export type InstructorDashboardStats = {
  coursesCount: number;
  totalStudents: number;
  totalRevenue: number;
  recentNotifications: any[];
};

export type InstructorDashboardResult =
  | { success: true; stats: InstructorDashboardStats }
  | { success: false; error: string };