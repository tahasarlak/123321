// src/types/adminRoles.ts
export type RoleStat = {
  role: string;
  userCount: number;
};

export type RoleResult =
  | { success: true; message?: string; roles?: RoleStat[] }
  | { success: false; error: string };