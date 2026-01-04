// src/validations/adminRoles/index.ts
import { z } from "zod";
import { faAdminRolesMessages } from "./messages";

export const deleteRoleSchema = z.object({
  role: z.string().min(1, faAdminRolesMessages.role_required),
  honeypot: z.string().optional(),
});