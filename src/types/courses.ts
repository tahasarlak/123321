// src/types/courses.ts
export type CourseType = "RECORDED" | "LIVE" | "HYBRID";
export type CourseStatus = "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "ARCHIVED" | "REJECTED";

export type CourseItem = {
  id: string;
  title: string;
  slug: string;
  image: string | null;
  price: any;
  discountPercent: number | null;
  type: CourseType;
  status: CourseStatus;
  enrolledCount: number;
  instructor: { id: string; name: string | null; image: string | null };
};

export type CourseDetail = CourseItem & {
  description: string | null;
  shortDescription: string | null;
  duration: string | null;
  units: number;
  capacity: number | null;
  categories: { id: string; name: string }[];
  tags: { id: string; name: string }[];
  term: { id: string; title: string } | null;
  isEnrolled?: boolean;
};

export type CourseListResponse = {
  courses: CourseItem[];
  total: number;
};

export type CourseResult =
  | { success: true; message?: string; course?: CourseDetail }
  | { success: false; error: string };