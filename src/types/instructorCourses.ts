// src/types/instructorCourses.ts
export type InstructorCourseItem = {
  id: string;
  title: string;
  slug: string;
  image: string | null;
  enrolledCount: number;
  status: string;
};

export type InstructorCourseResult =
  | { success: true; courses?: InstructorCourseItem[]; course?: any }
  | { success: false; error: string };