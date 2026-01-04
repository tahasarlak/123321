// src/types/instructorStudents.ts
export type StudentItem = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  group: string | null;
  progress: number;
};

export type StudentResult =
  | { success: true; students?: StudentItem[]; csv?: string }
  | { success: false; error: string };