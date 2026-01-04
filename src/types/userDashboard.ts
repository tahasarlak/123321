import { UserOrderListItem } from "./userOrders";

// src/types/userDashboard.ts
export type UserDashboardStats = {
  totalOrders: number;
  totalSpent: number;
  purchasedCourses: number;
  purchasedProducts: number;
  recentOrders: UserOrderListItem[];
  recentNotifications: any[];
};

export type UserDashboardResult =
  | { success: true; stats: UserDashboardStats }
  | { success: false; error: string };