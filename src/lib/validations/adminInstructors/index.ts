// src/validations/adminInstructors/index.ts
import { z } from "zod";
import { faAdminInstructorsMessages } from "./messages";

export const createInstructorSchema = z.object({
  name: z.string().min(1, faAdminInstructorsMessages.required_fields),
  email: z.string().email(),
  password: z.string().min(8),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  academicStatus: z.enum(["ACTIVE", "GRADUATED", "DROPPED_OUT", "SUSPENDED"]),
  phone: z.string().optional(),
  bio: z.string().optional(),
  birthDate: z.string().optional(),
  universityId: z.string().optional(),
  majorId: z.string().optional(),
  studentId: z.string().optional(),
  entranceYear: z.number().int().optional(),
  currentTermId: z.string().optional(),
  instagram: z.string().optional(),
  image: z.string().optional(), // URL یا File (در handler چک می‌شه)
  honeypot: z.string().optional(),
});