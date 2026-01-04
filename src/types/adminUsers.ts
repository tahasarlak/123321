// src/types/adminUsers.ts
export type AdminUserListItem = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  isBanned: boolean;
  city: string | null;
  createdAt: Date;
  roles: string[];
  rolesDisplay: string;
  primaryRole: string;
};

export type AdminUserDetail = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  universityName: string | null;
  majorName: string | null;
  studentId: string | null;
  entranceYear: number | null;
  roles: string[];
};

export type AdminUsersResult =
  | { success: true; message?: string; user?: any }
  | { success: false; error: string };