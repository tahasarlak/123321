// src/actions/instructor/assignments.ts
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleCreateAssignment } from "@/server/public/Handler/instructorAssignments";

export async function createAssignmentAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const data = Object.fromEntries(formData);
  return handleCreateAssignment(data, session.user.id);
}