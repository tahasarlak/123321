// src/actions/instructor/lessons.ts
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleCreateLesson } from "@/server/public/Handler/instructorLessons";

export async function createLessonAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const data = Object.fromEntries(formData);
  return handleCreateLesson(data, session.user.id);
}