// src/actions/instructor/files.ts
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleUploadFileToCourse } from "@/server/public/Handler/instructorFiles";

export async function uploadFileAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const data = Object.fromEntries(formData);
  return handleUploadFileToCourse(data, session.user.id);
}