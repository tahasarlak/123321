// src/types/instructorLessons.ts
export type LessonItem = {
  id: string;
  title: string;
  slug: string;
  type: string;
  order: number;
  isFree: boolean;
  quizId: string | null;
};

export type LessonResult =
  | { success: true; lessons?: LessonItem[]; lesson?: any; message?: string }
  | { success: false; error: string };