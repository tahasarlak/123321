import { updateUserByAdminSchema } from "@/lib/validations/adminUsers";
import { z } from "zod";
// src/types/user.ts
export type AcademicStatus =
  | "ACTIVE"
  | "GRADUATED"
  | "DROPPED_OUT"
  | "SUSPENDED"
  | null;

// آمار نقش‌ها برای داشبورد ادمین
export type RoleStat = {
  role: string;
  userCount: number;
};

// تایپ کامل User بر اساس مدل Prisma (برای استفاده در frontend و API)
export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  image?: string | null;
  gender?: "MALE" | "FEMALE" | "OTHER" | null;

  studentId?: string | null;
  entranceYear?: number | null;
  universityName?: string | null; // از Major و University استخراج شده
  majorName?: string | null;
  academicStatus: AcademicStatus;
  isBanned: boolean;
  isActive: boolean;

roles: { role: string }[];

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
};

// برای نمایش در جدول کاربران (فقط فیلدهای ضروری)
export type UserData = Pick<
  User,
  | "id"
  | "name"
  | "email"
  | "phone"
  | "universityName"
  | "majorName"
  | "studentId"
  | "entranceYear"
  | "roles"
  | "academicStatus"
  | "isBanned"
>;

// برای فرم ایجاد/ویرایش کاربر توسط ادمین
export type AdminUserFormValues = {
  name: string;
  email: string;
  phone?: string | null;
  password?: string; // فقط در create اجباری
  universityName?: string | null;
  majorName?: string | null;
  studentId?: string | null;
  entranceYear?: number | null;
  gender?: "MALE" | "FEMALE" | "OTHER" | null;
  roles: string[];
};

// برای هدر صفحه کاربران
export type UsersHeaderProps = {
  totalUsers: number;
  roleStats: RoleStat[];
};

export type UsersGridProps = {
  users: User[];
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  hasUsers: boolean;
};
export type FormValues = z.infer<typeof updateUserByAdminSchema> & {
  password?: string;
};
export type University = { 
  id: number;     // ← تغییر از string به number
  name: string; 
};

export type Major = { 
  id: number;     // ← تغییر از string به number
  name: string; 
};
// در types/user.ts یا جای مناسب