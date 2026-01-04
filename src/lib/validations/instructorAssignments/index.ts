// src/validations/instructorAssignments/index.ts
import { z } from "zod";
import { faInstructorAssignmentsMessages } from "./messages";

export const createAssignmentSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string(),
  maxScore: z.number().min(0),
  honeypot: z.string().optional(),
});

export const gradeSubmissionSchema = z.object({
  submissionId: z.string().min(1),
  score: z.number().min(0),
  feedback: z.string().optional(),
  honeypot: z.string().optional(),
});