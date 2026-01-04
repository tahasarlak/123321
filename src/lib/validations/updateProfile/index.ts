// src/validations/updateProfile/index.ts
import { z } from "zod";
import { faUpdateProfileMessages } from "./messages";

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  bio: z.string().optional(),
  phone: z.string().optional(),
  instagram: z.string().optional(),
  universityId: z.string().optional(),
  majorId: z.string().optional(),
  studentId: z.string().optional(),
  academicStatus: z.enum(["ACTIVE", "GRADUATED", "DROPPED_OUT", "SUSPENDED"]).optional(),
  oldPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
  confirmPassword: z.string().optional(),
  image: z.string().optional(), // URL یا File
  honeypot: z.string().optional(),
}).refine((data) => !data.newPassword || data.newPassword === data.confirmPassword, {
  message: faUpdateProfileMessages.password_mismatch,
  path: ["confirmPassword"],
}).refine((data) => !data.newPassword || data.oldPassword, {
  message: "برای تغییر رمز عبور، رمز فعلی الزامی است",
  path: ["oldPassword"],
});