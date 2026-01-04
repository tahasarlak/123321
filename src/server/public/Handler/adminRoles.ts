// src/server/public/Handler/adminRoles.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { deleteRoleSchema } from "@/lib/validations/adminRoles";
import { faAdminRolesMessages } from "@/lib/validations/adminRoles/messages";
import type { RoleResult, RoleStat } from "@/types/adminRoles";

async function hasAdminAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { role: true } } },
  });
  return user?.roles.some((r) => ["ADMIN", "SUPERADMIN"].includes(r.role)) ?? false;
}

export async function handleGetRoleStats(): Promise<RoleResult> {
  const roleStats = await prisma.userRole.groupBy({
    by: ["role"],
    _count: { role: true },
    orderBy: { role: "asc" },
  });

  const roles: RoleStat[] = roleStats.map((item) => ({
    role: item.role,
    userCount: item._count.role,
  }));

  return { success: true, roles };
}

export async function handleDeleteRole(data: unknown, adminUserId: string): Promise<RoleResult> {
  if (!(await hasAdminAccess(adminUserId))) {
    return { success: false, error: faAdminRolesMessages.unauthorized };
  }

  const parsed = deleteRoleSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faAdminRolesMessages.server_error };

  const { role, honeypot } = parsed.data;
  if (honeypot && honeypot.length > 0) return { success: true };

  const trimmedRole = role.trim().toUpperCase();

  const userCount = await prisma.userRole.count({
    where: { role: trimmedRole },
  });

  if (userCount > 0) {
    return { success: false, error: faAdminRolesMessages.role_in_use };
  }

  await prisma.userRole.deleteMany({
    where: { role: trimmedRole },
  });

  return { success: true, message: `نقش "${trimmedRole}" با موفقیت حذف شد.` };
}