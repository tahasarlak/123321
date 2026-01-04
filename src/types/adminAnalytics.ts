// src/types/adminAnalytics.ts
export type DayRevenue = {
  label: string;
  date: string;
  revenue: number;
  formatted: string;
};

export type InstructorEarnings = {
  instructorId: string;
  instructorName: string | null;
  instructorImage: string | null;
  totalCourses: number;
  totalStudents: number;
  totalRevenue: number;
};

export type AnalyticsStats = {
  revenueByDay: DayRevenue[];
  totalWeekRevenue: number;
  growthPercent: number;
  totalRevenue: number;
  todayRevenue: number;      // اضافه شد
  monthRevenue: number;      // اضافه شد
  yearRevenue: number;       // اضافه شد
  totalOrders: number;
  todayPaidOrders: number;   // اضافه شد
  totalUsers: number;
  totalCourses: number;
  totalProducts: number;
  avgOrderValue: number;
  topCourses: { id: string; title: string; students: number; revenue: number }[];
  topProducts: { id: string; title: string; sales: number; revenue: number }[];
};

export type AnalyticsResult =
  | { success: true; data: AnalyticsStats }
  | { success: false; error: string };