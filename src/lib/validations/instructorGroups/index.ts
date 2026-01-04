// src/validations/instructorGroups/index.ts
import { z } from "zod";
import { faInstructorGroupsMessages } from "./messages";

export const createGroupSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(1),
  capacity: z.number().int().optional(),
  honeypot: z.string().optional(),
});

export const addStudentToGroupSchema = z.object({
  groupId: z.string().min(1),
  userId: z.string().min(1),
  honeypot: z.string().optional(),
});