// src/actions/instructor/enrollments.ts
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleChangeEnrollmentStatus } from "@/server/public/Handler/instructorEnrollments";

export async function changeEnrollmentStatusAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const data = Object.fromEntries(formData);
  return handleChangeEnrollmentStatus(data, session.user.id);
}