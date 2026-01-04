// src/validations/instructorCertificates/index.ts
import { z } from "zod";
import { faInstructorCertificatesMessages } from "./messages";

export const issueCertificateSchema = z.object({
  enrollmentId: z.string().min(1),
  score: z.number().optional(),
  grade: z.string().optional(),
  honeypot: z.string().optional(),
});

export const autoCertificateSchema = z.object({
  courseId: z.string().min(1),
  userId: z.string().min(1),
  honeypot: z.string().optional(),
});