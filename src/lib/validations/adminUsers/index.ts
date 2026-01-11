import { z } from "zod";
import { faAdminUsersMessages } from "./messages";

// اسکیمای پایه مشترک
const baseSchema = z.object({
  name: z.string().min(2, faAdminUsersMessages.name_required),
  email: z.string().email(faAdminUsersMessages.email_invalid),
  phone: z.string().nullable().optional(),

  gender: z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),
  roles: z.array(z.string()).min(1, faAdminUsersMessages.roles_required),

  bio: z.string().nullable().optional(),
  shortBio: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  twitter: z.string().nullable().optional(),
  linkedin: z.string().nullable().optional(),
  website: z.string().nullable().optional(),

  image: z.string().nullable().optional(),

  isActive: z.boolean().optional().default(true),
  emailVerified: z.boolean().optional(),

  universityId: z.number().int().nullable().optional(),
  majorId: z.number().int().nullable().optional(),
  universityName: z.string().nullable().optional(),
  majorName: z.string().nullable().optional(),
  studentId: z.string().nullable().optional(),
  entranceYear: z.number().int().nullable().optional(),

  degree: z.string().nullable().optional(),
  academicRank: z.string().nullable().optional(),
});

export const createUserByAdminSchema = baseSchema.extend({
  password: z.string().min(8, "رمز عبور حداقل ۸ کاراکتر باشد"),
});

export const updateUserByAdminSchema = baseSchema.extend({
  password: z.string().min(8).optional(),
});