// src/types/adminInstructors.ts
export type InstructorResult =
  | { success: true; message?: string }
  | { success: false; error: string };