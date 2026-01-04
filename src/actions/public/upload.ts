// src/actions/public/upload.ts
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleUpload } from "@/server/public/Handler/upload";

export async function uploadAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const file = formData.get("file");
  return handleUpload({ file });
}