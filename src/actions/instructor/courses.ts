// src/actions/instructor/courses.ts
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleEditInstructorCourse } from "@/server/public/Handler/instructorCourses";

export async function editInstructorCourseAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const data = Object.fromEntries(formData);
  return handleEditInstructorCourse(data, session.user.id);
}