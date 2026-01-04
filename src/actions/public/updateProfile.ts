// src/actions/public/updateProfile.ts
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleUpdateProfile } from "@/server/public/Handler/updateProfile";

export async function updateProfileAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const data = Object.fromEntries(formData);
  return handleUpdateProfile(data, session.user.id);
}