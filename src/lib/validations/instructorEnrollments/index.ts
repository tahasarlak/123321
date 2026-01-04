// src/validations/instructorEnrollments/index.ts
import { z } from "zod";
import { faInstructorEnrollmentsMessages } from "./messages";

export const changeEnrollmentStatusSchema = z.object({
  enrollmentId: z.string().min(1),
  action: z.enum(["APPROVE", "REJECT"]),
  honeypot: z.string().optional(),
});